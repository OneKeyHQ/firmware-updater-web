import memoizee from 'memoizee';
import HardwareCommonSdk from '@onekeyfe/hd-common-connect-sdk';
import { getSDKVersion } from '@onekeyfe/hd-core';
import type { ConnectSettings, CoreApi } from '@onekeyfe/hd-core';

import { fetchHardwareConfig } from './config';

let initialized = false;

export const getHardwareSDKInstance = memoizee(
  async () =>
    new Promise<CoreApi>(async (resolve, reject) => {
      if (initialized) {
        resolve(HardwareCommonSdk);
        return;
      }
      const settings: Partial<ConnectSettings> = {
        debug: true,
        preRelease: false,
        fetchConfig: true,
        env: 'webusb',
        ...(process.env.REACT_APP_HARDWARE_CONFIG_URL
          ? { configFetcher: fetchHardwareConfig }
          : {}),
      };

      try {
        await HardwareCommonSdk.init(settings);
        console.log(
          'HardwareSDK initialized success, version: ',
          getSDKVersion()
        );
        initialized = true;
        resolve(HardwareCommonSdk);
      } catch (e) {
        reject(e);
      }
    }),
  {
    promise: true,
    max: 1,
  }
);
