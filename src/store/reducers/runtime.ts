import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { KnownDevice } from '@onekeyfe/hd-core';
import { DeviceTypeMap } from '@/types';

type InitialState = {
  device: KnownDevice | null;
  pageStatus: 'initialize' | 'searching' | 'search-timeout' | 'connected';
  bridgeVersion: string;
  releaseMap: DeviceTypeMap;
  selectedVersion: 'firmware' | 'ble' | 'binary' | null;
};

const initialState: InitialState = {
  device: null,
  pageStatus: 'initialize',
  bridgeVersion: '',
  releaseMap: {} as DeviceTypeMap,
  selectedVersion: null,
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
    setSelectedVersion(
      state,
      action: PayloadAction<InitialState['selectedVersion']>
    ) {
      state.selectedVersion = action.payload;
    },
  },
});

export const {
  setDevice,
  setPageStatus,
  setBridgeVersion,
  setReleaseMap,
  setSelectedVersion,
} = runtimeSlice.actions;

export default runtimeSlice.reducer;
