import React, { FC } from 'react';
import ReconnectImage from '@/images/disconnect-device.svg';

const Container: FC<{ children: React.ReactElement }> = ({ children }) => (
  <div className="pt-5 flex flex-row items-center justify-center">
    <img src={ReconnectImage} className="self-center h-60" alt="" />
    {children}
  </div>
);

export default function BootloaderTip() {
  return (
    <Container>
      <div>
        <h3 className="font-medium py-2">请按以下步骤操作开始安装固件</h3>
        <ul>
          <li>1.断开设备连接</li>
          <li>2. 同时按住 和电源键，重启后先松开电源键</li>
          <li>3. 此时设备显示 bootloader 字样</li>
          <li>4. 重新连接设备</li>
        </ul>
      </div>
    </Container>
  );
}
