import { FC } from 'react';
import { useIntl } from 'react-intl';

export const EmptyTips: FC<{ version: string }> = ({ version }) => {
  const intl = useIntl();
  return (
    <div className="text-left px-2 pb-4">
      <p>
        {intl.formatMessage(
          {
            id: 'TR_FIRMWARE_UPDATE_1',
          },
          { version: '3.4.0' }
        )}
      </p>
      <p>
        {intl.formatMessage({ id: 'TR_FIRMWARE_UPDATE_2' })} {version}
      </p>
    </div>
  );
};

export const ListTips = () => {
  const intl = useIntl();
  return (
    <div className="text-left px-2 pb-4">
      <ul className="list-disc text-sm">
        <li>{intl.formatMessage({ id: 'TR_LIST_TIP_1' })}</li>
        <li>{intl.formatMessage({ id: 'TR_LIST_TIP_2' })}</li>
        <li>{intl.formatMessage({ id: 'TR_LIST_TIP_3' })}</li>
        <li>{intl.formatMessage({ id: 'TR_LIST_TIP_4' })}</li>
        <li>{intl.formatMessage({ id: 'TR_LIST_TIP_5' })}</li>
      </ul>
    </div>
  );
};

export const RestartToHomeTip = () => {
  const intl = useIntl();
  return (
    <div className="text-left px-2 pb-4">
      <p>{intl.formatMessage({ id: 'TR_RESTART_HOME' })}</p>
    </div>
  );
};
