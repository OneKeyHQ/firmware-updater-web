import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { KnownDevice } from '@onekeyfe/hd-core';
import { BridgeReleaseMap, DeviceTypeMap } from '@/types';
import { getDefaultLocale } from '@/utils';

type InitialState = {
  device: KnownDevice | null;
  pageStatus:
    | 'initialize'
    | 'uninstall-bridge'
    | 'download-bridge'
    | 'searching'
    | 'search-timeout'
    | 'connected';
  bridgeVersion: string;
  releaseMap: DeviceTypeMap;
  bridgeReleaseMap: BridgeReleaseMap;
  selectedUploadType: 'firmware' | 'ble' | 'binary' | null;
  locale: 'zh-CN' | 'en-US';
  currentTab: 'firmware' | 'ble';
};

const initialState: InitialState = {
  device: null,
  pageStatus: 'initialize',
  bridgeVersion: '',
  releaseMap: {} as DeviceTypeMap,
  bridgeReleaseMap: {} as BridgeReleaseMap,
  selectedUploadType: null,
  locale: getDefaultLocale(),
  currentTab: 'firmware',
};

export const runtimeSlice = createSlice({
  name: 'runtime',
  initialState,
  reducers: {
    setDevice(state, action: PayloadAction<InitialState['device']>) {
      state.device = action.payload;
      if (state.device) {
        state.pageStatus = 'connected';
      }
    },
    setPageStatus(state, action: PayloadAction<InitialState['pageStatus']>) {
      state.pageStatus = action.payload;
    },
    setBridgeVersion(
      state,
      action: PayloadAction<InitialState['bridgeVersion']>
    ) {
      state.bridgeVersion = action.payload;
    },
    setReleaseMap(state, action: PayloadAction<InitialState['releaseMap']>) {
      state.releaseMap = action.payload;
    },
    setBridgeReleaseMap(
      state,
      action: PayloadAction<InitialState['bridgeReleaseMap']>
    ) {
      state.bridgeReleaseMap = action.payload;
    },
    setSelectedUploadType(
      state,
      action: PayloadAction<InitialState['selectedUploadType']>
    ) {
      state.selectedUploadType = action.payload;
    },
    setLocale(state, action: PayloadAction<InitialState['locale']>) {
      state.locale = action.payload;
    },
    setCurrentTab(state, action: PayloadAction<InitialState['currentTab']>) {
      state.currentTab = action.payload;
    },
  },
});

export const {
  setDevice,
  setPageStatus,
  setBridgeVersion,
  setReleaseMap,
  setBridgeReleaseMap,
  setSelectedUploadType,
  setLocale,
  setCurrentTab,
} = runtimeSlice.actions;

export default runtimeSlice.reducer;
