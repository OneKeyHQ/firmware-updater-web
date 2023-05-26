import memoizee from 'memoizee';
import {
  HardwareWebSdk as HardwareSDK,
  // @ts-expect-error
} from '@onekeyfe/hd-web-sdk/build/onekey-js-sdk.min.js';
import { getSDKVersion } from '@onekeyfe/hd-core';
import type { ConnectSettings, CoreApi } from '@onekeyfe/hd-core';

let initialized = false;

export const getHardwareSDKInstance = memoizee(
  async () =>
    new Promise<CoreApi>(async (resolve, reject) => {
      if (initialized) {
        resolve(HardwareSDK);
        return;
      }
      const settings: Partial<ConnectSettings> = {
        debug: true,
        connectSrc: 'https://jssdk.onekey.so/0.3.6-alpha.0/',
        // connectSrc: 'https://localhost:8087/',
        preRelease: true,
      };

      try {
        await HardwareSDK.init(settings);
        console.log(
          'HardwareSDK initialized success, version: ',
          getSDKVersion()
        );
        initialized = true;
        resolve(HardwareSDK);
      } catch (e) {
        reject(e);
      }
    }),
  {
    promise: true,
    max: 1,
  }
);
