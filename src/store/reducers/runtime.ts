import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { KnownDevice, IFirmwareField } from '@onekeyfe/hd-core';
import {
  BridgeReleaseMap,
  DeviceTypeMap,
  IFirmwareReleaseInfo,
  IBLEFirmwareReleaseInfo,
} from '@/types';
import { getDefaultLocale } from '@/utils';

interface FileInfo {
  name: string;
  size: number;
  lastModified: number;
  type: string;
}

interface ProV3ComponentSelection {
  source: 'remote' | 'local';
  fileInfo?: FileInfo;
  version?: string;
}

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
  selectedUploadType: 'firmware' | 'ble' | 'binary' | 'bootloader' | null;
  locale: 'zh-CN' | 'en-US';
  currentTab: 'firmware' | 'ble' | 'bootloader' | 'v3-remote' | 'v3-local';
  installType: 'firmware' | 'bootloader';
  selectedReleaseInfo:
    | (IFirmwareReleaseInfo & { firmwareField: IFirmwareField })
    | (IBLEFirmwareReleaseInfo & { firmwareField: IFirmwareField })
    | null;
  // V3 firmware update state
  v3UpdateSelections: {
    fw: ProV3ComponentSelection;
    ble: ProV3ComponentSelection;
    boot: ProV3ComponentSelection;
    resource: ProV3ComponentSelection;
  };
  selectedV3Components: ('fw' | 'ble' | 'boot' | 'resource')[];
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
  installType: 'firmware',
  selectedReleaseInfo: null,
  v3UpdateSelections: {
    fw: { source: 'remote' },
    ble: { source: 'remote' },
    boot: { source: 'remote' },
    resource: { source: 'remote' },
  },
  selectedV3Components: [],
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
    setInstallType(state, action: PayloadAction<InitialState['installType']>) {
      state.installType = action.payload;
    },
    setSelectedReleaseInfo(
      state,
      action: PayloadAction<InitialState['selectedReleaseInfo']>
    ) {
      state.selectedReleaseInfo = action.payload;
    },
    setV3UpdateSelections(
      state,
      action: PayloadAction<Partial<InitialState['v3UpdateSelections']>>
    ) {
      state.v3UpdateSelections = {
        ...state.v3UpdateSelections,
        ...action.payload,
      };
    },
    setSelectedV3Component(
      state,
      action: PayloadAction<{
        component: 'fw' | 'ble' | 'boot' | 'resource';
        selected: boolean;
      }>
    ) {
      const { component, selected } = action.payload;
      if (selected && !state.selectedV3Components.includes(component)) {
        state.selectedV3Components.push(component);
      } else if (!selected) {
        state.selectedV3Components = state.selectedV3Components.filter(
          (c) => c !== component
        );
      }
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
  setInstallType,
  setSelectedReleaseInfo,
  setV3UpdateSelections,
  setSelectedV3Component,
} = runtimeSlice.actions;

export default runtimeSlice.reducer;
