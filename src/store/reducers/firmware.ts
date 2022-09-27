import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type InitialState = {
  progress: number;
  maxProgress: number;
  uploadTip: string;
  showPinAlert: boolean;
  showButtonAlert: boolean;
};

const initialState: InitialState = {
  progress: 0,
  maxProgress: 0,
  uploadTip: '',
  showPinAlert: false,
  showButtonAlert: false,
};

export const firmwareSlice = createSlice({
  name: 'firmware',
  initialState,
  reducers: {
    setProgress(state, action: PayloadAction<InitialState['progress']>) {
      state.progress = action.payload;
    },
    setMaxProgress(state, action: PayloadAction<InitialState['maxProgress']>) {
      state.maxProgress = action.payload;
    },
    setUploadTip(state, action: PayloadAction<InitialState['uploadTip']>) {
      state.uploadTip = action.payload;
    },
    setShowPinAlert(
      state,
      action: PayloadAction<InitialState['showPinAlert']>
    ) {
      state.showPinAlert = action.payload;
      state.showButtonAlert = false;
    },
    setShowButtonAlert(
      state,
      action: PayloadAction<InitialState['showButtonAlert']>
    ) {
      state.showButtonAlert = action.payload;
      state.showPinAlert = false;
    },
  },
});

export const {
  setProgress,
  setMaxProgress,
  setUploadTip,
  setShowPinAlert,
  setShowButtonAlert,
} = firmwareSlice.actions;

export default firmwareSlice.reducer;
