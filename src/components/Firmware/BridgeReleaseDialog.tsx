import { FC, Dispatch, SetStateAction } from 'react';
import { Button } from '@onekeyfe/ui-components';
import { useIntl } from 'react-intl';
import ConfirmDialog from '../Modal';

const BridgeReleaseDialog: FC<{
  visible: boolean;
  setVisible: Dispatch<SetStateAction<boolean>>;
  version: string;
}> = ({ visible, setVisible, version }) => {
  const intl = useIntl();
  return (
    <ConfirmDialog
      visible={visible}
      title={intl.formatMessage({
        id: 'TR_REQUIRES_UPDATING_OF_ONEKEY_BRIDGE',
      })}
      okCancel
      close={() => setVisible(false)}
      cancelText={intl.formatMessage({ id: 'TR_CLOSE' })}
    >
      <div>
        {intl.formatMessage(
          {
            id: 'TR_ONEKEY_BRIDGE_STR_IS_NOW_AVAILABLE_DO_YOU_WANT_TO_DOWNLOAD',
          },
          {
            0: version,
          }
        )}
      </div>
      <Button
        className="mt-6 w-full"
        type="primary"
        onClick={() => {
          window.open('https://onekey.so/download/?client=bridge', '_blank');
        }}
      >
        {intl.formatMessage({ id: 'TR_DOWNLOAD' })}
      </Button>
    </ConfirmDialog>
  );
};

export default BridgeReleaseDialog;
