import { FC, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Button } from '@onekeyhq/ui-components';
import { getDeviceType } from '@onekeyfe/hd-core';
import { serviceHardware } from '@/hardware';
import ReleaseInfo from './ReleaseInfo';
import BootloaderTips from './BootloaderTips';

const Description: FC<{ text: string; value: string }> = ({ text, value }) => (
  <div className="flex items-center justify-between text-sm text-gray-800 py-1">
    <span>{text}:</span>
    <span>{value}</span>
  </div>
);

const ConfirmUpdate: FC = () => {
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
            我确认设备是空的或我已经有了恢复种子
          </label>
        </div>
      </div>
      <div className="py-4">
        <Button
          type="primary"
          size="xl"
          disabled={!(device && selectedUploadType && confirmProtocol)}
          onClick={() => serviceHardware.firmwareUpdate()}
        >
          确定
        </Button>
      </div>
    </div>
  );
};

export default function Firmware() {
  const device = useSelector((state: RootState) => state.runtime.device);
  const [deviceType, setDeviceType] = useState('');
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
  return (
    <div className="content">
      <h1 className="text-3xl text-center font-light py-4">安装固件</h1>
      <div className="flex flex-row-reverse">
        <div className="md:w-1/2 sm:w-full">
          <Description text="状态" value={device ? '已连接' : '未连接'} />
          <Description
            text="Bootloader 版本"
            value={device?.features.bootloader_version ?? '-'}
          />
          <Description
            text="固件版本"
            value={device?.features.onekey_version ?? '-'}
          />
          <Description
            text="蓝牙固件版本"
            value={device?.features.ble_ver ?? '-'}
          />
          <Description text="设备类型" value={deviceType} />
          <Description text="设备序列号" value={device?.uuid ?? '-'} />
        </div>
      </div>
      <ReleaseInfo />
      <ConfirmUpdate />
      {/* <BootloaderTips /> */}
    </div>
  );
}
