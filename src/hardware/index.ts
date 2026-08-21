/* eslint-disable class-methods-use-this */
import {
  SearchDevice,
  Success,
  Unsuccessful,
  UiResponseEvent,
  UI_EVENT,
  UI_REQUEST,
  UI_RESPONSE,
  FirmwareUpdateV3Params,
  FirmwareUpdateV4Params,
  FirmwareUpdateV4Target,
  getDeviceType,
} from '@onekeyfe/hd-core';
import type { IFirmwareField } from '@onekeyfe/hd-core';
import {
  createDeferred,
  Deferred,
  ONEKEY_WEBUSB_FILTER,
  resolveOneKeyUsbDevicePath,
} from '@onekeyfe/hd-shared';
import { store } from '@/store';
import {
  setReleaseMap,
  setInstallType,
  setNeedsBootloaderPermission,
} from '@/store/reducers/runtime';
import {
  setMaxProgress,
  setShowPinAlert,
  setShowButtonAlert,
  setUpdateTip,
  setShowProgressBar,
  setShowErrorAlert,
  setProgress,
  setUseSdkProgress,
} from '@/store/reducers/firmware';
import type { IFirmwareReleaseInfo } from '@/types';
import { arrayBufferToBuffer, wait } from '@/utils';
import { mapFirmwareUpdateProgress } from '@/utils/firmwareUpdateProgress';
import {
  downloadBootloaderFirmware,
  downloadLegacyTouchFirmware,
} from '@/utils/touchFirmware';
import { formatMessage } from '@/locales';
import { getHardwareSDKInstance } from './instance';
import { fetchHardwareConfig } from './config';
import { loadFirmwareUpdatePlanBinaries } from '../utils/firmwareUpdatePlanHost';

type FirmwareUpdateV4ComponentBinaryField =
  | 'bootloaderBinary'
  | 'applicationP1Binary'
  | 'applicationP2Binary'
  | 'coprocessorBinary'
  | 'se01Binary'
  | 'se02Binary'
  | 'se03Binary'
  | 'se04Binary';

export type FirmwareUpdateV4Request = Pick<
  FirmwareUpdateV4Params,
  'platform' | 'targetsToUpdate' | FirmwareUpdateV4ComponentBinaryField
> & {
  localResourceArchiveBinary?: ArrayBuffer;
};

type UsbDeviceRequestFilter = {
  vendorId?: number;
  productId?: number;
};

type UsbDeviceLike = {
  vendorId: number;
  productId: number;
  serialNumber?: string | null;
  productName?: string | null;
};

type USBNavigator = Navigator & {
  usb?: {
    getDevices: () => Promise<UsbDeviceLike[]>;
    requestDevice: (options: {
      filters: UsbDeviceRequestFilter[];
    }) => Promise<UsbDeviceLike>;
  };
};

const getWebUsb = () => {
  const usbNavigator = navigator as USBNavigator;
  if (!usbNavigator.usb) {
    throw new Error('WebUSB is not supported in this browser');
  }
  return usbNavigator.usb;
};

const isAuthorizedOneKeyUsbDevice = (device: UsbDeviceLike) =>
  ONEKEY_WEBUSB_FILTER.some(
    (filter) =>
      filter.vendorId === device.vendorId &&
      filter.productId === device.productId
  );

const resolveAuthorizedWebUsbDeviceId = (device: UsbDeviceLike) => {
  const deviceId = resolveOneKeyUsbDevicePath(device);
  if (!deviceId) {
    throw new Error('Unable to resolve WebUSB device identity');
  }
  return deviceId;
};

const requestOrReuseOneKeyWebUsbDevice = async () => {
  const usb = getWebUsb();
  const authorizedDevices = await usb.getDevices();
  const authorizedOneKeyDevice = authorizedDevices.find(
    isAuthorizedOneKeyUsbDevice
  );
  if (authorizedOneKeyDevice) {
    return authorizedOneKeyDevice;
  }

  return usb.requestDevice({
    filters: ONEKEY_WEBUSB_FILTER as unknown as UsbDeviceRequestFilter[],
  });
};

const LOCAL_COMPONENT_BINARY_FIELDS: Array<
  [
    Exclude<FirmwareUpdateV4Target, 'resource'>,
    FirmwareUpdateV4ComponentBinaryField
  ]
> = [
  ['boot', 'bootloaderBinary'],
  ['app_v1', 'applicationP1Binary'],
  ['app_v2', 'applicationP2Binary'],
  ['coprocessor', 'coprocessorBinary'],
  ['se01', 'se01Binary'],
  ['se02', 'se02Binary'],
  ['se03', 'se03Binary'],
  ['se04', 'se04Binary'],
];

let searchPromise: Deferred<void> | null = null;

class ServiceHardware {
  scanMap: Record<string, boolean> = {};

  registeredEvents = false;

  isSearch = false;

  timer: ReturnType<typeof setInterval> | null = null;

  file: File | undefined;

  firmwareUpdateInProgress = false;

  async getSDKInstance() {
    return getHardwareSDKInstance().then((instance) => {
      if (!this.registeredEvents) {
        instance.on(UI_EVENT, (e) => {
          const { type, payload } = e;
          if (type === UI_REQUEST.REQUEST_PIN) {
            this.sendUiResponse({
              type: UI_RESPONSE.RECEIVE_PIN,
              payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
            });
            store.dispatch(setShowPinAlert(true));
          } else if (type === UI_REQUEST.REQUEST_BUTTON) {
            store.dispatch(setShowButtonAlert(true));
          } else if (type === UI_REQUEST.CLOSE_UI_WINDOW) {
            store.dispatch(setShowPinAlert(false));
            store.dispatch(setShowButtonAlert(false));
          } else if (type === UI_REQUEST.FIRMWARE_TIP) {
            const { message = '' } = payload.data ?? {};
            switch (message) {
              case 'AutoRebootToBootloader':
                // 5
                store.dispatch(setMaxProgress(5));
                store.dispatch(
                  setUpdateTip(
                    formatMessage({ id: 'TR_GO_TO_BOOTLOADER' }) ?? ''
                  )
                );
                break;
              case 'GoToBootloaderSuccess':
                // 10
                store.dispatch(setMaxProgress(10));
                store.dispatch(
                  setUpdateTip(
                    formatMessage({ id: 'TR_GO_TO_BOOTLOADER_SUCCESS' }) ?? ''
                  )
                );
                break;
              case 'DownloadFirmware':
                // 15
                store.dispatch(setMaxProgress(15));
                store.dispatch(
                  setUpdateTip(
                    formatMessage({ id: 'TR_DOWNLOAD_FIRMWARE' }) ?? ''
                  )
                );
                break;
              case 'DownloadFirmwareSuccess':
                // 25
                store.dispatch(setMaxProgress(25));
                store.dispatch(
                  setUpdateTip(
                    formatMessage({ id: 'TR_DOWNLOAD_FIRMWARE_SUCCESS' }) ?? ''
                  )
                );
                break;
              case 'ConfirmOnDevice':
                store.dispatch(setShowButtonAlert(true));
                store.dispatch(setUpdateTip(''));
                break;
              case 'FirmwareEraseSuccess':
                // 30
                store.dispatch(setMaxProgress(30));
                store.dispatch(
                  setUpdateTip(formatMessage({ id: 'TR_ERASE_SUCCESS' }) ?? '')
                );
                break;
              default:
                break;
            }
          } else if (
            type === 'ui-request_select_device_in_bootloader_for_web_device'
          ) {
            // Reboot re-enumerates the USB device. Latest Pro2/Neo firmware keeps
            // VID/PID 1209:4f4c in every mode, so reuse an already-authorized
            // handle when possible instead of assuming a new PID.
            console.log(
              'Device reconnected after reboot, prompting for USB access...'
            );
            store.dispatch(setShowPinAlert(false));
            store.dispatch(setShowButtonAlert(false));
            store.dispatch(setNeedsBootloaderPermission(true));
          } else if (type === UI_REQUEST.FIRMWARE_PROGRESS) {
            const { progress } = store.getState().firmware;
            const { showButtonAlert } = store.getState().firmware;
            if (showButtonAlert) {
              store.dispatch(setShowButtonAlert(false));
            }
            const { progress: payloadProgress, progressType } = payload;
            const mappedProgress = mapFirmwareUpdateProgress({
              currentProgress: progress,
              payloadProgress,
              progressType,
            });

            if (mappedProgress) {
              store.dispatch(setMaxProgress(mappedProgress.maxProgress));
              store.dispatch(setProgress(mappedProgress.progress));
              store.dispatch(setUseSdkProgress(true));
              store.dispatch(
                setUpdateTip(
                  formatMessage({
                    id:
                      progressType === 'transferData'
                        ? 'TR_TRANSFER_DATA'
                        : 'TR_INSTALLING',
                  }) ?? ''
                )
              );
              return;
            }

            if (payloadProgress >= 0 && payloadProgress < 100) {
              store.dispatch(
                setUpdateTip(formatMessage({ id: 'TR_INSTALLING' }) ?? '')
              );
              return;
            }
            if (payloadProgress === 100) {
              store.dispatch(setMaxProgress(100));
            }
          }
        });
        this.registeredEvents = true;
      }

      return instance;
    });
  }

  async searchDevices() {
    if (this.firmwareUpdateInProgress) {
      console.log('skip searchDevices during firmware update');
      return {
        success: false,
        payload: { error: 'firmware update in progress' },
      } as Unsuccessful;
    }
    const hardwareSDK = await this.getSDKInstance();
    return hardwareSDK?.searchDevices();
  }

  async promptWebDeviceAccess() {
    return requestOrReuseOneKeyWebUsbDevice();
  }

  async startDeviceScan(
    callback: (searchResponse: Unsuccessful | Success<SearchDevice[]>) => void,
    onSearchStateChange: (state: 'start' | 'stop') => void
  ) {
    const searchDevices = async () => {
      if (searchPromise) {
        await searchPromise.promise;
        console.log('search throttling, await search promise and return');
        return;
      }

      searchPromise = createDeferred();
      onSearchStateChange('start');

      let searchResponse;
      try {
        searchResponse = await this.searchDevices();
      } finally {
        searchPromise?.resolve();
        searchPromise = null;
        console.log('search finished, reset searchPromise');
      }

      callback(searchResponse as any);

      onSearchStateChange('stop');
      return searchResponse;
    };

    this.timer = setInterval(async () => {
      if (!this.isSearch && this.timer) {
        clearInterval(this.timer);
        return;
      }
      await searchDevices();
    }, 3000);

    this.isSearch = true;
    await searchDevices();
  }

  stopScan() {
    this.isSearch = false;
  }

  async getFeatures(connectId: string) {
    const hardwareSDK = await this.getSDKInstance();
    const response = await hardwareSDK?.getFeatures(connectId);

    return response;
  }

  async sendUiResponse(response: UiResponseEvent) {
    return (await this.getSDKInstance()).uiResponse(response);
  }

  async getReleaseInfo() {
    const data = await fetchHardwareConfig();

    const deviceMap = {
      classic: data.classic,
      classic1s: data.classic1s,
      mini: data.mini,
      touch: data.touch,
      pro: data.pro,
      unknown: data.unknown,
      classicpure: data.classicpure,
      pro2: data.pro2,
      neo: data.neo,
    };
    store.dispatch(setReleaseMap(deviceMap));
  }

  async checkUpdateBootloaderForClassicAndMini(version: number[]) {
    const state = store.getState();
    const hardwareSDK = await this.getSDKInstance();
    const { device, selectedUploadType } = state.runtime;

    if (!device?.deviceType || !selectedUploadType || !Array.isArray(version)) {
      return true;
    }

    if (
      device?.deviceType !== 'classic' &&
      device?.deviceType !== 'classic1s' &&
      device.deviceType !== 'mini'
    ) {
      return true;
    }

    // Check if need to update classic bootloader
    try {
      const checkBootloaderRes = await hardwareSDK.checkBootloaderRelease(
        undefined,
        {
          willUpdateFirmwareVersion: version.join('.'),
        }
      );
      if (!checkBootloaderRes.success) {
        return true;
      }
      if (!checkBootloaderRes.payload?.shouldUpdate) {
        return true;
      }

      store.dispatch(setInstallType('bootloader'));
      store.dispatch(setProgress(0));
      store.dispatch(setMaxProgress(0));
      store.dispatch(setShowProgressBar(true));
      const response = await hardwareSDK.firmwareUpdateV2(undefined, {
        updateType: 'firmware',
        platform: 'web',
        isUpdateBootloader: true,
      });
      if (!response.success) {
        const message =
          response.payload.code === 413
            ? formatMessage({ id: 'TR_USE_DESKTOP_CLIENT_TO_INSTALL' }) ?? ''
            : response.payload.error;
        store.dispatch(setShowErrorAlert({ type: 'error', message }));
        return false;
      }
      await wait(15000);
      return true;
    } catch (e) {
      console.log(e);
    }
  }

  async bootloaderUpdate() {
    const state = store.getState();
    const hardwareSDK = await this.getSDKInstance();
    const { device, selectedUploadType, selectedReleaseInfo } = state.runtime;
    if (device?.deviceType === 'pro' || device?.deviceType === 'touch') {
      try {
        store.dispatch(setInstallType('bootloader'));
        store.dispatch(setShowProgressBar(true));
        const firmwareField = selectedReleaseInfo?.firmwareField;
        let resource;
        if (selectedUploadType === 'binary') {
          resource = await this.getFileBuffer();
        } else {
          resource = await downloadBootloaderFirmware(
            device?.deviceType,
            firmwareField as Exclude<IFirmwareField, 'ble'>
          );
        }
        const response = await hardwareSDK.deviceUpdateBootloader('', {
          binary: resource,
        });
        if (!response.success) {
          const message =
            response.payload.code === 413
              ? formatMessage({ id: 'TR_USE_DESKTOP_CLIENT_TO_INSTALL' }) ?? ''
              : response.payload.error;
          store.dispatch(setShowErrorAlert({ type: 'error', message }));
          return;
        }
        store.dispatch(
          setShowErrorAlert({
            type: 'success',
            message:
              formatMessage({ id: 'TR_BOOTLOADER_INSTALLED_SUCCESS' }) ?? '',
          })
        );
      } catch (e) {
        console.log(e);
        store.dispatch(
          setShowErrorAlert({
            type: 'error',
            message:
              formatMessage({ id: 'TR_BOOTLOADER_INSTALLED_FAILED' }) ?? '',
          })
        );
      }
    } else {
      store.dispatch(
        setShowErrorAlert({
          type: 'error',
          message: '设备不支持更新bootloader',
        })
      );
    }
  }

  async firmwareUpdate() {
    const state = store.getState();
    const { device } = state.runtime;
    const deviceType = device?.deviceType ?? getDeviceType(device?.features);

    if (
      device?.connectProtocol === 'V2' &&
      (deviceType === 'pro2' || deviceType === 'neo')
    ) {
      await this.firmwareUpdateV4();
      return;
    }

    const hardwareSDK = await this.getSDKInstance();
    const { releaseMap, selectedUploadType, selectedReleaseInfo, currentTab } =
      state.runtime;
    const params: any = {
      platform: 'web',
    };

    // binary params
    if (selectedUploadType === 'binary') {
      params.binary = await this.getFileBuffer();
      params.updateType = currentTab;
    }

    // common params
    if (
      device?.deviceType &&
      (selectedUploadType === 'firmware' || selectedUploadType === 'ble')
    ) {
      const firmwareField = selectedReleaseInfo?.firmwareField;
      if (
        device.deviceType === 'touch' &&
        (firmwareField === 'firmware' || firmwareField === 'firmware-v2')
      ) {
        const fw = await downloadLegacyTouchFirmware(firmwareField);
        params.binary = fw;
      } else if (firmwareField) {
        const version =
          releaseMap[device.deviceType][firmwareField]?.[0]?.version;
        params.version = version;
      }
      params.updateType = state.runtime.selectedUploadType;
    }

    const updateBootloader = await this.checkUpdateBootloaderForClassicAndMini(
      params.version
    );

    if (!updateBootloader) {
      return;
    }

    try {
      store.dispatch(setInstallType('firmware'));
      store.dispatch(setProgress(0));
      store.dispatch(setMaxProgress(0));
      store.dispatch(setShowProgressBar(true));
      const response = await hardwareSDK.firmwareUpdateV2(undefined, params);
      if (!response.success) {
        const message =
          response.payload.code === 413
            ? formatMessage({ id: 'TR_USE_DESKTOP_CLIENT_TO_INSTALL' }) ?? ''
            : response.payload.error;
        store.dispatch(setShowErrorAlert({ type: 'error', message }));
        return;
      }
      store.dispatch(
        setShowErrorAlert({ type: 'success', message: '固件安装成功' })
      );
    } catch (e) {
      console.log(e);
      store.dispatch(
        setShowErrorAlert({
          type: 'error',
          message: formatMessage({ id: 'TR_FIRMWARE_INSTALLED_FAILED' }) ?? '',
        })
      );
    }
  }

  /**
   * Performs the standard Protocol V2 update for OneKey Pro 2 or Neo.
   * With no explicit binaries, the SDK resolves compatible firmware-v1 components remotely.
   */
  async firmwareUpdateV4(params?: FirmwareUpdateV4Request) {
    const state = store.getState();
    const { device } = state.runtime;
    const deviceType = device?.deviceType ?? getDeviceType(device?.features);

    if (
      device?.connectProtocol !== 'V2' ||
      (deviceType !== 'pro2' && deviceType !== 'neo')
    ) {
      store.dispatch(
        setShowErrorAlert({
          type: 'error',
          message: '当前设备不支持 Protocol V2 固件更新',
        })
      );
      return;
    }

    const hardwareSDK = await this.getSDKInstance();
    const updateParams: FirmwareUpdateV4Request = params
      ? { ...params }
      : { platform: 'web' };

    this.firmwareUpdateInProgress = true;
    try {
      store.dispatch(setInstallType('firmware'));
      store.dispatch(setProgress(0));
      store.dispatch(setMaxProgress(0));
      store.dispatch(setShowProgressBar(true));
      window.scrollTo({ top: 0, behavior: 'auto' });

      const localTargets: FirmwareUpdateV4Target[] =
        LOCAL_COMPONENT_BINARY_FIELDS.flatMap(([target, field]) =>
          updateParams[field] instanceof ArrayBuffer ? [target] : []
        );
      if (updateParams.localResourceArchiveBinary)
        localTargets.push('resource');
      const requestedTargets =
        localTargets.length > 0
          ? Array.from(new Set<FirmwareUpdateV4Target>(localTargets))
          : updateParams.targetsToUpdate ?? [];

      let response;
      if (localTargets.length > 0) {
        console.log(
          'Protocol V2 local firmwareUpdateV4 targets:',
          requestedTargets
        );
        response = await hardwareSDK.firmwareUpdateV4(
          device.connectId ?? undefined,
          {
            platform: 'web',
            targetsToUpdate: requestedTargets,
            ...Object.fromEntries(
              LOCAL_COMPONENT_BINARY_FIELDS.flatMap(([, field]) => {
                const binary = updateParams[field];
                return binary instanceof ArrayBuffer ? [[field, binary]] : [];
              })
            ),
            ...(updateParams.localResourceArchiveBinary
              ? {
                  resourceArchiveBinary:
                    updateParams.localResourceArchiveBinary,
                }
              : {}),
          }
        );
      } else {
        // Match expo-playground: detect what actually needs updating.
        // Do not force-reinstall every checked remote component — that was
        // starting an install against already-current SE/boot targets and
        // surfacing leftover FAILED status before the on-device confirm.
        const releaseResponse = await hardwareSDK.checkAllFirmwareRelease(
          device.connectId ?? undefined,
          {
            platform: 'web',
            ...(requestedTargets.length > 0
              ? { protocolV2ForceUpdateTargets: requestedTargets }
              : {}),
          }
        );
        if (!releaseResponse.success) {
          throw new Error(releaseResponse.payload.error);
        }
        const plan = releaseResponse.payload.firmwareUpdatePlan;
        const releaseTargets =
          releaseResponse.payload.targetsToUpdate ??
          plan?.targetsToUpdate ??
          [];
        if (!plan || plan.executor !== 'v4') {
          if (releaseTargets.length === 0) {
            store.dispatch(
              setShowErrorAlert({
                type: 'success',
                message:
                  formatMessage({ id: 'TR_FIRMWARE_INSTALLED' }) ||
                  'Firmware is already current',
              })
            );
            return;
          }
          throw new Error('Protocol V2 firmware update Plan is unavailable');
        }
        const binaries = await loadFirmwareUpdatePlanBinaries({ plan });
        if (requestedTargets.length > 0) {
          const selected = new Set(requestedTargets);
          binaries.targetsToUpdate = (binaries.targetsToUpdate ?? []).filter(
            (target) => selected.has(target)
          );
          LOCAL_COMPONENT_BINARY_FIELDS.forEach(([target, field]) => {
            if (!selected.has(target)) {
              delete binaries[field];
            }
          });
          if (!selected.has('resource')) {
            delete binaries.resourceArchiveBinary;
          }
        }
        if (!binaries.targetsToUpdate?.length) {
          store.dispatch(
            setShowErrorAlert({
              type: 'success',
              message:
                formatMessage({ id: 'TR_FIRMWARE_INSTALLED' }) ||
                'Firmware is already current',
            })
          );
          return;
        }
        console.log(
          'Protocol V2 remote firmwareUpdateV4 plan targets:',
          binaries.targetsToUpdate
        );
        response = await hardwareSDK.firmwareUpdateV4(
          device.connectId ?? undefined,
          {
            platform: 'web',
            ...binaries,
            ...(requestedTargets.includes('resource')
              ? { forcedUpdateRes: true }
              : {}),
          }
        );
      }

      if (!response.success) {
        console.error(
          'Protocol V2 firmwareUpdateV4 failed payload:',
          response.payload
        );
        throw new Error(response.payload.error);
      }

      store.dispatch(
        setShowErrorAlert({
          type: 'success',
          message:
            formatMessage({ id: 'TR_FIRMWARE_INSTALLED_SUCCESS' }) ||
            '固件更新成功',
        })
      );
    } catch (error) {
      console.error('Protocol V2 firmware update error:', error);
      store.dispatch(
        setShowErrorAlert({
          type: 'error',
          message:
            error instanceof Error
              ? error.message
              : formatMessage({ id: 'TR_FIRMWARE_INSTALLED_FAILED' }) || '',
        })
      );
    } finally {
      this.firmwareUpdateInProgress = false;
    }
  }

  /**
   * Performs firmware update using the V3 update protocol
   * This method handles components from the firmware-v8 configuration including:
   * - Main firmware
   * - BLE firmware
   * - Bootloader
   * - Resource files
   */
  async firmwareUpdateV3() {
    const state = store.getState();
    const hardwareSDK = await this.getSDKInstance();
    const { device, selectedV3Components, v3UpdateSelections, currentTab } =
      state.runtime;

    // Basic validation
    if (
      !device?.deviceType ||
      !['v3-remote', 'v3-local'].includes(currentTab)
    ) {
      store.dispatch(
        setShowErrorAlert({
          type: 'error',
          message: '无效的设备或更新类型',
        })
      );
      return;
    }

    // Determine which components are selected in the current tab
    const filteredComponents = selectedV3Components.filter((component) =>
      currentTab === 'v3-remote'
        ? v3UpdateSelections[component]?.source === 'remote'
        : v3UpdateSelections[component]?.source === 'local'
    );

    if (filteredComponents.length === 0) {
      store.dispatch(
        setShowErrorAlert({
          type: 'error',
          message:
            formatMessage({ id: 'TR_NO_COMPONENTS_SELECTED' }) ||
            '未选择任何组件',
        })
      );
      return;
    }

    // Prepare update parameters
    const updateParams: FirmwareUpdateV3Params = { platform: 'web' };

    try {
      // 处理远程固件更新
      if (currentTab === 'v3-remote') {
        const deviceType = device.deviceType;
        const releaseInfo = state.runtime.releaseMap[deviceType];

        // pro固件字段配置键
        const firmwareField = 'firmware-v8';

        // 处理每个选中的组件
        for (const component of filteredComponents) {
          const selection = v3UpdateSelections[component];
          if (!selection?.version && component !== 'resource') {
            // 如果没有版本信息且不是资源组件，跳过此组件
            break;
          }

          // 根据组件类型选择不同的处理方式
          switch (component) {
            case 'fw': {
              // 固件处理
              const fwReleaseInfo = releaseInfo[
                firmwareField as keyof typeof releaseInfo
              ] as IFirmwareReleaseInfo[] | undefined;
              if (fwReleaseInfo && fwReleaseInfo.length > 0) {
                updateParams.firmwareVersion = fwReleaseInfo[0].version;
              }
              updateParams.forcedUpdateRes = true;
              break;
            }
            case 'ble': {
              // BLE固件处理
              const bleReleaseInfo = releaseInfo.ble;
              if (bleReleaseInfo && bleReleaseInfo.length > 0) {
                updateParams.bleVersion = bleReleaseInfo[0].version;
              }
              break;
            }
            case 'boot': {
              // Bootloader处理
              const fwReleaseInfo = releaseInfo[
                firmwareField as keyof typeof releaseInfo
              ] as IFirmwareReleaseInfo[] | undefined;
              if (
                fwReleaseInfo &&
                fwReleaseInfo.length > 0 &&
                fwReleaseInfo[0].bootloaderVersion
              ) {
                updateParams.bootloaderVersion =
                  fwReleaseInfo[0].bootloaderVersion;
              }
              break;
            }
            default:
              // skip
              break;
          }
        }
      }
      // 处理本地文件更新
      else if (currentTab === 'v3-local') {
        const v3FileObjects = (window as any).v3FileObjects || {};

        // 帮助函数：处理文件并返回 Buffer
        const processFile = async (file: File) => {
          if (!file) return null;

          try {
            const arrayBuffer = await new Promise<ArrayBuffer>(
              (resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () =>
                  reader.result
                    ? resolve(reader.result as ArrayBuffer)
                    : reject(new Error('Empty file'));
                reader.onerror = () => reject(reader.error);
                reader.readAsArrayBuffer(file);
              }
            );

            return arrayBufferToBuffer(arrayBuffer);
          } catch (error) {
            console.error('处理文件失败:', error);
            return null;
          }
        };

        // 处理每个选中的组件
        for (const component of filteredComponents) {
          const file = v3FileObjects[component];
          if (file) {
            const buffer = await processFile(file);
            if (buffer) {
              // 根据组件类型设置不同的更新参数
              switch (component) {
                case 'fw':
                  updateParams.firmwareBinary = buffer;
                  break;
                case 'ble':
                  updateParams.bleBinary = buffer;
                  break;
                case 'boot':
                  updateParams.bootloaderBinary = buffer;
                  break;
                case 'resource':
                  updateParams.resourceBinary = buffer;
                  break;
                default:
                  // 默认情况不做任何处理
                  break;
              }
            }
          }
        }
      }

      // Verify there is something to update
      if (!Object.keys(updateParams).some((k) => k !== 'platform')) {
        throw new Error(
          formatMessage({ id: 'TR_NO_FIRMWARE_TO_UPDATE' }) ||
            '没有可更新的固件'
        );
      }

      // Start update process
      store.dispatch(setInstallType('firmware'));
      store.dispatch(setProgress(0));
      store.dispatch(setMaxProgress(0));
      store.dispatch(setShowProgressBar(true));

      console.log('=====> firmwareUpdateV3 updateParams', updateParams);
      // Scroll to the top of the page for better user experience
      window.scrollTo({ top: 0, behavior: 'auto' });
      const response = await hardwareSDK.firmwareUpdateV3(
        undefined,
        updateParams
      );

      if (!response.success) {
        throw new Error(
          response.payload.code === 413
            ? formatMessage({ id: 'TR_USE_DESKTOP_CLIENT_TO_INSTALL' }) || ''
            : response.payload.error
        );
      }

      store.dispatch(
        setShowErrorAlert({
          type: 'success',
          message:
            formatMessage({ id: 'TR_FIRMWARE_INSTALLED_SUCCESS' }) ||
            '固件更新成功',
        })
      );
    } catch (error) {
      console.error('Firmware update error:', error);
      store.dispatch(
        setShowErrorAlert({
          type: 'error',
          message:
            error instanceof Error
              ? error.message
              : formatMessage({ id: 'TR_FIRMWARE_INSTALLED_FAILED' }) || '',
        })
      );
    }
  }

  async uploadFullResource() {
    const hardwareSDK = await this.getSDKInstance();
    const response = await hardwareSDK.deviceFullyUploadResource('', {});
    return !!response.success;
  }

  setFile(file: File) {
    this.file = file;
  }

  getFileBuffer() {
    return new Promise((resolve, reject) => {
      if (!this.file) {
        reject(new Error('no file'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const fw = arrayBufferToBuffer(reader.result);
        resolve(fw);
      };
      reader.readAsArrayBuffer(this.file);
    });
  }

  async rebootToBoard() {
    const hardwareSDK = await this.getSDKInstance();
    const response = await hardwareSDK.deviceRebootToBoardloader('');
    return !!response.success;
  }

  /**
   * Re-authorize the USB device after a firmware reboot.
   * Latest Pro2/Neo firmware keeps VID/PID 1209:4f4c in every mode and may omit
   * iSerialNumber, so reuse an already-granted WebUSB handle and report the
   * same synthesized path the SDK uses for empty serials.
   */
  async promptBootloaderDeviceAccess() {
    let authorized = false;
    try {
      const device = await requestOrReuseOneKeyWebUsbDevice();
      const deviceId = resolveAuthorizedWebUsbDeviceId(device);

      console.log(
        'Bootloader device authorized:',
        deviceId,
        'Sending response to SDK...'
      );

      await this.sendUiResponse({
        type: UI_RESPONSE.SELECT_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE,
        payload: {
          deviceId,
        },
      });

      console.log('Device selection response sent successfully');
      store.dispatch(setNeedsBootloaderPermission(false));
      authorized = true;
    } catch (error) {
      console.error('Error prompting bootloader device access:', error);
      // Don't throw - let the SDK handle timeout
    }
    return authorized;
  }
}

export default ServiceHardware;

const serviceHardware = new ServiceHardware();

export { serviceHardware };
