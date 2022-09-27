/* eslint-disable class-methods-use-this */
import axios from 'axios';
import {
  SearchDevice,
  Success,
  Unsuccessful,
  UiResponseEvent,
  UI_EVENT,
  UI_REQUEST,
} from '@onekeyfe/hd-core';
import { createDeferred, Deferred } from '@onekeyfe/hd-shared';
import { store } from '@/store';
import { setBridgeVersion, setReleaseMap } from '@/store/reducers/runtime';
import {
  setProgress,
  setMaxProgress,
  setShowPinAlert,
  setShowButtonAlert,
  setUploadTip,
} from '@/store/reducers/firmware';
import type { RemoteConfigResponse } from '@/types';
import { getHardwareSDKInstance } from './instance';

let searchPromise: Deferred<void> | null = null;
class ServiceHardware {
  scanMap: Record<string, boolean> = {};

  registeredEvents = false;

  isSearch = false;

  timer: ReturnType<typeof setInterval> | null = null;

  async getSDKInstance() {
    return getHardwareSDKInstance().then((instance) => {
      if (!this.registeredEvents) {
        instance.on(UI_EVENT, (e) => {
          const { type, payload } = e;
          if (type === UI_REQUEST.REQUEST_PIN) {
            store.dispatch(setShowPinAlert(true));
          } else if (type === UI_REQUEST.REQUEST_BUTTON) {
            store.dispatch(setShowButtonAlert(true));
          } else if (type === UI_REQUEST.FIRMWARE_TIP) {
            const { message = '' } = payload.data ?? {};
            switch (message) {
              case 'AutoRebootToBootloader':
                break;
              case 'GoToBootloaderSuccess':
                break;
              case 'DownloadFirmware':
                break;
              case 'DownloadFirmwareSuccess':
                break;
              case 'ConfirmOnDevice':
                break;
              case 'FirmwareEraseSuccess':
                break;
              default:
                break;
            }
          } else if (type === UI_REQUEST.FIRMWARE_PROGRESS) {
            if (payload.progress === 0) {
              store.dispatch(setMaxProgress(99));
            } else if (payload.progress === 100) {
              store.dispatch(setMaxProgress(100));
            }
          }
        });
      }

      return instance;
    });
  }

  async searchDevices() {
    const hardwareSDK = await this.getSDKInstance();
    return hardwareSDK?.searchDevices();
  }

  async startDeviceScan(
    callback: (searchResponse: Unsuccessful | Success<SearchDevice[]>) => void,
    onSearchStateChange: (state: 'start' | 'stop') => void
  ) {
    const searchDevices = async () => {
      if (searchPromise) {
        await searchPromise.promise;
        console.log('search throttling, await search promise and return');
        return;
      }

      searchPromise = createDeferred();
      onSearchStateChange('start');

      let searchResponse;
      try {
        searchResponse = await this.searchDevices();
      } finally {
        searchPromise?.resolve();
        searchPromise = null;
        console.log('search finished, reset searchPromise');
      }

      callback(searchResponse as any);

      onSearchStateChange('stop');
      return searchResponse;
    };

    this.timer = setInterval(async () => {
      if (!this.isSearch && this.timer) {
        clearInterval(this.timer);
        return;
      }
      await searchDevices();
    }, 3000);

    this.isSearch = true;
    await searchDevices();
  }

  stopScan() {
    this.isSearch = false;
  }

  async getFeatures(connectId: string) {
    const hardwareSDK = await this.getSDKInstance();
    const response = await hardwareSDK?.getFeatures(connectId);

    return response;
  }

  async sendUiResponse(response: UiResponseEvent) {
    return (await this.getSDKInstance()).uiResponse(response);
  }

  async checkBridgeStatus() {
    return new Promise((resolve) => {
      axios
        .post('http://localhost:21320')
        .then((res) => {
          if (res.status === 200) {
            resolve(true);
            store.dispatch(setBridgeVersion(res.data.version ?? ''));
          } else {
            resolve(false);
          }
        })
        .catch((e) => {
          console.log(e);
          resolve(false);
        });
    });
  }

  async getReleaseInfo() {
    const { data } = await axios.get<RemoteConfigResponse>(
      `https://data.onekey.so/config.json?noCache=${new Date().getTime()}`
    );

    const deviceMap = {
      classic: data.classic,
      mini: data.mini,
      touch: data.touch,
      pro: data.pro,
    };
    store.dispatch(setReleaseMap(deviceMap));
  }

  async firmwareUpdate() {
    const state = store.getState();
    const hardwareSDK = await this.getSDKInstance();
    const { device, releaseMap, selectedUploadType } = state.runtime;
    const params: any =
      state.runtime.selectedUploadType === 'binary'
        ? {
            binary: [],
          }
        : {
            updateType: state.runtime.selectedUploadType,
          };

    if (
      device?.deviceType &&
      (selectedUploadType === 'firmware' || selectedUploadType === 'ble')
    ) {
      const version =
        releaseMap[device.deviceType][selectedUploadType][0].version;
      params.version = version;
    }
    await hardwareSDK.firmwareUpdateV2(undefined, params);
  }
}

export default ServiceHardware;

const serviceHardware = new ServiceHardware();

export { serviceHardware };
