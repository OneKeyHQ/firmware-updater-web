import { BridgeSystem } from '@/types';
import semver from 'semver';
import { Buffer } from 'buffer';
import { getDeviceType } from '@onekeyfe/hd-core';
import type { Features } from '@onekeyfe/hd-core';

export function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export const arrayBufferToBuffer = (ab: any): any => {
  const buffer: any = Buffer.alloc(ab.byteLength);
  const view = new Uint8Array(ab);
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = view[i];
  }
  return buffer;
};

export const getSystemKey: () => BridgeSystem = () => {
  if (window.navigator.userAgent.indexOf('Win') !== -1) return 'win';
  if (window.navigator.userAgent.indexOf('Mac') !== -1) return 'mac';
  if (window.navigator.userAgent.indexOf('Linux') !== -1) return 'linux64Deb';
  return 'win';
};

export const getDefaultLocale = () => {
  if (/^zh\b/.test(navigator.language)) {
    return 'zh-CN';
  }
  return 'en-US';
};

export const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const getFirmwareUpdateField = (
  features: Features,
  updateType: 'firmware' | 'ble'
) => {
  const deviceType = getDeviceType(features);
  if (updateType === 'ble') {
    return 'ble';
  }

  if (
    deviceType === 'classic' ||
    deviceType === 'classic1s' ||
    deviceType === 'mini'
  ) {
    return 'firmware-v5';
  }

  if (deviceType === 'touch') {
    return 'firmware';
  }
  return 'firmware';
};

export const getFirmwareUpdateFieldArray = (
  features: Features,
  updateType: 'firmware' | 'ble' | 'bootloader'
): ('firmware' | 'ble' | 'firmware-v2' | 'firmware-v5')[] => {
  const deviceType = getDeviceType(features);
  if (updateType === 'ble') {
    return ['ble'];
  }

  if (
    deviceType === 'classic' ||
    deviceType === 'classic1s' ||
    deviceType === 'mini' ||
    deviceType === 'classicpure'
  ) {
    return ['firmware-v5'];
  }

  if (deviceType === 'touch') {
    const currentVersion = getDeviceFirmwareVersion(features).join('.');
    if (semver.gt(currentVersion, '4.0.0')) {
      return ['firmware-v5', 'firmware'];
    }
    if (semver.gte(currentVersion, '4.0.0')) {
      return ['firmware-v2', 'firmware'];
    }
    if (!currentVersion || semver.lt(currentVersion, '3.0.0')) {
      return ['firmware-v5', 'firmware-v2', 'firmware'];
    }
    return ['firmware'];
  }

  if (deviceType === 'pro') {
    return ['firmware-v5'];
  }

  return ['firmware'];
};

export const getDeviceFirmwareVersion = (
  features: Features | undefined
): number[] => {
  if (!features) return [0, 0, 0];

  if (features.onekey_version) {
    return features.onekey_version.split('.') as unknown as number[];
  }
  return [
    features.major_version,
    features.minor_version,
    features.patch_version,
  ];
};
