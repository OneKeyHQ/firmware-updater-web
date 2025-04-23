import { store } from '@/store';
import axios from 'axios';
import type { IFirmwareField } from '@onekeyfe/hd-core';
// download 3.4 firmware
export const downloadLegacyTouchFirmware = async (
  firmwareField: 'firmware' | 'ble' | 'firmware-v2'
) => {
  const state = store.getState();
  const releaseMap = state.runtime.releaseMap;
  const url = releaseMap.touch[firmwareField]?.[0]?.url;
  const response = await axios.request({
    url,
    withCredentials: false,
    responseType: 'arraybuffer',
  });
  return response.data;
};

export const downloadBootloaderFirmware = async (
  type: 'pro' | 'touch',
  firmwareField: Exclude<IFirmwareField, 'ble'>
) => {
  const state = store.getState();
  const releaseMap = state.runtime.releaseMap;
  const url = releaseMap[type][firmwareField]?.[0]?.bootloaderResource;
  const response = await axios.request({
    url,
    withCredentials: false,
    responseType: 'arraybuffer',
  });
  return response.data;
};
