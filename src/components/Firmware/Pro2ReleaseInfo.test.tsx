import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import type { KnownDevice } from '@onekeyfe/hd-core';
import { serviceHardware } from '@/hardware';
import LOCALES from '@/locales';
import { store } from '@/store';
import type { DeviceTypeMap } from '@/types';
import { setDevice, setLocale, setReleaseMap } from '@/store/reducers/runtime';
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

const protocolV2Components = {
  bootloader: { target: 'BOOTLOADER', version: [1, 0, 0] },
  applicationP1: { target: 'APPLICATION_P1', version: [1, 0, 0] },
  applicationP2: { target: 'APPLICATION_P2', version: [1, 0, 0] },
  coprocessor: { target: 'COPROCESSOR', version: [1, 0, 0] },
  se01: { target: 'SE01', version: [1, 1, 8] },
  se02: { target: 'SE02', version: [1, 1, 7] },
  se03: { target: 'SE03', version: [1, 1, 7] },
  se04: { target: 'SE04', version: [1, 1, 7] },
};

const protocolV2InstallOrder = Object.keys(protocolV2Components);

const protocolV2ResourceSource = {
  archiveUrl: 'https://example.com/pro2-resource/resource.zip',
  archiveSha256: 'a'.repeat(64),
  archiveSize: 1024,
};

const baseProtocolV2Release = {
  required: false,
  url: '',
  fingerprint: '',
  version: [1, 0, 0],
  changelog: { 'zh-CN': '', 'en-US': '' },
  resource: '',
  resources: {
    source: protocolV2ResourceSource,
  },
};

const releaseMap = {
  pro2: {
    firmware: [],
    ble: [],
    'firmware-v1': [baseProtocolV2Release],
  },
} as unknown as DeviceTypeMap;

describe('Pro2ReleaseInfo startup resources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFirmwareUpdateV4.mockResolvedValue(undefined);
    store.dispatch(setLocale('en-US'));
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

  test('installs resources through one resource target', async () => {
    render(
      <Provider store={store}>
        <IntlProvider locale="en-US" messages={LOCALES['en-US']}>
          <Pro2ReleaseInfo />
        </IntlProvider>
      </Provider>
    );

    const customizeButton = screen.getByRole('button', { name: 'Customize' });
    expect(customizeButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('1 of 1 selected')).toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: /^Resources\b/i })
    ).not.toBeInTheDocument();
    userEvent.click(customizeButton);

    expect(customizeButton).toHaveAttribute('aria-expanded', 'true');
    const resources = screen.getByRole('checkbox', { name: /^Resources\b/i });
    expect(resources).toBeChecked();
    expect(
      screen.getByText(/download and install the latest compatible signed/i)
    ).toBeInTheDocument();
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
    expect(screen.getByText(/RESC device path/i)).toBeInTheDocument();
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
    const installButton = screen.getByRole('button', {
      name: 'Install Firmware',
    });
    userEvent.click(installButton);

    await waitFor(() => {
      const params = mockedFirmwareUpdateV4.mock.calls[0]?.[0];
      expect(params?.localResourceArchiveBinary).toBe(archiveBinary);
      expect(installButton).toBeEnabled();
    });
  });

  test('shows and selects all four remote SE targets for Pro2', async () => {
    store.dispatch(
      setReleaseMap({
        pro2: {
          ...releaseMap.pro2,
          'firmware-v1': [
            {
              ...baseProtocolV2Release,
              components: protocolV2Components,
              installOrder: protocolV2InstallOrder,
            },
          ],
        },
      } as unknown as DeviceTypeMap)
    );

    render(
      <Provider store={store}>
        <IntlProvider locale="en-US" messages={LOCALES['en-US']}>
          <Pro2ReleaseInfo />
        </IntlProvider>
      </Provider>
    );

    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === 'DIV' &&
          element.textContent?.startsWith('8 firmware components') === true
      )
    ).toBeInTheDocument();
    expect(screen.getByText('9 of 9 selected')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Customize' }));
    for (const label of ['SE01', 'SE02', 'SE03', 'SE04']) {
      expect(
        screen.getByRole('checkbox', { name: new RegExp(`^${label}\\b`) })
      ).toBeChecked();
    }

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
        targetsToUpdate: [
          'boot',
          'app_v1',
          'app_v2',
          'coprocessor',
          'se01',
          'se02',
          'se03',
          'se04',
          'resource',
        ],
      });
      expect(installButton).toBeEnabled();
    });
  });

  test('uses the Neo release and resource configuration for a Neo device', () => {
    store.dispatch(
      setReleaseMap({
        neo: {
          ...releaseMap.pro2,
          'firmware-v1': [
            {
              ...baseProtocolV2Release,
              components: {
                bootloader: protocolV2Components.bootloader,
                applicationP1: protocolV2Components.applicationP1,
                applicationP2: protocolV2Components.applicationP2,
                coprocessor: protocolV2Components.coprocessor,
                se01: protocolV2Components.se01,
                se02: protocolV2Components.se02,
              },
              installOrder: protocolV2InstallOrder.filter(
                (key) => key !== 'se03' && key !== 'se04'
              ),
            },
          ],
        },
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

    userEvent.click(screen.getByRole('button', { name: 'Customize' }));
    expect(
      screen.getByRole('checkbox', {
        name: /^Resources\b/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === 'DIV' &&
          element.textContent?.startsWith('6 firmware components') === true
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /^SE01\b/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /^SE02\b/ })).toBeChecked();
    expect(
      screen.queryByRole('checkbox', { name: /^SE03\b/ })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: /^SE04\b/ })
    ).not.toBeInTheDocument();

    userEvent.click(screen.getByRole('button', { name: 'Local Firmware' }));
    expect(screen.getByLabelText('Select CI ZIP')).toBeInTheDocument();
    expect(screen.getByText('SE01')).toBeInTheDocument();
    expect(screen.getByText('SE02')).toBeInTheDocument();
    expect(screen.queryByText('SE03')).not.toBeInTheDocument();
    expect(screen.queryByText('SE04')).not.toBeInTheDocument();
  });

  test('disables stale Pro2-only local files after switching to Neo', async () => {
    store.dispatch(
      setReleaseMap({
        ...releaseMap,
        neo: {
          ...releaseMap.pro2,
          'firmware-v1': [baseProtocolV2Release],
        },
      } as unknown as DeviceTypeMap)
    );

    render(
      <Provider store={store}>
        <IntlProvider locale="en-US" messages={LOCALES['en-US']}>
          <Pro2ReleaseInfo />
        </IntlProvider>
      </Provider>
    );

    userEvent.click(screen.getByRole('button', { name: 'Local Firmware' }));
    const firmwareInputs = Array.from(
      document.querySelectorAll<HTMLInputElement>(
        'input[type="file"][accept=".okpkg,.bin"]'
      )
    );
    userEvent.upload(
      firmwareInputs[6],
      new File([new Uint8Array([1])], 'se03.okpkg')
    );
    userEvent.click(
      screen.getByRole('checkbox', {
        name: /I confirm that the device is empty/i,
      })
    );
    const installButton = screen.getByRole('button', {
      name: 'Install Firmware',
    });
    expect(installButton).toBeEnabled();

    act(() => {
      store.dispatch(
        setDevice({
          connectId: 'neo-connect-id',
          deviceType: 'neo',
          features: { deviceType: 'neo' },
        } as unknown as KnownDevice)
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('SE03')).not.toBeInTheDocument();
      expect(installButton).toBeDisabled();
    });
    userEvent.click(installButton);
    expect(mockedFirmwareUpdateV4).not.toHaveBeenCalled();
  });

  test('renders safe Markdown without executable changelog HTML', () => {
    store.dispatch(
      setReleaseMap({
        pro2: {
          ...releaseMap.pro2,
          'firmware-v1': [
            {
              ...baseProtocolV2Release,
              changelog: {
                'zh-CN': '',
                'en-US': [
                  '## Safe heading',
                  '**Safe bold text**',
                  '[Safe link](https://onekey.so)',
                  '<img src=x onerror="window.__xss = true">',
                  '<svg onload="window.__xss = true"></svg>',
                  '<iframe srcdoc="<script>window.__xss = true</script>"></iframe>',
                  '[Bad link](javascript:alert(1))',
                  '[Encoded bad link](jav&#x61;script:alert(1))',
                ].join('\n\n'),
              },
            },
          ],
        },
      } as unknown as DeviceTypeMap)
    );

    render(
      <Provider store={store}>
        <IntlProvider locale="en-US" messages={LOCALES['en-US']}>
          <Pro2ReleaseInfo />
        </IntlProvider>
      </Provider>
    );

    expect(
      screen.getByRole('heading', { name: 'Safe heading' })
    ).toBeInTheDocument();
    expect(screen.getByText('Safe bold text').tagName).toBe('STRONG');
    expect(screen.getByRole('link', { name: 'Safe link' })).toHaveAttribute(
      'href',
      'https://onekey.so'
    );
    expect(screen.queryByRole('link', { name: 'Bad link' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Encoded bad link' })).toBeNull();

    const changelog = document.querySelector('.changelog-content');
    expect(changelog?.querySelector('img, svg, iframe, script')).toBeNull();
    for (const element of Array.from(changelog?.querySelectorAll('*') ?? [])) {
      for (const attribute of Array.from(element.attributes)) {
        expect(attribute.name).not.toMatch(/^on|^srcdoc$/i);
        expect(attribute.value).not.toMatch(/^\s*javascript:/i);
      }
    }
  });

  test('uses English release notes when the localized content is empty', () => {
    store.dispatch(setLocale('zh-CN'));
    store.dispatch(
      setReleaseMap({
        pro2: {
          ...releaseMap.pro2,
          'firmware-v1': [
            {
              ...baseProtocolV2Release,
              changelog: {
                'zh-CN': '',
                'en-US': 'English fallback notes',
              },
            },
          ],
        },
      } as unknown as DeviceTypeMap)
    );

    render(
      <Provider store={store}>
        <IntlProvider locale="zh-CN" messages={LOCALES['zh-CN']}>
          <Pro2ReleaseInfo />
        </IntlProvider>
      </Provider>
    );

    expect(screen.getByText('更新内容')).toBeInTheDocument();
    expect(screen.getByText('English fallback notes')).toBeInTheDocument();
  });

  test('renders a version-only changelog as provided', () => {
    store.dispatch(
      setReleaseMap({
        pro2: {
          ...releaseMap.pro2,
          'firmware-v1': [
            {
              ...baseProtocolV2Release,
              changelog: {
                'zh-CN': '1.0.0',
                'en-US': '1.0.0',
              },
            },
          ],
        },
      } as unknown as DeviceTypeMap)
    );

    render(
      <Provider store={store}>
        <IntlProvider locale="en-US" messages={LOCALES['en-US']}>
          <Pro2ReleaseInfo />
        </IntlProvider>
      </Provider>
    );

    expect(screen.getByText("What's new")).toBeInTheDocument();
    expect(document.querySelector('.changelog-content')).toHaveTextContent(
      '1.0.0'
    );
    expect(
      screen.queryByText('Release notes are not available for this version.')
    ).not.toBeInTheDocument();
  });

  test('shows an empty state only when all release notes are empty', () => {
    render(
      <Provider store={store}>
        <IntlProvider locale="en-US" messages={LOCALES['en-US']}>
          <Pro2ReleaseInfo />
        </IntlProvider>
      </Provider>
    );

    expect(
      screen.getByText('Release notes are not available for this version.')
    ).toBeInTheDocument();
    expect(document.querySelector('.changelog-content')).toBeNull();
  });
});
