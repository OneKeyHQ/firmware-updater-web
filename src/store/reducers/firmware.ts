import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type InitialState = {
  progress: number;
  maxProgress: number;
  updateTip: string;
  useSdkProgress: boolean;
  showFirmwareUpdate: boolean;
  showPinAlert: boolean;
  showButtonAlert: boolean;
  showProgressBar: boolean;
  showResultAlert: boolean;
  resultTip: string;
  resultType: 'error' | 'success';
  file: ArrayBuffer | undefined;
};

const initialState: InitialState = {
  progress: 0,
  maxProgress: 0,
  updateTip: '',
  useSdkProgress: false,
  showFirmwareUpdate: false,
  showPinAlert: false,
  showButtonAlert: false,
  showProgressBar: false,
  showResultAlert: false,
  resultType: 'error',
  resultTip: '',
  file: undefined,
};

export const firmwareSlice = createSlice({
  name: 'firmware',
  initialState,
  reducers: {
    setProgress(state, action: PayloadAction<InitialState['progress']>) {
      if (action.payload === 0) {
        state.progress = 0;
        state.useSdkProgress = false;
        return;
      }
      if (action.payload > state.progress) {
        state.progress = action.payload;
      }
    },
    setUseSdkProgress(
      state,
      action: PayloadAction<InitialState['useSdkProgress']>
    ) {
      state.useSdkProgress = action.payload;
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
    setFile(state, action: PayloadAction<InitialState['file']>) {
      state.file = action.payload;
    },
  },
});

export const {
  setProgress,
  setUseSdkProgress,
  setMaxProgress,
  setUpdateTip,
  setShowPinAlert,
  setShowButtonAlert,
  setShowErrorAlert,
  setShowProgressBar,
  setFile,
} = firmwareSlice.actions;

export default firmwareSlice.reducer;
