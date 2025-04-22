/* eslint-disable no-nested-ternary */
import { FC, useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import semver from 'semver';
import { useIntl } from 'react-intl';
import { RootState } from '@/store';
import { Button, Alert, Link } from '@onekeyfe/ui-components';
import {
  getDeviceType,
  KnownDevice,
  getDeviceBootloaderVersion,
} from '@onekeyfe/hd-core';
import { serviceHardware } from '@/hardware';
import { setDevice } from '@/store/reducers/runtime';
import { RestartToHomeTip, ListTips, EmptyTips } from './TouchResource/Tips';
import ResourceButton from './TouchResource/Button';

import ConfirmDialog from '../Modal';
import ReleaseInfo from './ReleaseInfo';
import BootloaderTips from './BootloaderTips';
import ProgressBar from './ProgressBar';
import BridgeReleaseDialog from './BridgeReleaseDialog';
import V3FirmwareConfirmUpdate from './V3FirmwareConfirmUpdate';
import V3ReleaseInfo from './V3ReleaseInfo';

let timer: ReturnType<typeof setInterval>;
let isPollingUpdateDevice = false;

const DeviceEventAlert: FC = () => {
  const intl = useIntl();
  const showPinAlert = useSelector(
    (state: RootState) => state.firmware.showPinAlert
  );
  const showButtonAlert = useSelector(
    (state: RootState) => state.firmware.showButtonAlert
  );
  return (
    <>
      {showPinAlert && (
        <Alert
          type="warning"
          title={intl.formatMessage({ id: 'TR_INPUT_PIN_CODE' })}
        />
      )}
      {showButtonAlert && (
        <Alert
          type="warning"
          title={intl.formatMessage({ id: 'TR_PLEASE_CONFIRM_ON_DEVICE' })}
        />
      )}
    </>
  );
};

const ResultAlert: FC = () => {
  const intl = useIntl();
  const showResultAlert = useSelector(
    (state: RootState) => state.firmware.showResultAlert
  );
  const resultType = useSelector(
    (state: RootState) => state.firmware.resultType
  );
  const resultTip = useSelector((state: RootState) => state.firmware.resultTip);
  if (!showResultAlert) {
    return null;
  }
  return (
    <div className="p-8">
      <Alert
        type={resultType}
        title={
          resultType === 'success'
            ? resultTip
            : intl.formatMessage({ id: 'TR_FIRMWARE_INSTALLED_FAILED' })
        }
        content={
          resultType === 'success'
            ? intl.formatMessage({ id: 'TR_CONNECT_YOUR_DEVICE_AGAIN' })
            : resultTip
        }
      />
      <div className="flex items-center justify-center p-8">
        <Button type="primary" onClick={() => window.location.reload()}>
          {intl.formatMessage({ id: 'TR_CONTINUE_UPDATING' })}
        </Button>
      </div>
    </div>
  );
};

const Description: FC<{ text: string; value: any }> = ({ text, value }) => (
  <div className="flex items-center justify-between text-sm text-gray-800 py-1">
    <span>{text}:</span>
    <span>{value}</span>
  </div>
);

const RebootToBoard: FC = () => {
  const intl = useIntl();
  const device = useSelector((state: RootState) => state.runtime.device);
  const [loading, setLoading] = useState(false);
  const isBootLoader = device?.features?.bootloader_mode;

  const onRebootToBoard = useCallback(async () => {
    setLoading(true);
    await serviceHardware.rebootToBoard();
    setLoading(false);
  }, []);

  if (
    !isBootLoader &&
    ['touch', 'pro'].includes(getDeviceType(device?.features))
  ) {
    return (
      <div className="flex items-center justify-end py-1">
        <Button
          className="sm:w-[50%] w-full"
          size="sm"
          loading={loading}
          onClick={onRebootToBoard}
        >
          {intl.formatMessage({ id: 'TR_CLICK_TO_BOARD' })}
        </Button>
      </div>
    );
  }

  return null;
};

const ConfirmUpdate: FC = () => {
  const intl = useIntl();
  const device = useSelector((state: RootState) => state.runtime.device);
  const releaseMap = useSelector(
    (state: RootState) => state.runtime.releaseMap
  );
  const selectedReleaseInfo = useSelector(
    (state: RootState) => state.runtime.selectedReleaseInfo
  );
  const selectedUploadType = useSelector(
    (state: RootState) => state.runtime.selectedUploadType
  );
  const tabType = useSelector((state: RootState) => state.runtime.currentTab);
  const [confirmProtocol, setConfirmProtocol] = useState(false);
  const [bridgeReleaseModalVisible, setBridgeReleaseModalVisible] =
    useState(false);
  const [bridgeReleaseVersion, setBridgeReleaseVersion] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const onHandleInstall = useCallback(async () => {
    if (isUpdating) return;
    if (timer) {
      clearInterval(timer);
    }
    setIsUpdating(true);
    try {
      if (
        device?.deviceType &&
        (selectedUploadType === 'firmware' || selectedUploadType === 'ble')
      ) {
        const firmwareField = selectedReleaseInfo?.firmwareField;
        if (firmwareField) {
          const version =
            releaseMap[device.deviceType]?.[firmwareField]?.[0]?.version;
          const checkBridgeRelease = await serviceHardware.checkBridgeRelease(
            version?.join('.') ?? ''
          );
          if (checkBridgeRelease?.shouldUpdate) {
            setBridgeReleaseVersion(checkBridgeRelease.releaseVersion);
            setBridgeReleaseModalVisible(true);
            return;
          }
        }
      }

      if (tabType === 'bootloader') {
        await serviceHardware.bootloaderUpdate();
      } else {
        await serviceHardware.firmwareUpdate();
      }
    } catch (error) {
      console.error('Error during firmware update:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [
    device,
    selectedUploadType,
    selectedReleaseInfo,
    releaseMap,
    tabType,
    isUpdating,
  ]);

  return (
    <div className="flex justify-center items-center flex-col">
      <div className="relative flex items-start">
        <div className="flex h-5 items-center">
          <input
            id="comments"
            aria-describedby="comments-description"
            name="comments"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            checked={confirmProtocol}
            onChange={(e) => {
              const inputValue = e.target.checked;
              setConfirmProtocol(inputValue);
            }}
          />
        </div>
        <div className="ml-3 text-sm">
          <label htmlFor="comments" className="font-normal text-gray-700">
            {intl.formatMessage({ id: 'TR_FIRMWARE_USER_ENSURE' })}
          </label>
        </div>
      </div>
      <div className="py-4">
        <Button
          type="primary"
          size="xl"
          onClick={() => {
            onHandleInstall();
          }}
        >
          {intl.formatMessage({ id: 'TR_FIRMWARE_HEADING' })}
        </Button>
      </div>
      <BridgeReleaseDialog
        visible={bridgeReleaseModalVisible}
        setVisible={setBridgeReleaseModalVisible}
        version={bridgeReleaseVersion}
      />
    </div>
  );
};

export default function Firmware() {
  const [modalStatus, setModalStatus] = useState(false);
  const intl = useIntl();
  const dispatch = useDispatch();
  const device = useSelector((state: RootState) => state.runtime.device);
  const showProgressBar = useSelector(
    (state: RootState) => state.firmware.showProgressBar
  );
  const showFirmwareUpdate = useSelector(
    (state: RootState) => state.firmware.showFirmwareUpdate
  );
  const installType = useSelector((s: RootState) => s.runtime.installType);
  const [deviceType, setDeviceType] = useState('');
  const tabType = useSelector((state: RootState) => state.runtime.currentTab);

  const [isMiniAndNotInBootloader, setIsMiniAndNotInBootloader] =
    useState(false);
  useEffect(() => {
    const type = getDeviceType(device?.features);
    if (type !== 'mini') {
      setIsMiniAndNotInBootloader(false);
      return;
    }
    setIsMiniAndNotInBootloader(!device?.features.bootloader_mode);
  }, [device]);

  useEffect(() => {
    if (isPollingUpdateDevice) return;
    timer = setInterval(async () => {
      const response = await serviceHardware.searchDevices();
      if (!response.success) {
        return;
      }
      if (response.payload.length > 0) {
        if (!device) {
          dispatch(setDevice(response.payload?.[0] as KnownDevice));
        } else {
          const existDevice = response.payload.find(
            (d) => (d as any).path === device.path
          );
          if (existDevice) {
            dispatch(setDevice(existDevice as KnownDevice));
          } else {
            dispatch(setDevice(response.payload?.[0] as KnownDevice));
          }
        }
      }
    }, 5000);
    isPollingUpdateDevice = true;

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  useEffect(() => {
    const originType = getDeviceType(device?.features);
    let typeFlag = '';
    switch (originType) {
      case 'classic':
        typeFlag = 'OneKey Classic';
        break;
      case 'classic1s':
        typeFlag = 'OneKey Classic 1S';
        break;
      case 'mini':
        typeFlag = 'OneKey Mini';
        break;
      case 'touch':
        typeFlag = 'OneKey Touch';
        break;
      case 'pro':
        typeFlag = 'OneKey Pro';
        break;
      case 'unknown':
        typeFlag = 'Unknown';
        break;
      case 'classicpure':
        typeFlag = 'OneKey Classic 1S Pure';
        break;
      default:
        // eslint-disable-next-line no-case-declarations, no-unused-vars, @typescript-eslint/no-unused-vars
        const checkType = originType;
        break;
    }
    setDeviceType(typeFlag);
  }, [device, deviceType]);

  const isBootLoader = device?.features?.bootloader_mode;
  const isGreaterThan340 = semver.gte(
    device?.features?.onekey_version ?? '0.0.0',
    '3.4.0'
  );

  const clearTimer = () => {
    if (timer) {
      clearInterval(timer);
    }
  };

  // Check if we're in V3 mode
  const isV3Update = tabType === 'v3-remote' || tabType === 'v3-local';

  const isV3Compatible = () => {
    if (!device?.features) return false;
    const currDeviceType = getDeviceType(device.features);
    const bootloaderVersion = getDeviceBootloaderVersion(device.features).join(
      '.'
    );
    return currDeviceType === 'pro' && semver.gte(bootloaderVersion, '2.8.0');
  };

  return (
    <div className="content">
      <h1 className="text-3xl text-center font-light py-4">
        {intl.formatMessage({
          id:
            installType === 'bootloader'
              ? 'TR_BOOTLOADER_HEADING'
              : 'TR_FIRMWARE_HEADING',
        })}
      </h1>
      {!showFirmwareUpdate ? (
        <>
          <div className="flex flex-row-reverse">
            <div className="md:w-1/2 sm:w-full">
              <Description
                text={intl.formatMessage({ id: 'TR_FIRMWARE_STATUS' })}
                value={
                  device
                    ? intl.formatMessage({ id: 'TR_DEVICE_CONNECT' })
                    : intl.formatMessage({ id: 'TR_DEVICE_DISCONNECT' })
                }
              />
              <Description
                text={intl.formatMessage({
                  id: 'TR_FIRMWARE_BOOTLOADER_VERSION',
                })}
                value={device?.features.bootloader_version ?? '-'}
              />
              <Description
                text={intl.formatMessage({
                  id: 'TR_FIRMWARE_VERSION',
                })}
                value={device?.features.onekey_version ?? '-'}
              />
              <Description
                text={intl.formatMessage({
                  id: 'TR_BLUETOOTH_FIRMWARE_VERSION',
                })}
                value={device?.features.ble_ver ?? '-'}
              />
              <Description
                text={intl.formatMessage({
                  id: 'TR_DEVICE_TYPE',
                })}
                value={deviceType}
              />
              <Description
                text={intl.formatMessage({
                  id: 'TR_DEVICE_NUMBER',
                })}
                value={device?.uuid ?? '-'}
              />
              <RebootToBoard />
            </div>
          </div>
          {['touch', 'pro'].includes(getDeviceType(device?.features)) && (
            <ConfirmDialog
              okCancel
              cancelText={intl.formatMessage({ id: 'TR_CLOSE' })}
              visible={modalStatus}
              onCancel={() => setModalStatus(false)}
            >
              {isBootLoader ? (
                <RestartToHomeTip />
              ) : isGreaterThan340 ? (
                <ListTips />
              ) : (
                <EmptyTips version={device?.features?.onekey_version ?? '-'} />
              )}
              {!isBootLoader && isGreaterThan340 ? <ResourceButton /> : null}
            </ConfirmDialog>
          )}
          {['touch', 'pro'].includes(getDeviceType(device?.features)) && (
            <div className="my-2">
              <Alert
                contentClassName="items-center"
                title={intl.formatMessage(
                  {
                    id: 'TR_RES_REPAIR',
                  },
                  { '0': deviceType }
                )}
                type="warning"
                action={
                  <Link
                    className="cursor-pointer"
                    type="plain"
                    onClick={() => {
                      window.open(
                        'https://help.onekey.so/hc/articles/10159281900687-%E7%A1%AC%E4%BB%B6%E9%92%B1%E5%8C%85%E5%B1%8F%E5%B9%95%E5%AD%97%E7%AC%A6%E5%8F%98%E6%88%90%E6%96%B9%E5%9D%97%E7%9A%84%E4%BF%AE%E5%A4%8D%E5%8A%9E%E6%B3%95-Pro-%E5%92%8C-Touch'
                      );
                    }}
                  >
                    {intl.formatMessage({ id: 'TR_CLICK_TO_REPAIR' })}
                  </Link>
                }
              />
            </div>
          )}
          {isV3Compatible() ? <V3ReleaseInfo /> : <ReleaseInfo />}
          {(() => {
            if (isMiniAndNotInBootloader) {
              return <BootloaderTips />;
            }

            if (isV3Update && isV3Compatible()) {
              return <V3FirmwareConfirmUpdate clearTimer={clearTimer} />;
            }

            return <ConfirmUpdate />;
          })()}
        </>
      ) : (
        <>
          <ResultAlert />
          <DeviceEventAlert />
          {showProgressBar && <ProgressBar />}
        </>
      )}
    </div>
  );
}
