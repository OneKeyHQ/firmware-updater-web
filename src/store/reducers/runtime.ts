import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { KnownDevice, IFirmwareField } from '@onekeyfe/hd-core';
import {
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
  pageStatus: 'initialize' | 'searching' | 'search-timeout' | 'connected';
  releaseMap: DeviceTypeMap;
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
  // Firmware updating flag - prevents device disconnect handling during update
  isUpdating: boolean;
  // 是否需要用户授权 bootloader 设备
  needsBootloaderPermission: boolean;
};

const initialState: InitialState = {
  device: null,
  pageStatus: 'initialize',
  releaseMap: {} as DeviceTypeMap,
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
  isUpdating: false,
  needsBootloaderPermission: false,
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
    setReleaseMap(state, action: PayloadAction<InitialState['releaseMap']>) {
      state.releaseMap = action.payload;
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
    setIsUpdating(state, action: PayloadAction<boolean>) {
      state.isUpdating = action.payload;
    },
    setNeedsBootloaderPermission(state, action: PayloadAction<boolean>) {
      state.needsBootloaderPermission = action.payload;
    },
  },
});

export const {
  setDevice,
  setPageStatus,
  setReleaseMap,
  setSelectedUploadType,
  setLocale,
  setCurrentTab,
  setInstallType,
  setSelectedReleaseInfo,
  setV3UpdateSelections,
  setSelectedV3Component,
  setIsUpdating,
  setNeedsBootloaderPermission,
} = runtimeSlice.actions;

export default runtimeSlice.reducer;
