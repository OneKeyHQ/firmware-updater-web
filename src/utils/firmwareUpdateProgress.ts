import { EDeviceType } from '@onekeyfe/hd-shared';
import semver from 'semver';

export const FIRMWARE_TRANSFER_PROGRESS_MAX = 50;
export const FIRMWARE_INSTALL_PROGRESS_MAX = 99;

export function mapFirmwareUpdateProgress({
  currentProgress,
  payloadProgress,
  progressType,
}: {
  currentProgress: number;
  payloadProgress: number;
  progressType?: string;
}): { progress: number; maxProgress: number } | null {
  if (payloadProgress < 0 || payloadProgress > 100) {
    return null;
  }

  if (progressType === 'transferData') {
    return {
      progress: Math.max(currentProgress, Math.floor(payloadProgress * 0.5)),
      maxProgress: FIRMWARE_TRANSFER_PROGRESS_MAX,
    };
  }

  if (progressType === 'installingFirmware') {
    return {
      progress: Math.max(
        currentProgress,
        FIRMWARE_TRANSFER_PROGRESS_MAX + Math.floor(payloadProgress * 0.49)
      ),
      maxProgress: FIRMWARE_INSTALL_PROGRESS_MAX,
    };
  }

  return null;
}

export function shouldUseReportedFirmwareProgress({
  useSdkProgress,
  deviceType,
  bootloaderVersion,
}: {
  useSdkProgress: boolean;
  deviceType?: string;
  bootloaderVersion?: string;
}): boolean {
  if (useSdkProgress) {
    return true;
  }
  if (deviceType === EDeviceType.Pro2 || deviceType === EDeviceType.Neo) {
    return true;
  }
  return (
    deviceType === EDeviceType.Pro &&
    !!bootloaderVersion &&
    !!semver.valid(bootloaderVersion) &&
    semver.gte(bootloaderVersion, '2.8.0')
  );
}
