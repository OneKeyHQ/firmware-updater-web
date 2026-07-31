import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { serviceHardware } from '@/hardware';
import LOCALES from '@/locales';
import { store } from '@/store';
import { setDevice, setPageStatus } from '@/store/reducers/runtime';
import Dashboard from './Dashboard';

jest.mock('@/hardware', () => ({
  serviceHardware: {
    getSDKInstance: jest.fn(),
    searchDevices: jest.fn(),
    startDeviceScan: jest.fn(),
    getReleaseInfo: jest.fn(),
  },
}));

jest.mock('@/components', () => ({
  Firmware: () => null,
  Steps: () => null,
  SearchDevice: ({ onConnectDevice }: { onConnectDevice?: () => void }) => (
    <div>
      {onConnectDevice ? (
        <button type="button" onClick={onConnectDevice}>
          Connect device
        </button>
      ) : (
        'Searching for your device'
      )}
    </div>
  ),
}));

const mockedServiceHardware = serviceHardware as unknown as jest.Mocked<
  Pick<
    typeof serviceHardware,
    'getSDKInstance' | 'searchDevices' | 'startDeviceScan' | 'getReleaseInfo'
  >
>;

describe('Dashboard initialization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    store.dispatch(setDevice(null));
    store.dispatch(setPageStatus('initialize'));
    mockedServiceHardware.getReleaseInfo.mockResolvedValue(undefined);
  });

  test('shows the device connection UI when SDK initialization fails', async () => {
    mockedServiceHardware.getSDKInstance.mockRejectedValue(
      new Error('Hardware SDK initialization failed')
    );

    render(
      <Provider store={store}>
        <IntlProvider locale="en-US" messages={LOCALES['en-US']}>
          <Dashboard />
        </IntlProvider>
      </Provider>
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Connect device' })
      ).toBeInTheDocument();
    });
  });
});
