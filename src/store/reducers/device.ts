import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { KnownDevice } from '@onekeyfe/hd-core';

type InitialState = {
  device: KnownDevice | null;
};

const initialState: InitialState = {
  device: null,
};

export const deviceSlice = createSlice({
  name: 'device',
  initialState,
  reducers: {
    setDevice(state, action: PayloadAction<InitialState['device']>) {
      state.device = action.payload;
    },
  },
});

export const { setDevice } = deviceSlice.actions;

export default deviceSlice.reducer;
