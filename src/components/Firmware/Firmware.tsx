/* eslint-disable no-nested-ternary */
import { FC, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import semver from 'semver';
import { useIntl } from 'react-intl';
import { RootState } from '@/store';
import { Button, Alert, Link } from '@onekeyfe/ui-components';
import { getDeviceType, KnownDevice } from '@onekeyfe/hd-core';
import { serviceHardware } from '@/hardware';
import { setDevice } from '@/store/reducers/runtime';
import { RestartToHomeTip, ListTips, EmptyTips } from './TouchResource/Tips';
import ResourceButton from './TouchResource/Button';

import ConfirmDialog from '../Modal';
import ReleaseInfo from './ReleaseInfo';
import BootloaderTips from './BootloaderTips';
import ProgressBar from './ProgressBar';

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

const ConfirmUpdate: FC = () => {
  const intl = useIntl();
  const device = useSelector((state: RootState) => state.runtime.device);
  const selectedUploadType = useSelector(
    (state: RootState) => state.runtime.selectedUploadType
  );
  const [confirmProtocol, setConfirmProtocol] = useState(false);

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
          disabled={!(device && selectedUploadType && confirmProtocol)}
          onClick={() => {
            if (timer) {
              clearInterval(timer);
            }
            serviceHardware.firmwareUpdate();
          }}
        >
          {intl.formatMessage({ id: 'TR_FIRMWARE_HEADING' })}
        </Button>
      </div>
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
  const [deviceType, setDeviceType] = useState('');

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
      case 'mini':
        typeFlag = 'OneKey Mini';
        break;
      case 'touch':
        typeFlag = 'OneKey Touch';
        break;
      case 'pro':
        typeFlag = 'OneKey Pro';
        break;
      default:
        break;
    }
    setDeviceType(typeFlag);
  }, [device, deviceType]);

  const isBootLoader = device?.features?.bootloader_mode;
  const isGreaterThan340 = semver.gte(
    device?.features?.onekey_version ?? '',
    '3.4.0'
  );

  return (
    <div className="content">
      <h1 className="text-3xl text-center font-light py-4">
        {intl.formatMessage({ id: 'TR_FIRMWARE_HEADING' })}
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
              {['touch'].includes(getDeviceType(device?.features)) && (
                <Description
                  text={intl.formatMessage({ id: 'TR_RES_REPAIR' })}
                  value={
                    <Link
                      className="cursor-pointer"
                      type="plain"
                      onClick={() => {
                        setModalStatus(true);
                      }}
                    >
                      {intl.formatMessage({ id: 'TR_CLICK_TO_REPAIR' })}
                    </Link>
                  }
                />
              )}
              {['touch'].includes(getDeviceType(device?.features)) && (
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
                    <EmptyTips
                      version={device?.features?.onekey_version ?? '-'}
                    />
                  )}
                  {!isBootLoader && isGreaterThan340 ? (
                    <ResourceButton />
                  ) : null}
                </ConfirmDialog>
              )}
            </div>
          </div>

          <ReleaseInfo />
          {isMiniAndNotInBootloader ? <BootloaderTips /> : <ConfirmUpdate />}
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
