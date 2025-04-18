import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { Alert } from '@onekeyfe/ui-components';
import { RootState } from '@/store';
import { setSelectedUploadType, setCurrentTab } from '@/store/reducers/runtime';

import V3UpdateTable from './V3UpdateTable';
import V3UploadLocalFirmware from './V3UploadLocalFirmware';

export type V3TabType = 'v3-remote' | 'v3-local';

const V3ReleaseInfo = () => {
  const intl = useIntl();
  const currentTab = useSelector(
    (state: RootState) => state.runtime.currentTab
  ) as V3TabType;
  const dispatch = useDispatch();
  const selectedV3Components = useSelector(
    (state: RootState) => state.runtime.selectedV3Components
  );
  const device = useSelector((state: RootState) => state.runtime.device);

  const [tabs] = useState<{ name: string; key: V3TabType }[]>([
    {
      name: intl.formatMessage({ id: 'TR_REMOTE_FIRMWARE' }) || '固件更新',
      key: 'v3-remote',
    },
    {
      name: intl.formatMessage({ id: 'TR_LOCAL_FIRMWARE' }) || '本地固件',
      key: 'v3-local',
    },
  ]);

  // Check if we have a connected device
  const isDeviceConnected = !!device?.features;
  // Handle tab changes
  const handleTabChange = (tabKey: V3TabType) => {
    console.log('Switching to tab:', tabKey);
    dispatch(setCurrentTab(tabKey));
    dispatch(setSelectedUploadType(null));
  };

  // Helper to check if the current tab is valid
  const isValidTab = currentTab === 'v3-remote' || currentTab === 'v3-local';

  // Set default tab if current tab is not valid
  useEffect(() => {
    if (!isValidTab) {
      dispatch(setCurrentTab('v3-remote'));
    }
  }, [dispatch, isValidTab]);

  // Function to create components without JSX
  const renderAlert = (
    title: string,
    type: 'error' | 'success' | 'info' | 'warning'
  ) => React.createElement(Alert, { title, type });

  return (
    <div>
      <div className="hidden sm:block">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.name}
                type="button"
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  currentTab === tab.key
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                aria-current={tab.key === currentTab ? 'page' : undefined}
                onClick={() => handleTabChange(tab.key)}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Display device status messages or component content */}
      {!isDeviceConnected && (
        <div className="my-4 p-4 bg-gray-100 rounded-md">
          {renderAlert(
            intl.formatMessage({ id: 'TR_DEVICE_DISCONNECT' }),
            'info'
          )}
        </div>
      )}

      <div className="mt-4">
        {currentTab === 'v3-remote' && <V3UpdateTable />}
        {currentTab === 'v3-local' && <V3UploadLocalFirmware />}
      </div>

      {selectedV3Components.length > 0 && (
        <div className="mb-4">
          {renderAlert(
            intl.formatMessage({ id: 'TR_WARNING_BEFORE_INSTALL' }),
            'warning'
          )}
        </div>
      )}
    </div>
  );
};

export default V3ReleaseInfo;
