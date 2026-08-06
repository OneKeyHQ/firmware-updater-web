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
      stable: [],
      boot: {
        required: false,
        target: 'RES',
        files: [
          {
            url: 'https://example.com/bootloader_crest.bin',
            devicePath:
              'vol0:/assets/loaders/boot.staging/graphics/bootloader_crest.bin',
            size: 1_900_291,
            fileHash: '1'.repeat(64),
          },
        ],
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

  test('keeps startup resources opt-in and forwards the selected target', async () => {
    render(
      <Provider store={store}>
        <IntlProvider locale="en-US" messages={LOCALES['en-US']}>
          <Pro2ReleaseInfo />
        </IntlProvider>
      </Provider>
    );

    const startupResources = screen.getByRole('checkbox', {
      name: /Startup resource files/i,
    });
    expect(startupResources).not.toBeChecked();

    userEvent.click(startupResources);
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
        targetsToUpdate: ['boot_resources'],
      });
      expect(installButton).toBeEnabled();
    });
  });
});
