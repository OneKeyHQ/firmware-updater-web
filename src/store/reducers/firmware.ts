import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type InitialState = {
  progress: number;
  maxProgress: number;
  updateTip: string;
  showFirmwareUpdate: boolean;
  showPinAlert: boolean;
  showButtonAlert: boolean;
  showProgressBar: boolean;
  showResultAlert: boolean;
  resultTip: string;
  resultType: 'error' | 'success';
};

const initialState: InitialState = {
  progress: 0,
  maxProgress: 0,
  updateTip: '',
  showFirmwareUpdate: false,
  showPinAlert: false,
  showButtonAlert: false,
  showProgressBar: false,
  showResultAlert: false,
  resultType: 'error',
  resultTip: '',
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
    setUpdateTip(state, action: PayloadAction<InitialState['updateTip']>) {
      state.updateTip = action.payload;
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
    setShowErrorAlert(
      state,
      action: PayloadAction<{ type: 'error' | 'success'; message: string }>
    ) {
      state.resultType = action.payload.type;
      state.resultTip = action.payload.message;
      state.showResultAlert = true;
      state.showPinAlert = false;
      state.showButtonAlert = false;
      state.showProgressBar = false;
    },
    setShowProgressBar(
      state,
      action: PayloadAction<InitialState['showProgressBar']>
    ) {
      state.showProgressBar = action.payload;
      state.showFirmwareUpdate = true;
    },
  },
});

export const {
  setProgress,
  setMaxProgress,
  setUpdateTip,
  setShowPinAlert,
  setShowButtonAlert,
  setShowErrorAlert,
  setShowProgressBar,
} = firmwareSlice.actions;

export default firmwareSlice.reducer;
