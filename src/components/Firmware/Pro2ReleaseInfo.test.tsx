import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import type { CoreApi, KnownDevice } from '@onekeyfe/hd-core';
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
    getSDKInstance: jest.fn(),
  },
}));

const mockedFirmwareUpdateV4 =
  // eslint-disable-next-line @typescript-eslint/unbound-method
  serviceHardware.firmwareUpdateV4 as jest.MockedFunction<
    typeof serviceHardware.firmwareUpdateV4
  >;
const mockedGetSDKInstance =
  // eslint-disable-next-line @typescript-eslint/unbound-method
  serviceHardware.getSDKInstance as jest.MockedFunction<
    typeof serviceHardware.getSDKInstance
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
        manifestUrl: 'https://example.com/pro2-resource/manifest.json',
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
        targetsToUpdate: ['resource', 'boot_resources'],
      });
      expect(installButton).toBeEnabled();
    });
  });

  test('offers the CI ZIP and extracted-folder manifest flows', () => {
    render(
      <Provider store={store}>
        <IntlProvider locale="en-US" messages={LOCALES['en-US']}>
          <Pro2ReleaseInfo />
        </IntlProvider>
      </Provider>
    );

    userEvent.click(screen.getByRole('button', { name: 'Local Firmware' }));
    expect(screen.getByText('Select CI ZIP')).toBeInTheDocument();
    expect(screen.getByText('Select extracted folder')).toBeInTheDocument();
    expect(screen.getByText(/manifest\.json is required/i)).toBeInTheDocument();
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

    const packagePaths = [
      'bundles/firmware_logo-resource-build.okpkg',
      'bundles/images/images-resource-build.okpkg',
      'bundles/images/animation-resource-build.okpkg',
      'bundles/images/wallpaper-resource-build.okpkg',
      'bundles/translations/translations-resource-build.okpkg',
      'bundles/font/roobert-resource-build.okpkg',
      'bundles/font/noto-resource-build.okpkg',
      'loaders/bootloader/boot_resource-resource-build.okpkg',
      'loaders/rom/params-resource-build.okpkg',
    ];
    const manifest = {
      schema: 1,
      files: packagePaths.map((archivePath) => ({
        archive_path: archivePath,
      })),
    };
    const preparedFiles = packagePaths.map((archivePath) => ({
      binary: new ArrayBuffer(1),
      devicePath: `vol0:/${archivePath}`,
      size: 1,
      fileHash: '1'.repeat(64),
    }));
    mockedGetSDKInstance.mockResolvedValue({
      prepareProtocolV2ResourceFiles: jest.fn().mockReturnValue(preparedFiles),
    } as unknown as CoreApi);
    const manifestFile = new File([JSON.stringify(manifest)], 'manifest.json');
    Object.defineProperty(manifestFile, 'webkitRelativePath', {
      value: 'pro2-resource/manifest.json',
    });
    Object.defineProperty(manifestFile, 'text', {
      value: () => Promise.resolve(JSON.stringify(manifest)),
    });
    const packageFiles = packagePaths.map((path) => {
      const name = path.split('/').pop() ?? path;
      const file = new File([name], name);
      Object.defineProperty(file, 'webkitRelativePath', {
        value: `pro2-resource/${path}`,
      });
      Object.defineProperty(file, 'arrayBuffer', {
        value: () => Promise.resolve(new ArrayBuffer(1)),
      });
      return file;
    });

    userEvent.upload(screen.getByLabelText('Select extracted folder'), [
      manifestFile,
      ...packageFiles,
    ]);

    expect(
      await screen.findByText('pro2-resource · 9 packages')
    ).toBeInTheDocument();

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
      expect(params?.resourceFiles).toEqual(preparedFiles);
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
    expect(
      screen.getByLabelText('Select extracted folder')
    ).toBeInTheDocument();
    expect(screen.getByText('SE01')).toBeInTheDocument();
    expect(screen.getByText('SE02')).toBeInTheDocument();
    expect(screen.queryByText('SE03')).not.toBeInTheDocument();
    expect(screen.queryByText('SE04')).not.toBeInTheDocument();
  });
});
