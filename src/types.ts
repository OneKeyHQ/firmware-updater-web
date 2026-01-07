import type { IDeviceType } from '@onekeyfe/hd-core';

export type IVersionArray = [number, number, number];

export type ILocale = 'zh-CN' | 'en-US';

/** STM32 firmware config */
export type IFirmwareReleaseInfo = {
  required: boolean;
  url: string;
  fingerprint: string;
  version: IVersionArray;
  changelog: {
    [k in ILocale]: string;
  };
  bootloaderResource?: string;
  bootloaderChangelog?: {
    [k in ILocale]: string;
  };
  bootloaderVersion?: IVersionArray;
  displayBootloaderVersion?: IVersionArray;
  resource: string;
};

/** BLE firmware config */
export type IBLEFirmwareReleaseInfo = {
  required: boolean;
  /** bluetooth dfu version */
  url: string;
  /** stm bluetooth update version */
  webUpdate: string;
  fingerprint: string;
  fingerprintWeb: string;
  version: IVersionArray;
  changelog: {
    [k in ILocale]: string;
  };
};

export type DeviceTypeMap = {
  [k in IDeviceType]: {
    firmware: IFirmwareReleaseInfo[];
    ble: IBLEFirmwareReleaseInfo[];
    'firmware-v2'?: IFirmwareReleaseInfo[];
    'firmware-v8'?: IFirmwareReleaseInfo[];
    'firmware-btc-v8'?: IFirmwareReleaseInfo[];
  };
};

export type AssetsMap = {
  bridge: {
    version: IVersionArray;
    linux32Rpm: string;
    linux64Rpm: string;
    linux32Deb: string;
    linux64Deb: string;
    win: string;
    mac: string;
    sha256sumAsc: string;
    changelog: {
      [k in ILocale]: string;
    };
  };
};

export type RemoteConfigResponse = {
  bridge: AssetsMap['bridge'];
} & DeviceTypeMap;

export type BridgeSystem =
  | 'linux64Deb'
  | 'linux64Rpm'
  | 'linux32Deb'
  | 'linux32Rpm'
  | 'mac'
  | 'win';
export type BridgeReleaseMap = {
  [K in BridgeSystem]: {
    value: string;
    label: string;
  };
};
