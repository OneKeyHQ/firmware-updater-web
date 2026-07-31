import type { CoreApi, KnownDevice } from '@onekeyfe/hd-core';
import { store } from '@/store';
import { setDevice } from '@/store/reducers/runtime';
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
  features: { deviceType: 'pro2' },
} as unknown as KnownDevice;

describe('ServiceHardware Pro2 firmware update', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    store.dispatch(setDevice(pro2Device));
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
    const firmwareUpdateV4 = jest.fn().mockResolvedValue({
      success: true,
      payload: {},
    });
    mockedGetHardwareSDKInstance.mockResolvedValue({
      firmwareUpdateV4,
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
    });
    expect(store.getState().firmware.resultType).toBe('success');
  });

  test('passes selected Protocol V2 targets to the SDK', async () => {
    const firmwareUpdateV4 = jest.fn().mockResolvedValue({
      success: true,
      payload: {},
    });
    mockedGetHardwareSDKInstance.mockResolvedValue({
      firmwareUpdateV4,
      on: jest.fn(),
    } as unknown as CoreApi);

    await serviceHardware.firmwareUpdateV4({
      platform: 'web',
      targetsToUpdate: ['app_v1', 'resource'],
    });

    expect(firmwareUpdateV4).toHaveBeenCalledWith('pro2-connect-id', {
      platform: 'web',
      targetsToUpdate: ['app_v1', 'resource'],
    });
  });
});
