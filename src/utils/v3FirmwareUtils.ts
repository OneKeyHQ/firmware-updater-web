import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { RootState } from '@/store';
import {
  setV3UpdateSelections,
  setSelectedV3Component,
} from '@/store/reducers/runtime';

// Component types for V3 firmware
export type V3ComponentType = 'fw' | 'ble' | 'boot' | 'resource';
export type V3SourceType = 'remote' | 'local';

/**
 * Custom hook to access and manipulate V3 component selections
 */
export const useV3Components = () => {
  const dispatch = useDispatch();
  const intl = useIntl();

  // Get relevant state from Redux
  const selectedV3Components = useSelector(
    (state: RootState) => state.runtime.selectedV3Components
  );
  const v3UpdateSelections = useSelector(
    (state: RootState) => state.runtime.v3UpdateSelections
  );
  const tabType = useSelector((state: RootState) => state.runtime.currentTab);
  const device = useSelector((state: RootState) => state.runtime.device);

  /**
   * Toggle component selection
   */
  const toggleComponentSelection = (
    component: V3ComponentType,
    source: V3SourceType,
    version?: string,
    fileInfo?: any,
    forceUpdate?: boolean
  ) => {
    const currentSelection = v3UpdateSelections[component] || {};
    const isSelected =
      selectedV3Components.includes(component) &&
      currentSelection.source === source;

    if (isSelected && !forceUpdate) {
      // Deselect if already selected and not forcing an update
      dispatch(
        setSelectedV3Component({
          component,
          selected: false,
        })
      );
    } else {
      // Select and set source type
      dispatch(
        setV3UpdateSelections({
          [component]: {
            ...currentSelection,
            source,
            version,
            ...(fileInfo ? { fileInfo } : {}),
          },
        })
      );
      // Only dispatch selection change if not already selected
      if (!isSelected) {
        dispatch(
          setSelectedV3Component({
            component,
            selected: true,
          })
        );
      }
    }
  };

  /**
   * Get components that are selected in the current tab
   */
  const currentTabComponents = useMemo(
    () =>
      selectedV3Components.filter((component) => {
        const isV3Tab = tabType === 'v3-remote' || tabType === 'v3-local';
        if (!isV3Tab) return false;

        return tabType === 'v3-remote'
          ? v3UpdateSelections[component]?.source === 'remote'
          : v3UpdateSelections[component]?.source === 'local';
      }),
    [selectedV3Components, v3UpdateSelections, tabType]
  );

  /**
   * Get component type display text
   */
  const getComponentTypeText = (componentType: V3ComponentType) => {
    switch (componentType) {
      case 'fw':
        return intl.formatMessage({ id: 'TR_FIRMWARE' });
      case 'ble':
        return intl.formatMessage({ id: 'TR_BLUETOOTH_FIRMWARE' });
      case 'boot':
        return intl.formatMessage({ id: 'TR_BOOTLOADER' });
      case 'resource':
        return intl.formatMessage({ id: 'TR_RESOURCE' });
      default:
        return componentType;
    }
  };

  /**
   * Check if an update is currently possible
   */
  const canUpdate = useMemo(
    () => device && currentTabComponents.length > 0,
    [device, currentTabComponents]
  );

  return {
    selectedV3Components,
    v3UpdateSelections,
    currentTabComponents,
    tabType,
    device,
    toggleComponentSelection,
    getComponentTypeText,
    canUpdate,
  };
};

/**
 * Get all component types for V3 firmware
 */
export const getAllV3ComponentTypes = (): V3ComponentType[] => [
  'fw',
  'ble',
  'boot',
  'resource',
];
