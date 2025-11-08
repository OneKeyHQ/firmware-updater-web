import { FC } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Button } from '@onekeyfe/ui-components';
import ConnectImage from '@/images/connect-device.svg';

interface SearchDeviceProps {
  onConnectDevice?: () => void;
  isConnecting?: boolean;
}

const SearchDevice: FC<SearchDeviceProps> = ({
  onConnectDevice,
  isConnecting,
}) => {
  const intl = useIntl();
  const pageStatus = useSelector(
    (state: RootState) => state.runtime.pageStatus
  );

  return (
    <div className="flex flex-col justify-center items-center py-4">
      <h1 className="text-3xl font-normal">
        {intl.formatMessage({ id: 'TR_CONNECT_HEADING' })}
      </h1>
      <img src={ConnectImage} className="self-center h-60" alt="" />

      {onConnectDevice ? (
        <>
          <p className="text-base font-medium text-gray-700 mb-6 text-center max-w-md">
            {intl.formatMessage({ id: 'TR_WEBUSB_REQUIRES_USER_ACTION' })}
          </p>
          <div className="relative mb-6">
            {/* Pulsing background effect - only show when not connecting */}
            {!isConnecting && (
              <div className="absolute -inset-1 bg-gradient-to-r from-brand-500 to-brand-600 rounded-lg blur opacity-30 animate-pulse" />
            )}
            {/* Button */}
            <Button
              type="primary"
              size="xl"
              onClick={onConnectDevice}
              loading={isConnecting}
              disabled={isConnecting}
              className="relative shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:opacity-60"
            >
              <span className="flex items-center gap-2 text-lg font-semibold">
                {!isConnecting && (
                  <svg
                    className="w-6 h-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.5 3v3M14.5 3v3"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7 6.5h10v4.25a4.75 4.75 0 01-4.75 4.75h-.5A4.75 4.75 0 017 10.75V6.5z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 15.5v4.5m-2.5 0h5"
                    />
                  </svg>
                )}
                {isConnecting
                  ? intl.formatMessage({ id: 'TR_CONNECTING' })
                  : intl.formatMessage({ id: 'TR_CONNECT_DEVICE' })}
              </span>
            </Button>
          </div>
          <p className="text-sm font-normal text-gray-500 mt-2 max-w-md text-center">
            {intl.formatMessage({ id: 'TR_WEBUSB_WILL_PROMPT_PERMISSION' })}
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-normal text-gray-500">
            {intl.formatMessage({ id: 'TR_MAKE_SURE_IT_IS_WELL_CONNECTED' })}
            {intl.formatMessage({ id: 'TR_SEARCHING_FOR_YOUR_DEVICE' })}
          </p>
          <p className="text-xs font-normal text-gray-500 py-3">
            {intl.formatMessage({ id: 'TR_USING_WEBUSB_MODE' })}
          </p>
          {pageStatus === 'search-timeout' ? (
            <>
              <p className="text-sm font-normal text-gray-500">
                {intl.formatMessage({ id: 'TR_SEARCHING_TAKES_TOO_LONG' })}
              </p>
              <div className="flex flex-col items-start justify-start">
                <p className="text-sm font-normal text-gray-500 pt-4 pb-1">
                  • {intl.formatMessage({ id: 'TR_CHECK_BRIDGE' })}
                </p>
                <p className="text-sm font-normal text-gray-500 pt-4 pb-1">
                  • {intl.formatMessage({ id: 'TR_ALLOW_WEBUSB_PERMISSION' })}
                </p>
                <p className="text-sm font-normal text-gray-500 py-1">
                  • {intl.formatMessage({ id: 'TR_REFRESH_INSTRUCTION' })}
                </p>
                <p className="text-sm font-normal text-gray-500 py-1">
                  • {intl.formatMessage({ id: 'TR_ANOTHER_CABLE_INSTRUCTION' })}
                </p>
                <p className="text-sm font-normal text-gray-500 py-1">
                  • {intl.formatMessage({ id: 'TR_LAST_RESORT_INSTRUCTION' })}
                  <a className="text-brand-500" href="https://help.onekey.so">
                    {intl.formatMessage({
                      id: 'TR_CONTACT_ONEKEY_SUPPORT_LINK',
                    })}
                  </a>
                </p>
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
};

export default SearchDevice;
