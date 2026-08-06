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
      stable: [
        'images',
        'animation',
        'wallpaper',
        'translations',
        'roobert',
        'noto',
        'firmware_logo',
      ].map((type) => ({
        type,
        url: `https://example.com/${type}.okpkg`,
        size: 1,
        fileHash: '1'.repeat(64),
        headerHash: '2'.repeat(128),
      })),
      boot: {
        required: false,
        target: 'RES',
        files: [
          {
            name: 'boot_resource.okpkg',
            url: 'https://example.com/loaders/bootloader/boot_resource.okpkg',
            devicePath: 'vol0:/loaders/bootloader/boot_resource.okpkg',
            size: 1_822_594,
            fileHash: '3'.repeat(64),
          },
          {
            name: 'params.okpkg',
            url: 'https://example.com/loaders/rom/params.okpkg',
            devicePath: 'vol0:/loaders/rom/params.okpkg',
            size: 49_869,
            fileHash: '4'.repeat(64),
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
      name: /2 startup resource packages/i,
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
        targetsToUpdate: ['resource', 'boot_resources'],
      });
      expect(installButton).toBeEnabled();
    });
  });

  test('loads all nine local resource packages from a directory', async () => {
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

    const packageNames = [
      'firmware_logo-resource-build.okpkg',
      'images-resource-build.okpkg',
      'animation-resource-build.okpkg',
      'wallpaper-resource-build.okpkg',
      'translations-resource-build.okpkg',
      'roobert-resource-build.okpkg',
      'noto-resource-build.okpkg',
      'boot_resource-resource-build.okpkg',
      'params-resource-build.okpkg',
    ];
    const packageFiles = packageNames.map((name) => {
      const file = new File([name], name);
      Object.defineProperty(file, 'webkitRelativePath', {
        value: `pro2-resource/${name}`,
      });
      Object.defineProperty(file, 'arrayBuffer', {
        value: () => Promise.resolve(new ArrayBuffer(1)),
      });
      return file;
    });

    userEvent.upload(
      screen.getByLabelText('Choose resource folder'),
      packageFiles
    );

    expect(
      await screen.findByText('pro2-resource: all 9 packages matched')
    ).toBeInTheDocument();
    for (const name of packageNames) {
      expect(screen.getByText(new RegExp(name))).toBeInTheDocument();
    }

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
      expect(params?.resourceFiles).toHaveLength(9);
      expect(params?.resourceFiles?.map((file) => file.devicePath)).toEqual(
        expect.arrayContaining([
          'vol0:/bundles/firmware_logo.okpkg',
          'vol0:/bundles/images/images.okpkg',
          'vol0:/bundles/images/animation.okpkg',
          'vol0:/bundles/images/wallpaper.okpkg',
          'vol0:/bundles/translations/translations.okpkg',
          'vol0:/bundles/font/roobert.okpkg',
          'vol0:/bundles/font/noto.okpkg',
          'vol0:/loaders/bootloader/boot_resource.okpkg',
          'vol0:/loaders/rom/params.okpkg',
        ])
      );
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
        deviceType: 'neo',
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
        name: /2 startup resource packages/i,
      })
    ).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Local Firmware' }));
    expect(screen.getByLabelText('Choose resource folder')).toBeInTheDocument();
  });
});
