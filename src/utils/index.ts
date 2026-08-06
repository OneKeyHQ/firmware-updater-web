import { BridgeSystem } from '@/types';
import { Buffer } from 'buffer';
import type { Features, IDeviceType } from '@onekeyfe/hd-core';
import { EDeviceType } from '@onekeyfe/hd-shared';

export const isProtocolV2DeviceType = (
  deviceType: IDeviceType | string | null | undefined
) => deviceType === EDeviceType.Pro2 || deviceType === EDeviceType.Neo;

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

export const getDeviceFirmwareVersion = (
  features: Features | undefined
): number[] => {
  if (!features) return [0, 0, 0];

  if (features.onekey_version) {
    return features.onekey_version.split('.').map((part) => Number(part) || 0);
  }
  return [
    features.major_version ?? 0,
    features.minor_version ?? 0,
    features.patch_version ?? 0,
  ];
};
