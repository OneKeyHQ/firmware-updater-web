import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { KnownDevice } from '@onekeyfe/hd-core';

type InitialState = {
  device: KnownDevice | null;
  pageStatus: 'initialize' | 'searching' | 'search-timeout' | 'connected';
  bridgeVersion: string;
};

const initialState: InitialState = {
  device: null,
  pageStatus: 'initialize',
  bridgeVersion: '',
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
  },
});

export const { setDevice, setPageStatus, setBridgeVersion } =
  runtimeSlice.actions;

export default runtimeSlice.reducer;
