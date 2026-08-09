import JSZip from 'jszip';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

import { prepareFirmwareUpdateV4MemoryHost } from '@onekeyfe/hd-core';
import { EFirmwareType } from '@onekeyfe/hd-shared';
import type {
  CoreApi,
  FirmwareUpdatePlan,
  KnownDevice,
} from '@onekeyfe/hd-core';
import type { DeviceTypeMap } from '@/types';
import { store } from '@/store';
import { setDevice, setReleaseMap } from '@/store/reducers/runtime';
import { getHardwareSDKInstance } from './instance';
import { serviceHardware } from '.';

jest.mock('./instance', () => ({
  getHardwareSDKInstance: jest.fn(),
}));

jest.mock('@onekeyfe/hd-core', () => ({
  ...jest.requireActual('@onekeyfe/hd-core'),
  prepareFirmwareUpdateV4MemoryHost: jest.fn(),
}));

const mockedGetHardwareSDKInstance =
  getHardwareSDKInstance as jest.MockedFunction<typeof getHardwareSDKInstance>;
const mockedPrepareFirmwareUpdateV4MemoryHost =
  prepareFirmwareUpdateV4MemoryHost as jest.MockedFunction<
    typeof prepareFirmwareUpdateV4MemoryHost
  >;

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
let resourceArchiveBinary: ArrayBuffer;
let resourceArchive: {
  archiveUrl: string;
  archiveSha256: string;
  archiveSize: number;
};
let firmwareUpdatePlan: FirmwareUpdatePlan;
let releaseMemoryHost: jest.Mock;

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
    firmwareUpdatePlan = {
      schemaVersion: 2,
      planDigest: 'a'.repeat(64),
      executor: 'v4',
      deviceIdentity: 'pro2-device-id',
      deviceModel: 'pro2',
      firmwareType: EFirmwareType.Universal,
      platform: 'web',
      targetsToUpdate: ['resource'],
      artifacts: [
        {
          artifactId: 'resource:archive',
          role: 'resourceBundle',
          target: 'resource',
          url: archiveUrl,
          container: 'zip',
          logicalName: 'protocol-v2-resource-archive',
          expectedSize: resourceArchive.archiveSize,
          expectedSha256: resourceArchive.archiveSha256,
        },
      ],
    } as FirmwareUpdatePlan;
    releaseMemoryHost = jest.fn();
    mockedPrepareFirmwareUpdateV4MemoryHost.mockReturnValue({
      preparedPlan: { preparedPlanDigest: 'b'.repeat(64) },
      hostBindingGeneration: 7,
      release: releaseMemoryHost,
    } as unknown as ReturnType<typeof prepareFirmwareUpdateV4MemoryHost>);
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
    const checkAllFirmwareRelease = jest.fn().mockResolvedValue({
      success: true,
      payload: { firmwareUpdatePlan },
    });
    const firmwareUpdateV4 = jest.fn().mockResolvedValue({
      success: true,
      payload: {},
    });
    mockedGetHardwareSDKInstance.mockResolvedValue({
      checkAllFirmwareRelease,
      firmwareUpdateV4,
      on: jest.fn(),
    } as unknown as CoreApi);

    await serviceHardware.firmwareUpdateV4();

    expect(firmwareUpdateV4).toHaveBeenCalledWith('pro2-connect-id', {
      platform: 'web',
      preparedPlan: { preparedPlanDigest: 'b'.repeat(64) },
      hostBindingGeneration: 7,
    });
    expect(checkAllFirmwareRelease).toHaveBeenCalledWith('pro2-connect-id', {
      platform: 'web',
      protocolV2ForceUpdateTargets: [
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
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(archiveUrl);
    expect(mockedPrepareFirmwareUpdateV4MemoryHost).toHaveBeenCalledWith({
      sdk: expect.any(Object),
      plan: firmwareUpdatePlan,
      artifacts: [
        {
          artifactId: 'resource:archive',
          binary: resourceArchiveBinary,
          materializedEntries: expect.arrayContaining([
            expect.objectContaining({ entryName: 'manifest.json' }),
            expect.objectContaining({
              entryName: resourceManifest.files[0].archive_path,
            }),
          ]),
        },
      ],
    });
    expect(releaseMemoryHost).toHaveBeenCalledTimes(1);
    expect(store.getState().firmware.resultType).toBe('success');
  });

  test('passes selected Protocol V2 targets to the release Plan request', async () => {
    mockRemoteResourceDownloads();
    const checkAllFirmwareRelease = jest.fn().mockResolvedValue({
      success: true,
      payload: { firmwareUpdatePlan },
    });
    const firmwareUpdateV4 = jest.fn().mockResolvedValue({
      success: true,
      payload: {},
    });
    mockedGetHardwareSDKInstance.mockResolvedValue({
      checkAllFirmwareRelease,
      firmwareUpdateV4,
      on: jest.fn(),
    } as unknown as CoreApi);

    await serviceHardware.firmwareUpdateV4({
      platform: 'web',
      targetsToUpdate: ['app_v1', 'resource'],
    });

    expect(checkAllFirmwareRelease).toHaveBeenCalledWith('pro2-connect-id', {
      platform: 'web',
      protocolV2ForceUpdateTargets: ['app_v1', 'resource'],
    });
  });

  test('uses a selected local resource ZIP without a remote Plan', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(new Error('local artifact must not be downloaded'));
    const checkAllFirmwareRelease = jest.fn().mockResolvedValue({
      success: true,
      payload: { firmwareUpdatePlan },
    });
    const firmwareUpdateV4 = jest.fn().mockResolvedValue({
      success: true,
      payload: {},
    });
    mockedGetHardwareSDKInstance.mockResolvedValue({
      checkAllFirmwareRelease,
      firmwareUpdateV4,
      on: jest.fn(),
    } as unknown as CoreApi);

    await serviceHardware.firmwareUpdateV4({
      platform: 'web',
      localResourceArchiveBinary: resourceArchiveBinary,
    });

    expect(checkAllFirmwareRelease).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockedPrepareFirmwareUpdateV4MemoryHost).not.toHaveBeenCalled();
    expect(firmwareUpdateV4).toHaveBeenCalledWith('pro2-connect-id', {
      platform: 'web',
      targetsToUpdate: ['resource'],
      resourceArchiveBinary,
    });
  });

  test('uses a selected local firmware component without a remote Plan', async () => {
    const applicationBinary = new Uint8Array([7, 8, 9]).buffer;
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(new Error('local artifact must not be downloaded'));
    const checkAllFirmwareRelease = jest.fn().mockResolvedValue({
      success: true,
      payload: { firmwareUpdatePlan },
    });
    const firmwareUpdateV4 = jest.fn().mockResolvedValue({
      success: true,
      payload: {},
    });
    mockedGetHardwareSDKInstance.mockResolvedValue({
      checkAllFirmwareRelease,
      firmwareUpdateV4,
      on: jest.fn(),
    } as unknown as CoreApi);

    await serviceHardware.firmwareUpdateV4({
      platform: 'web',
      applicationP1Binary: applicationBinary,
    });

    expect(checkAllFirmwareRelease).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockedPrepareFirmwareUpdateV4MemoryHost).not.toHaveBeenCalled();
    expect(firmwareUpdateV4).toHaveBeenCalledWith('pro2-connect-id', {
      platform: 'web',
      targetsToUpdate: ['app_v1'],
      applicationP1Binary: applicationBinary,
    });
  });

  test('updates Neo resources without unsupported SE03 and SE04 targets', async () => {
    mockRemoteResourceDownloads();
    store.dispatch(setDevice(neoDevice));
    const checkAllFirmwareRelease = jest.fn().mockResolvedValue({
      success: true,
      payload: { firmwareUpdatePlan },
    });
    const firmwareUpdateV4 = jest.fn().mockResolvedValue({
      success: true,
      payload: {},
    });
    mockedGetHardwareSDKInstance.mockResolvedValue({
      checkAllFirmwareRelease,
      firmwareUpdateV4,
      on: jest.fn(),
    } as unknown as CoreApi);

    await serviceHardware.firmwareUpdateV4();

    expect(checkAllFirmwareRelease).toHaveBeenCalledWith('neo-connect-id', {
      platform: 'web',
      protocolV2ForceUpdateTargets: [
        'boot',
        'app_v1',
        'app_v2',
        'coprocessor',
        'se01',
        'se02',
        'resource',
      ],
    });
  });
});
