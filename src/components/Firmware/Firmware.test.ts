import { findConnectedDevice } from './Firmware';

jest.mock('@onekeyfe/ui-components', () => ({
  Alert: () => null,
  Button: () => null,
  Link: () => null,
}));

describe('findConnectedDevice', () => {
  const currentDevice = {
    path: 'connected-device',
    connectId: 'connected-device',
    serialNo: 'SERIAL-A',
  };

  test('keeps the currently connected device instead of selecting the first result', () => {
    expect(
      findConnectedDevice(
        [{ path: 'other-device', connectId: 'other-device' }, currentDevice],
        currentDevice
      )
    ).toBe(currentDevice);
  });

  test('does not substitute another device when the current device disappears', () => {
    expect(
      findConnectedDevice(
        [
          {
            path: 'first-device',
            connectId: 'first-device',
            serialNo: 'SERIAL-B',
          },
          {
            path: 'second-device',
            connectId: 'second-device',
            serialNo: 'SERIAL-C',
          },
        ],
        currentDevice
      )
    ).toBeUndefined();
  });

  test('rejects another physical device that reuses the same transport identity', () => {
    expect(
      findConnectedDevice(
        [
          {
            path: currentDevice.path,
            connectId: currentDevice.connectId,
            serialNo: 'SERIAL-B',
          },
        ],
        currentDevice
      )
    ).toBeUndefined();
  });

  test('falls back to the transport identity when no serial number is available', () => {
    const bootloaderDevice = {
      path: 'bootloader-device',
      connectId: 'bootloader-device',
      serialNo: null,
      uuid: '',
    };

    expect(findConnectedDevice([bootloaderDevice], bootloaderDevice)).toBe(
      bootloaderDevice
    );
  });
});
