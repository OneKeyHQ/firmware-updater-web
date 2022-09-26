import { FC } from 'react';
import { Button } from '@onekeyhq/ui-components';
import { ReleaseInfo } from '@/components';
import UploadFirmware from './UploadFirmware';
import BootloaderTips from './BootloaderTips';

const Description: FC<{ text: string; value: string }> = ({ text, value }) => (
  <div className="flex items-center justify-between text-sm text-gray-800 py-1">
    <span>{text}:</span>
    <span>{value}</span>
  </div>
);

const ConfirmUpdate: FC = () => (
  <div className="flex justify-center items-center flex-col">
    <div className="relative flex items-start">
      <div className="flex h-5 items-center">
        <input
          id="comments"
          aria-describedby="comments-description"
          name="comments"
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
        />
      </div>
      <div className="ml-3 text-sm">
        <label htmlFor="comments" className="font-normal text-gray-700">
          我确认设备是空的或我已经有了恢复种子
        </label>
      </div>
    </div>
    <div className="py-4">
      <Button type="primary" size="xl" disabled>
        确定
      </Button>
    </div>
  </div>
);

export default function Firmware() {
  return (
    <div className="content">
      <h1 className="text-3xl text-center font-light py-4">安装固件</h1>
      <div className="flex flex-row-reverse">
        <div className="w-1/2">
          <Description text="状态" value="未连接" />
          <Description text="固件版本" value="3.1.0" />
          <Description text="蓝牙固件版本" value="2.0.4" />
          <Description text="设备类型" value="OneKey Touch" />
          <Description text="设备序列号" value="TC01WBD202207290806060000020" />
        </div>
      </div>
      <ReleaseInfo />
      <UploadFirmware />
      <ConfirmUpdate />
      <BootloaderTips />
    </div>
  );
}
