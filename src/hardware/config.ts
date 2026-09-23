import axios from 'axios';

import type { RemoteConfigResponse } from '@/types';

const DEFAULT_HARDWARE_CONFIG_URL = 'https://data.onekey.so/config.json';

export const getHardwareConfigUrl = () =>
  process.env.REACT_APP_HARDWARE_CONFIG_URL || DEFAULT_HARDWARE_CONFIG_URL;

export const fetchHardwareConfig = async () => {
  const configUrl = new URL(getHardwareConfigUrl());
  configUrl.searchParams.set('noCache', Date.now().toString());
  const { data } = await axios.get<RemoteConfigResponse>(configUrl.toString());
  return data;
};
