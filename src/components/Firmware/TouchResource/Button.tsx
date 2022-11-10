/* eslint-disable no-nested-ternary */
import { useCallback, useMemo, useState } from 'react';
import { serviceHardware } from '@/hardware';
import { Button } from '@onekeyfe/ui-components';
import { useIntl } from 'react-intl';

const ResourceButton = () => {
  const intl = useIntl();
  const [status, setStatus] = useState({
    loading: false,
    success: false,
    initial: true,
  });
  const handleUpload = useCallback(async () => {
    setStatus((prev) => ({
      ...prev,
      loading: true,
      initial: false,
    }));
    try {
      const response = await serviceHardware.uploadFullResource();
      setStatus((prev) => ({
        ...prev,
        initial: false,
        loading: false,
        success: !!response,
      }));
    } catch (e) {
      setStatus((prev) => ({
        ...prev,
        initial: false,
        loading: false,
        success: false,
      }));
    }
  }, []);

  const buttonType = useMemo(() => {
    if (status?.initial) {
      return 'primary';
    }

    if (status?.loading) {
      return 'basic';
    }

    if (status?.success) {
      return 'primary';
    }
    return 'destructive';
  }, [status]);

  const buttonText = useMemo(() => {
    if (status?.initial) {
      return intl.formatMessage({ id: 'TR_BUTTON_1' });
    }

    if (status?.loading) {
      return intl.formatMessage({ id: 'TR_BUTTON_2' });
    }

    if (status?.success) {
      return intl.formatMessage({ id: 'TR_BUTTON_3' });
    }
    return intl.formatMessage({ id: 'TR_BUTTON_4' });
  }, [status, intl]);

  return (
    <Button
      loading={status?.loading}
      className="w-full"
      type={buttonType}
      onClick={handleUpload}
    >
      {buttonText}
    </Button>
  );
};

export default ResourceButton;
