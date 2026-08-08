import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import type { KnownDevice } from '@onekeyfe/hd-core';
import { serviceHardware } from '@/hardware';
import LOCALES from '@/locales';
import { store } from '@/store';
import type { DeviceTypeMap } from '@/types';
import { setDevice, setReleaseMap } from '@/store/reducers/runtime';
import Pro2ReleaseInfo from './Pro2ReleaseInfo';

jest.mock('@onekeyfe/ui-components', () => ({
  Alert: () => null,
  Button: ({
    children,
    disabled,
    onClick,
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) =>
    jest
      .requireActual('react')
      .createElement('button', { type: 'button', disabled, onClick }, children),
}));

jest.mock('@/hardware', () => ({
  serviceHardware: {
    firmwareUpdateV4: jest.fn(),
  },
}));

const mockedFirmwareUpdateV4 =
  // eslint-disable-next-line @typescript-eslint/unbound-method
  serviceHardware.firmwareUpdateV4 as jest.MockedFunction<
    typeof serviceHardware.firmwareUpdateV4
  >;
const releaseMap = {
  pro2: {
    firmware: [],
    ble: [],
    'firmware-v1': [
      {
        required: false,
        url: '',
        fingerprint: '',
        version: [1, 0, 0],
        changelog: { 'zh-CN': '', 'en-US': '' },
        resource: '',
      },
    ],
    resources: {
      source: {
        archiveUrl: 'https://example.com/pro2-resource/resource.zip',
        archiveSha256: 'a'.repeat(64),
        archiveSize: 1024,
      },
    },
  },
} as unknown as DeviceTypeMap;

describe('Pro2ReleaseInfo startup resources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFirmwareUpdateV4.mockResolvedValue(undefined);
    store.dispatch(setReleaseMap(releaseMap));
    store.dispatch(
      setDevice({
        connectId: 'pro2-connect-id',
        deviceType: 'pro2',
        features: { deviceType: 'pro2' },
      } as unknown as KnownDevice)
    );
  });

  afterEach(() => {
    cleanup();
    store.dispatch(setDevice(null));
    store.dispatch(setReleaseMap({} as DeviceTypeMap));
  });

  test('installs all nine resource packages through one resource target', async () => {
    render(
      <Provider store={store}>
        <IntlProvider locale="en-US" messages={LOCALES['en-US']}>
          <Pro2ReleaseInfo />
        </IntlProvider>
      </Provider>
    );

    const resources = screen.getByRole('checkbox', {
      name: /9 resource packages/i,
    });
    expect(resources).toBeChecked();
    expect(
      screen.queryByText(/not installed by default/i)
    ).not.toBeInTheDocument();

    userEvent.click(
      screen.getByRole('checkbox', {
        name: /I confirm that the device is empty/i,
      })
    );
    const installButton = screen.getByRole('button', {
      name: 'Install Firmware',
    });
    userEvent.click(installButton);

    await waitFor(() => {
      expect(mockedFirmwareUpdateV4).toHaveBeenCalledWith({
        platform: 'web',
        targetsToUpdate: ['resource'],
      });
      expect(installButton).toBeEnabled();
    });
  });

  test('offers only the exact CI ZIP flow for local resources', () => {
    render(
      <Provider store={store}>
        <IntlProvider locale="en-US" messages={LOCALES['en-US']}>
          <Pro2ReleaseInfo />
        </IntlProvider>
      </Provider>
    );

    userEvent.click(screen.getByRole('button', { name: 'Local Firmware' }));
    expect(screen.getByText('Select CI ZIP')).toBeInTheDocument();
    expect(
      screen.queryByText('Select extracted folder')
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/exact hardware CI resource ZIP/i)
    ).toBeInTheDocument();
  });

  test('passes the original local resource ZIP into the Plan workflow', async () => {
    render(
      <Provider store={store}>
        <IntlProvider locale="en-US" messages={LOCALES['en-US']}>
          <Pro2ReleaseInfo />
        </IntlProvider>
      </Provider>
    );

    userEvent.click(
      screen.getByRole('button', {
        name: 'Local Firmware',
      })
    );

    const archiveBinary = new Uint8Array([1, 2, 3]).buffer;
    const zipFile = new File([archiveBinary], 'pro2-resource.zip', {
      type: 'application/zip',
    });
    Object.defineProperty(zipFile, 'arrayBuffer', {
      value: () => Promise.resolve(archiveBinary),
    });
    userEvent.upload(screen.getByLabelText('Select CI ZIP'), zipFile);
    expect(await screen.findByText(/pro2-resource\.zip/)).toBeInTheDocument();

    userEvent.click(
      screen.getByRole('checkbox', {
        name: /I confirm that the device is empty/i,
      })
    );
    userEvent.click(
      screen.getByRole('button', {
        name: 'Install Firmware',
      })
    );

    await waitFor(() => {
      const params = mockedFirmwareUpdateV4.mock.calls[0]?.[0];
      expect(params?.localResourceArchiveBinary).toBe(archiveBinary);
    });
  });

  test('uses the Neo release and resource configuration for a Neo device', () => {
    store.dispatch(
      setReleaseMap({
        neo: releaseMap.pro2,
      } as unknown as DeviceTypeMap)
    );
    store.dispatch(
      setDevice({
        connectId: 'neo-connect-id',
        features: { deviceType: 'neo' },
      } as unknown as KnownDevice)
    );

    render(
      <Provider store={store}>
        <IntlProvider locale="en-US" messages={LOCALES['en-US']}>
          <Pro2ReleaseInfo />
        </IntlProvider>
      </Provider>
    );

    expect(
      screen.getByRole('checkbox', {
        name: /9 resource packages/i,
      })
    ).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Local Firmware' }));
    expect(screen.getByLabelText('Select CI ZIP')).toBeInTheDocument();
    expect(screen.getByText('SE01')).toBeInTheDocument();
    expect(screen.getByText('SE02')).toBeInTheDocument();
    expect(screen.queryByText('SE03')).not.toBeInTheDocument();
    expect(screen.queryByText('SE04')).not.toBeInTheDocument();
  });
});
