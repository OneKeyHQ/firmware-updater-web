import { store } from '@/store';
import axios from 'axios';

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
