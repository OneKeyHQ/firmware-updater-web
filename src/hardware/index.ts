/* eslint-disable class-methods-use-this */
import axios from 'axios';
import {
  SearchDevice,
  Success,
  Unsuccessful,
  UiResponseEvent,
  UI_EVENT,
  UI_REQUEST,
  UI_RESPONSE,
} from '@onekeyfe/hd-core';
import { createDeferred, Deferred } from '@onekeyfe/hd-shared';
import { store } from '@/store';
import {
  setBridgeReleaseMap,
  setBridgeVersion,
  setReleaseMap,
  setInstallType,
} from '@/store/reducers/runtime';
import {
  setMaxProgress,
  setShowPinAlert,
  setShowButtonAlert,
  setUpdateTip,
  setShowProgressBar,
  setShowErrorAlert,
  setProgress,
} from '@/store/reducers/firmware';
import type {
  BridgeReleaseMap,
  IFirmwareField,
  RemoteConfigResponse,
} from '@/types';
import { arrayBufferToBuffer, wait, getFirmwareUpdateField } from '@/utils';
import {
  downloadBootloaderFirmware,
  downloadLegacyTouchFirmware,
} from '@/utils/touchFirmware';
import { formatMessage } from '@/locales';
import { getHardwareSDKInstance } from './instance';

let searchPromise: Deferred<void> | null = null;
class ServiceHardware {
  scanMap: Record<string, boolean> = {};

  registeredEvents = false;

  isSearch = false;

  timer: ReturnType<typeof setInterval> | null = null;

  file: File | undefined;

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
          } else if (type === UI_REQUEST.FIRMWARE_PROGRESS) {
            const progress = store.getState().firmware.progress;
            if (
              progress < 99 &&
              payload.progress >= 0 &&
              payload.progress < 100
            ) {
              // 99
              store.dispatch(setMaxProgress(99));
              store.dispatch(
                setUpdateTip(formatMessage({ id: 'TR_INSTALLING' }) ?? '')
              );
            } else if (payload.progress === 100) {
              // 100
              store.dispatch(setMaxProgress(100));
              store.dispatch(setUpdateTip(''));
            }
          }
        });
      }

      return instance;
    });
  }

  async searchDevices() {
    const hardwareSDK = await this.getSDKInstance();
    return hardwareSDK?.searchDevices();
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

  async checkBridgeStatus() {
    return new Promise(async (resolve) => {
      const hardwareSDK = await this.getSDKInstance();
      const res = await hardwareSDK?.checkBridgeStatus();
      resolve(res.success);
    });
  }

  async getReleaseInfo() {
    const { data } = await axios.get<RemoteConfigResponse>(
      `https://data.onekey.so/pre-config.json?noCache=${new Date().getTime()}`
    );

    const deviceMap = {
      classic: data.classic,
      classic1s: data.classic1s,
      mini: data.mini,
      touch: data.touch,
      pro: data.pro,
      unknown: data.unknown,
      classicpure: data.classicpure,
    };
    store.dispatch(setReleaseMap(deviceMap));

    const bridgeMap: BridgeReleaseMap = {
      linux64Deb: {
        value: data.bridge.linux64Deb,
        label: 'Linux 64-bit (deb)',
      },
      linux64Rpm: {
        value: data.bridge.linux64Rpm,
        label: 'Linux 64-bit (rpm)',
      },
      linux32Deb: {
        value: data.bridge.linux32Deb,
        label: 'Linux 32-bit (deb)',
      },
      linux32Rpm: {
        value: data.bridge.linux32Rpm,
        label: 'Linux 32-bit (rpm)',
      },
      mac: { value: data.bridge.mac, label: 'Mac OS X' },
      win: { value: data.bridge.win, label: 'Window' },
    };
    store.dispatch(setBridgeReleaseMap(bridgeMap));
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
    const hardwareSDK = await this.getSDKInstance();
    const {
      device,
      releaseMap,
      selectedUploadType,
      selectedReleaseInfo,
      currentTab,
    } = state.runtime;
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

  async checkBridgeRelease(willUpdateFirmwareVersion: string) {
    const hardwareSDK = await this.getSDKInstance();
    return hardwareSDK
      ?.checkBridgeRelease(undefined, {
        willUpdateFirmwareVersion,
      })
      .then((response) => {
        if (!response.success) {
          return { shouldUpdate: false, status: 'valid', releaseVersion: '' };
        }
        return response.payload;
      });
  }

  async rebootToBoard() {
    const hardwareSDK = await this.getSDKInstance();
    const response = await hardwareSDK.deviceRebootToBoardloader('');
    return !!response.success;
  }
}

export default ServiceHardware;

const serviceHardware = new ServiceHardware();

export { serviceHardware };
