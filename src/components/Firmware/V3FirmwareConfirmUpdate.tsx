import React, { FC, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { RootState, store } from '@/store';
import { serviceHardware } from '@/hardware';
import { setShowErrorAlert } from '@/store/reducers/firmware';
import { Button } from '@onekeyfe/ui-components';

interface V3FirmwareConfirmUpdateProps {
  clearTimer?: () => void;
}

const V3FirmwareConfirmUpdate: FC<V3FirmwareConfirmUpdateProps> = ({ clearTimer }) => {
  const intl = useIntl();
  const device = useSelector((state: RootState) => state.runtime.device);
  const tabType = useSelector((state: RootState) => state.runtime.currentTab);
  const selectedV3Components = useSelector(
    (state: RootState) => state.runtime.selectedV3Components
  );
  const v3UpdateSelections = useSelector(
    (state: RootState) => state.runtime.v3UpdateSelections
  );
  const [confirmProtocol, setConfirmProtocol] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const onHandleInstall = useCallback(async () => {
    if (isUpdating) return;

    setIsUpdating(true);

    if (clearTimer) {
      clearTimer();
    }

    try {
      const currentTabComponents = selectedV3Components.filter((component) => {
        const isV3Tab = tabType === 'v3-remote' || tabType === 'v3-local';
        if (!isV3Tab) return false;

        return tabType === 'v3-remote'
          ? v3UpdateSelections[component]?.source === 'remote'
          : v3UpdateSelections[component]?.source === 'local';
      });

      console.log('Processing components for current tab', {
        currentTabComponents,
        tabType,
      });

      await serviceHardware.firmwareUpdateV3();
    } catch (error) {
      console.error('Error during firmware update:', error);
      store.dispatch(
        setShowErrorAlert({
          type: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Unknown error during firmware update',
        })
      );
    } finally {
      setIsUpdating(false);
    }
  }, [
    clearTimer,
    selectedV3Components,
    v3UpdateSelections,
    tabType,
    isUpdating,
  ]);

  const isDisabled = () => {
    const currentTabComponents = selectedV3Components.filter((component) =>
      tabType === 'v3-remote'
        ? v3UpdateSelections[component]?.source === 'remote'
        : v3UpdateSelections[component]?.source === 'local'
    );

    const hasComponentsSelectedInCurrentTab = currentTabComponents.length > 0;

    return (
      !device ||
      !hasComponentsSelectedInCurrentTab ||
      !confirmProtocol ||
      isUpdating
    );
  };

  return (
    <div className="flex justify-center items-center flex-col mt-4">
      <div className="relative flex items-start">
        <div className="flex h-5 items-center">
          <input
            id="v3-confirm-protocol"
            aria-describedby="v3-confirm-protocol-description"
            name="v3-confirm-protocol"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            checked={confirmProtocol}
            onChange={(e) => {
              const inputValue = e.target.checked;
              setConfirmProtocol(inputValue);
            }}
          />
        </div>
        <div className="ml-3 text-sm">
          <label
            htmlFor="v3-confirm-protocol"
            className="font-normal text-gray-700"
          >
            {intl.formatMessage({ id: 'TR_FIRMWARE_USER_ENSURE' })}
          </label>
        </div>
      </div>
      <div className="py-4">
        {React.createElement(
          Button,
          {
            type: 'primary',
            size: 'xl',
            disabled: isDisabled(),
            loading: isUpdating,
            onClick: onHandleInstall,
          },
          intl.formatMessage({ id: 'TR_FIRMWARE_HEADING' })
        )}
      </div>
    </div>
  );
};

export default V3FirmwareConfirmUpdate;
