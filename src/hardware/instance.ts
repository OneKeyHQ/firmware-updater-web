import memoizee from 'memoizee';
import HardwareCommonSdk from '@onekeyfe/hd-common-connect-sdk';
import { getSDKVersion } from '@onekeyfe/hd-core';
import type { ConnectSettings, CoreApi } from '@onekeyfe/hd-core';

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
        connectSrc: 'https://jssdk.onekey.so/1.1.21/',
        preRelease: false,
        fetchConfig: true,
        env: 'webusb',
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
