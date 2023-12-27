import memoizee from 'memoizee';
import {
  HardwareWebSdk as HardwareSDK,
  // @ts-expect-error
} from '@onekeyfe/hd-web-sdk/build/onekey-js-sdk.min.js';
import { getSDKVersion } from '@onekeyfe/hd-core';
import type { ConnectSettings, CoreApi } from '@onekeyfe/hd-core';
import { wait } from '@/utils';

let initialized = false;

export const getHardwareSDKInstance = memoizee(
  async () =>
    new Promise<CoreApi>(async (resolve, reject) => {
      if (initialized) {
        resolve(HardwareSDK);
        return;
      }
      await wait(2000);
      console.log('===>>>window: ', window);
      // @ts-expect-error
      const connectSrc = window.ONEKEY_DESKTOP_GLOBALS?.sdkConnectSrc;
      if (!connectSrc) {
        reject(new Error('static sdkConnectSrc not found'));
        return;
      }
      const settings: Partial<ConnectSettings> = {
        debug: true,
        connectSrc,
        preRelease: false,
        fetchConfig: true,
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
