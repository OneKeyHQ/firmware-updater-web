import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    stopScan: jest.fn(),
    promptWebDeviceAccess: jest.fn(),
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
    | 'getSDKInstance'
    | 'searchDevices'
    | 'startDeviceScan'
    | 'stopScan'
    | 'promptWebDeviceAccess'
    | 'getReleaseInfo'
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

  test('requires an explicit choice when several authorized devices are found', async () => {
    mockedServiceHardware.getSDKInstance.mockResolvedValue({} as never);
    mockedServiceHardware.searchDevices.mockResolvedValue({
      success: true,
      payload: [
        { path: 'first-device', connectId: 'first-device' },
        { path: 'second-device', connectId: 'second-device' },
      ],
    } as never);

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
    expect(mockedServiceHardware.startDeviceScan).not.toHaveBeenCalled();
    expect(store.getState().runtime.device).toBeNull();
  });

  test('shows the USB identity conflict found during initial discovery', async () => {
    mockedServiceHardware.getSDKInstance.mockResolvedValue({} as never);
    mockedServiceHardware.searchDevices.mockResolvedValue({
      success: false,
      payload: { error: 'Disconnect other devices and retry.' },
    } as never);

    render(
      <Provider store={store}>
        <IntlProvider locale="en-US" messages={LOCALES['en-US']}>
          <Dashboard />
        </IntlProvider>
      </Provider>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Disconnect other devices and retry.'
    );
    expect(mockedServiceHardware.startDeviceScan).not.toHaveBeenCalled();
  });

  test('connects the device chosen in WebUSB instead of the first scan result', async () => {
    mockedServiceHardware.getSDKInstance.mockResolvedValue({} as never);
    mockedServiceHardware.searchDevices.mockResolvedValue({
      success: true,
      payload: [],
    } as never);
    mockedServiceHardware.promptWebDeviceAccess.mockResolvedValue({
      vendorId: 0x1209,
      productId: 0x4f4c,
      serialNumber: 'selected-device',
    });
    mockedServiceHardware.startDeviceScan.mockImplementation((callback) => {
      callback({
        success: true,
        payload: [{ path: 'first-device', connectId: 'first-device' }],
      } as never);
      expect(store.getState().runtime.device).toBeNull();
      callback({
        success: true,
        payload: [
          { path: 'first-device', connectId: 'first-device' },
          { path: 'selected-device', connectId: 'selected-device' },
        ],
      } as never);
      return Promise.resolve(undefined);
    });

    render(
      <Provider store={store}>
        <IntlProvider locale="en-US" messages={LOCALES['en-US']}>
          <Dashboard />
        </IntlProvider>
      </Provider>
    );

    fireEvent.click(
      await screen.findByRole('button', { name: 'Connect device' })
    );

    await waitFor(() => {
      expect(store.getState().runtime.device?.path).toBe('selected-device');
    });
    expect(mockedServiceHardware.stopScan).toHaveBeenCalled();
  });

  test('shows the disconnect instruction when USB identities collide', async () => {
    mockedServiceHardware.getSDKInstance.mockResolvedValue({} as never);
    mockedServiceHardware.searchDevices.mockResolvedValue({
      success: true,
      payload: [],
    } as never);
    mockedServiceHardware.promptWebDeviceAccess.mockRejectedValue(
      new Error('Disconnect other devices and retry.')
    );

    render(
      <Provider store={store}>
        <IntlProvider locale="en-US" messages={LOCALES['en-US']}>
          <Dashboard />
        </IntlProvider>
      </Provider>
    );

    fireEvent.click(
      await screen.findByRole('button', { name: 'Connect device' })
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Disconnect other devices and retry.'
    );
  });
});
