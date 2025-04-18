import React, { FC, useState, useCallback } from 'react';
import { useIntl } from 'react-intl';
import { store } from '@/store';
import { serviceHardware } from '@/hardware';
import { setShowErrorAlert } from '@/store/reducers/firmware';
import { Button } from '@onekeyfe/ui-components';
import { useV3Components } from '@/utils/v3FirmwareUtils';

interface V3FirmwareConfirmUpdateProps {
  clearTimer?: () => void;
}

/**
 * Component for confirming firmware updates using the V3 update protocol
 */
const V3FirmwareConfirmUpdate: FC<V3FirmwareConfirmUpdateProps> = ({
  clearTimer,
}) => {
  const intl = useIntl();
  const { device, currentTabComponents } = useV3Components();
  const [confirmProtocol, setConfirmProtocol] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const onHandleInstall = useCallback(async () => {
    if (isUpdating) return;

    setIsUpdating(true);

    if (clearTimer) {
      clearTimer();
    }

    try {
      console.log('Processing components for current tab', {
        currentTabComponents,
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
  }, [clearTimer, currentTabComponents, isUpdating]);

  const isDisabled = () => {
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
