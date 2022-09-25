import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { KnownDevice } from '@onekeyfe/hd-core';

type InitialState = {
  device: KnownDevice | null;
  pageStatus: 'initialize' | 'searching' | 'search-timeout' | 'connected';
};

const initialState: InitialState = {
  device: null,
  pageStatus: 'initialize',
};

export const runtimeSlice = createSlice({
  name: 'runtime',
  initialState,
  reducers: {
    setDevice(state, action: PayloadAction<InitialState['device']>) {
      state.device = action.payload;
    },
    setPageStatus(state, action: PayloadAction<InitialState['pageStatus']>) {
      state.pageStatus = action.payload;
    },
  },
});

export const { setDevice, setPageStatus } = runtimeSlice.actions;

export default runtimeSlice.reducer;
