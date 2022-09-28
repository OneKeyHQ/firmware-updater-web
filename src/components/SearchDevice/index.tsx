/* eslint-disable no-nested-ternary */
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { RootState } from '@/store';
import { Button } from '@onekeyhq/ui-components';
import ConnectImage from '@/images/connect-device.svg';
import { getSystemKey } from '@/utils';
import { setPageStatus } from '@/store/reducers/runtime';
import Select from '../Select';

type Option = { label: string; value: string };

export default function SearchDevice() {
  const intl = useIntl();
  const dispatch = useDispatch();
  const pageStatus = useSelector(
    (state: RootState) => state.runtime.pageStatus
  );
  const bridgeVersion = useSelector(
    (state: RootState) => state.runtime.bridgeVersion
  );
  const bridgeReleaseMap = useSelector(
    (state: RootState) => state.runtime.bridgeReleaseMap
  );

  const [options, setOptions] = useState<Option[]>([]);
  const [currentTarget, setCurrentTarget] = useState<Option | null>(null);
  useEffect(() => {
    const system = getSystemKey();
    setCurrentTarget(bridgeReleaseMap[system]);

    const items = Object.values(bridgeReleaseMap)
      .filter((item) => item.value && item.value.length)
      .map((item) => item);
    setOptions(items);
  }, [bridgeReleaseMap]);

  return (
    <div className="flex flex-col justify-center items-center py-4">
      <h1 className="text-3xl font-normal">
        {intl.formatMessage({ id: 'TR_CONNECT_HEADING' })}
      </h1>
      <img src={ConnectImage} className="self-center h-60" alt="" />
      <p className="text-sm font-normal text-gray-500">
        {intl.formatMessage({ id: 'TR_MAKE_SURE_IT_IS_WELL_CONNECTED' })}
        {intl.formatMessage({ id: 'TR_SEARCHING_FOR_YOUR_DEVICE' })}
      </p>
      <p className="text-xs font-normal text-gray-500 py-3">
        {pageStatus === 'uninstall-bridge' || pageStatus === 'download-bridge'
          ? intl.formatMessage({ id: 'TR_ONEKEY_BRIDGE_IS_NOT_RUNNING' })
          : `${intl.formatMessage({
              id: 'TR_BRIDGE_IS_RUNNING',
            })}，${intl.formatMessage({ id: 'TR_VERSION' })}: ${bridgeVersion}`}
      </p>
      {pageStatus === 'search-timeout' ? (
        <>
          <p className="text-sm font-normal text-gray-500">
            {intl.formatMessage({ id: 'TR_SEARCHING_TAKES_TOO_LONG' })}
          </p>
          <div className="flex flex-col items-start justify-start">
            <p className="text-sm font-normal text-gray-500 pt-4 pb-1">
              • {intl.formatMessage({ id: 'TR_CHECK_BRIDGE' })}
            </p>
            <p className="text-sm font-normal text-gray-500 py-1">
              • {intl.formatMessage({ id: 'TR_REFRESH_INSTRUCTION' })}
            </p>
            <p className="text-sm font-normal text-gray-500 py-1">
              • {intl.formatMessage({ id: 'TR_ANOTHER_CABLE_INSTRUCTION' })}
            </p>
            <p className="text-sm font-normal text-gray-500 py-1">
              • {intl.formatMessage({ id: 'TR_LAST_RESORT_INSTRUCTION' })}
              <a
                className="text-brand-500"
                href="https://help.onekey.so/hc/zh-cn"
              >
                {intl.formatMessage({ id: 'TR_CONTACT_ONEKEY_SUPPORT_LINK' })}
              </a>
            </p>
          </div>
        </>
      ) : pageStatus === 'uninstall-bridge' ? (
        currentTarget && (
          <div className="flex items-center p-6">
            <div className="w-52 pr-3">
              <Select
                options={options}
                defaultValue={currentTarget}
                onChange={(e) => {
                  setCurrentTarget(e);
                }}
              />
            </div>
            <a href={currentTarget.value} className="w-28 flex">
              <Button
                href={currentTarget.value}
                type="primary"
                size="lg"
                className="flex-1"
                onClick={() => {
                  dispatch(setPageStatus('download-bridge'));
                }}
              >
                {intl.formatMessage({ id: 'TR_DOWNLOAD' })}
              </Button>
            </a>
          </div>
        )
      ) : pageStatus === 'download-bridge' ? (
        <div className="flex flex-col items-center justify-center">
          <p className="text-sm font-normal text-gray-500 pt-3 pb-1">
            1. {intl.formatMessage({ id: 'TR_WAIT_FOR_FILE_TO_DOWNLOAD' })}
          </p>
          <p className="text-sm font-normal text-gray-500 py-2">
            2.
            {intl.formatMessage({ id: 'TR_DOUBLE_CLICK_IT_TO_RUN_INSTALLER' })}
          </p>
          <p className="text-sm font-normal text-gray-500 py-2">
            3.{intl.formatMessage({ id: 'TR_DETECTING_BRIDGE' })}...
          </p>
        </div>
      ) : null}
    </div>
  );
}
