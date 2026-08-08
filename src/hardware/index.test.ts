import JSZip from 'jszip';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

import type { CoreApi, KnownDevice } from '@onekeyfe/hd-core';
import type { DeviceTypeMap } from '@/types';
import { store } from '@/store';
import { setDevice, setReleaseMap } from '@/store/reducers/runtime';
import { getHardwareSDKInstance } from './instance';
import { serviceHardware } from '.';

jest.mock('./instance', () => ({
  getHardwareSDKInstance: jest.fn(),
}));

const mockedGetHardwareSDKInstance =
  getHardwareSDKInstance as jest.MockedFunction<typeof getHardwareSDKInstance>;

const pro2Device = {
  connectId: 'pro2-connect-id',
  deviceType: 'pro2',
  connectProtocol: 'V2',
  features: { deviceType: 'pro2' },
} as unknown as KnownDevice;

const neoDevice = {
  connectId: 'neo-connect-id',
  deviceType: 'neo',
  connectProtocol: 'V2',
  features: { deviceType: 'neo' },
} as unknown as KnownDevice;

const archiveUrl = 'https://example.com/pro2-resource/resource.zip';
const resourceManifest = {
  schema: 1,
  files: [
    {
      archive_path: 'bundles/images/images.okpkg',
      device_path: 'vol0:/bundles/images/images.okpkg',
    },
  ],
};
const preparedResourceFiles = [
  {
    binary: new Uint8Array([1]).buffer,
    devicePath: 'vol0:/bundles/images/images.okpkg',
    size: 1,
    fileHash: 'a'.repeat(64),
  },
];

let resourceArchiveBinary: ArrayBuffer;
let resourceArchive: {
  archiveUrl: string;
  archiveSha256: string;
  archiveSize: number;
};

function mockRemoteResourceDownloads() {
  return jest.spyOn(global, 'fetch').mockImplementation((url) => {
    if (url === archiveUrl) {
      return Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(resourceArchiveBinary),
      } as Response);
    }
    return Promise.reject(new Error(`Unexpected URL: ${String(url)}`));
  });
}

describe('ServiceHardware Pro2 firmware update', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    const zip = new JSZip();
    zip.file('manifest.json', JSON.stringify(resourceManifest));
    zip.file(resourceManifest.files[0].archive_path, new Uint8Array([1]));
    resourceArchiveBinary = (await zip.generateAsync({ type: 'uint8array' }))
      .buffer;
    resourceArchive = {
      archiveUrl,
      archiveSha256: bytesToHex(sha256(new Uint8Array(resourceArchiveBinary))),
      archiveSize: resourceArchiveBinary.byteLength,
    };
    store.dispatch(setDevice(pro2Device));
    store.dispatch(
      setReleaseMap({
        pro2: { resources: { source: resourceArchive } },
        neo: { resources: { source: resourceArchive } },
      } as unknown as DeviceTypeMap)
    );
    window.scrollTo = jest.fn();
  });

  afterEach(() => {
    store.dispatch(setDevice(null));
    jest.restoreAllMocks();
  });

  test('routes Pro2 devices to firmwareUpdateV4', async () => {
    const updateSpy = jest
      .spyOn(serviceHardware, 'firmwareUpdateV4')
      .mockResolvedValue();

    await serviceHardware.firmwareUpdate();

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(mockedGetHardwareSDKInstance).not.toHaveBeenCalled();
  });

  test('routes Neo devices to firmwareUpdateV4', async () => {
    store.dispatch(setDevice(neoDevice));
    const updateSpy = jest
      .spyOn(serviceHardware, 'firmwareUpdateV4')
      .mockResolvedValue();

    await serviceHardware.firmwareUpdate();

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(mockedGetHardwareSDKInstance).not.toHaveBeenCalled();
  });

  test('keeps both legacy and Pro2 devices returned by SDK discovery', async () => {
    const touchDevice = {
      connectId: 'touch-connect-id',
      deviceType: 'touch',
      features: { deviceType: 'touch' },
    };
    const searchDevices = jest.fn().mockResolvedValue({
      success: true,
      payload: [pro2Device, touchDevice],
    });
    mockedGetHardwareSDKInstance.mockResolvedValue({
      searchDevices,
      on: jest.fn(),
    } as unknown as CoreApi);

    const result = await serviceHardware.searchDevices();

    expect(searchDevices).toHaveBeenCalledWith();
    expect(result).toEqual({
      success: true,
      payload: [pro2Device, touchDevice],
    });
  });

  test('reuses an authorized OneKey WebUSB device before opening the picker', async () => {
    const authorizedDevice = {
      vendorId: 0x1209,
      productId: 0x4f4c,
    };
    const getDevices = jest.fn().mockResolvedValue([authorizedDevice]);
    const requestDevice = jest.fn();
    const previousUsb = Object.getOwnPropertyDescriptor(navigator, 'usb');
    Object.defineProperty(navigator, 'usb', {
      configurable: true,
      value: { getDevices, requestDevice },
    });

    try {
      await expect(serviceHardware.promptWebDeviceAccess()).resolves.toBe(
        authorizedDevice
      );
      expect(getDevices).toHaveBeenCalledTimes(1);
      expect(requestDevice).not.toHaveBeenCalled();
    } finally {
      if (previousUsb) {
        Object.defineProperty(navigator, 'usb', previousUsb);
      } else {
        delete (navigator as { usb?: unknown }).usb;
      }
    }
  });

  test('starts the remote Protocol V2 update for the connected Pro2', async () => {
    const fetchSpy = mockRemoteResourceDownloads();
    const firmwareUpdateV4 = jest.fn().mockResolvedValue({
      success: true,
      payload: {},
    });
    mockedGetHardwareSDKInstance.mockResolvedValue({
      firmwareUpdateV4,
      prepareProtocolV2ResourceFiles: jest
        .fn()
        .mockReturnValue(preparedResourceFiles),
      on: jest.fn(),
    } as unknown as CoreApi);

    await serviceHardware.firmwareUpdateV4();

    expect(firmwareUpdateV4).toHaveBeenCalledWith('pro2-connect-id', {
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
      resourceFiles: preparedResourceFiles,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(archiveUrl);
    expect(store.getState().firmware.resultType).toBe('success');
  });

  test('passes selected Protocol V2 targets to the SDK', async () => {
    mockRemoteResourceDownloads();
    const firmwareUpdateV4 = jest.fn().mockResolvedValue({
      success: true,
      payload: {},
    });
    mockedGetHardwareSDKInstance.mockResolvedValue({
      firmwareUpdateV4,
      prepareProtocolV2ResourceFiles: jest
        .fn()
        .mockReturnValue(preparedResourceFiles),
      on: jest.fn(),
    } as unknown as CoreApi);

    await serviceHardware.firmwareUpdateV4({
      platform: 'web',
      targetsToUpdate: ['app_v1', 'resource'],
      resourceFiles: preparedResourceFiles,
    });

    expect(firmwareUpdateV4).toHaveBeenCalledWith('pro2-connect-id', {
      platform: 'web',
      targetsToUpdate: ['app_v1', 'resource'],
      resourceFiles: preparedResourceFiles,
    });
  });

  test('updates Neo resources without unsupported SE03 and SE04 targets', async () => {
    mockRemoteResourceDownloads();
    store.dispatch(setDevice(neoDevice));
    const firmwareUpdateV4 = jest.fn().mockResolvedValue({
      success: true,
      payload: {},
    });
    mockedGetHardwareSDKInstance.mockResolvedValue({
      firmwareUpdateV4,
      prepareProtocolV2ResourceFiles: jest
        .fn()
        .mockReturnValue(preparedResourceFiles),
      on: jest.fn(),
    } as unknown as CoreApi);

    await serviceHardware.firmwareUpdateV4();

    expect(firmwareUpdateV4).toHaveBeenCalledWith('neo-connect-id', {
      platform: 'web',
      targetsToUpdate: [
        'boot',
        'app_v1',
        'app_v2',
        'coprocessor',
        'se01',
        'se02',
        'resource',
      ],
      resourceFiles: preparedResourceFiles,
    });
  });
});
