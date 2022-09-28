import React, { FC } from 'react';
import { useIntl } from 'react-intl';
import ReconnectImage from '@/images/disconnect-device.svg';

const Container: FC<{ children: React.ReactElement }> = ({ children }) => (
  <div className="pt-5 flex flex-row items-center justify-center">
    <img src={ReconnectImage} className="self-center h-60" alt="" />
    {children}
  </div>
);

export default function BootloaderTip() {
  const intl = useIntl();
  return (
    <Container>
      <div>
        <h3 className="text-base font-medium text-gray-500 py-2">
          {intl.formatMessage({ id: 'TR_FIRMWARE_INSTALL_TIPS_TITLE' })}
        </h3>
        <ul>
          <li className="text-sm font-normal text-gray-500 py-2">
            1.{' '}
            {intl.formatMessage({
              id: 'TR_MINI_FIRMWARE_INSTALL_TIPS_1',
            })}
          </li>
          <li className="text-sm font-normal text-gray-500 py-2">
            2.{' '}
            {intl.formatMessage({
              id: 'TR_MINI_FIRMWARE_INSTALL_TIPS_2',
            })}
          </li>
          <li className="text-sm font-normal text-gray-500 py-2">
            3.{' '}
            {intl.formatMessage({
              id: 'TR_MINI_FIRMWARE_INSTALL_TIPS_3',
            })}
          </li>
        </ul>
      </div>
    </Container>
  );
}
