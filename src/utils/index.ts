import { BridgeSystem } from '@/types';
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

  if (deviceType === 'classic') {
    return 'firmware-v2';
  }

  if (deviceType === 'touch') {
    return 'firmware';
  }
  return 'firmware';
};
