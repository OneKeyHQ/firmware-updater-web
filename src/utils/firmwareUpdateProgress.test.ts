import { EDeviceType } from '@onekeyfe/hd-shared';
import {
  isProBootloaderReadyForCurrentMcu,
  mapFirmwareUpdateProgress,
  shouldUseReportedFirmwareProgress,
} from './firmwareUpdateProgress';

describe('mapFirmwareUpdateProgress', () => {
  test('maps transfer and install ranges without going backwards', () => {
    expect(
      mapFirmwareUpdateProgress({
        currentProgress: 0,
        payloadProgress: 40,
        progressType: 'transferData',
      })
    ).toEqual({ progress: 20, maxProgress: 50 });

    expect(
      mapFirmwareUpdateProgress({
        currentProgress: 50,
        payloadProgress: 1,
        progressType: 'installingFirmware',
      })
    ).toEqual({ progress: 50, maxProgress: 99 });

    expect(
      mapFirmwareUpdateProgress({
        currentProgress: 74,
        payloadProgress: 1,
        progressType: 'installingFirmware',
      })
    ).toEqual({ progress: 74, maxProgress: 99 });
  });

  test('ignores incomplete payloads', () => {
    expect(
      mapFirmwareUpdateProgress({
        currentProgress: 10,
        payloadProgress: -1,
        progressType: 'transferData',
      })
    ).toBeNull();
    expect(
      mapFirmwareUpdateProgress({
        currentProgress: 10,
        payloadProgress: 40,
      })
    ).toBeNull();
  });
});

describe('shouldUseReportedFirmwareProgress', () => {
  test('uses SDK progress for Pro2, Neo, and typed events', () => {
    expect(
      shouldUseReportedFirmwareProgress({
        useSdkProgress: true,
        deviceType: 'classic',
      })
    ).toBe(true);
    expect(
      shouldUseReportedFirmwareProgress({
        useSdkProgress: false,
        deviceType: EDeviceType.Pro2,
      })
    ).toBe(true);
    expect(
      shouldUseReportedFirmwareProgress({
        useSdkProgress: false,
        deviceType: EDeviceType.Neo,
      })
    ).toBe(true);
  });

  test('keeps the fake timer for older Protocol V1 devices', () => {
    expect(
      shouldUseReportedFirmwareProgress({
        useSdkProgress: false,
        deviceType: 'classic',
      })
    ).toBe(false);
    expect(
      shouldUseReportedFirmwareProgress({
        useSdkProgress: false,
        deviceType: EDeviceType.Pro,
        bootloaderVersion: '2.7.0',
      })
    ).toBe(false);
  });
});

describe('isProBootloaderReadyForCurrentMcu', () => {
  test('requires bootloader 2.8.0 or newer', () => {
    expect(isProBootloaderReadyForCurrentMcu('2.7.0')).toBe(false);
    expect(isProBootloaderReadyForCurrentMcu('2.8.0')).toBe(true);
    expect(isProBootloaderReadyForCurrentMcu('2.8.4')).toBe(true);
    expect(isProBootloaderReadyForCurrentMcu(undefined)).toBe(false);
  });
});
