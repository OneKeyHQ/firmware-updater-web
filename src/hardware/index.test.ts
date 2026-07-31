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
    });
    expect(store.getState().firmware.resultType).toBe('success');
  });
});
