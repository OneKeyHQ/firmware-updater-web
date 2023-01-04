import React, { useState, useEffect, useCallback, FC } from 'react';
import { marked } from 'marked';
import { useSelector, useDispatch } from 'react-redux';
import { useIntl } from 'react-intl';
import { IDeviceType } from '@onekeyfe/hd-core';
import { RootState } from '@/store';
import { setSelectedUploadType } from '@/store/reducers/runtime';
import type { TabType } from './ReleaseInfo';

type DataSource = {
  version: string;
  changelog: string;
};

const Table: FC<{ tabType: TabType }> = ({ tabType }) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const locale = useSelector((state: RootState) => state.runtime.locale);
  const selectedUploadType = useSelector(
    (state: RootState) => state.runtime.selectedUploadType
  );
  const device = useSelector((state: RootState) => state.runtime.device);
  const releaseMap = useSelector(
    (state: RootState) => state.runtime.releaseMap
  );
  const [dataSource, setDataSource] = useState<DataSource | null>(null);

  const getReleaseInfo = useCallback(() => {
    const deviceType = device?.deviceType;
    const release = releaseMap[deviceType as IDeviceType];
    return release;
  }, [device, releaseMap]);

  useEffect(() => {
    const releaseInfo = getReleaseInfo();
    const firmwareField =
      device?.deviceType === 'touch' && tabType === 'firmware'
        ? 'firmware-v2'
        : tabType;
    const item = releaseInfo[firmwareField];
    const data = {
      version: Array.isArray(item?.[0].version) && item?.[0].version.join('.'),
      changelog: item?.[0].changelog[locale],
    };
    setDataSource(data as DataSource);
  }, [getReleaseInfo, tabType, locale, device]);

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mt-4 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="w-32 py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                    >
                      {intl.formatMessage({ id: 'TR_VERSION' })}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      {intl.formatMessage({ id: 'TR_CHANGE_LOG' })}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  <tr
                    style={{
                      backgroundColor:
                        tabType === selectedUploadType ? '#dff7e6' : 'white',
                    }}
                  >
                    <td className="flex flex-row items-center whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                      <input
                        name="notification-method"
                        type="radio"
                        className="h-4 w-4 border-gray-300 text-brand-600 focus:ring-brand-500"
                        checked={tabType === selectedUploadType}
                        onChange={() => {
                          dispatch(setSelectedUploadType(tabType));
                        }}
                      />
                      <label
                        htmlFor={dataSource?.version}
                        className="ml-3 block text-sm font-normal text-gray-700"
                      >
                        {dataSource?.version}
                      </label>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-800">
                      <p
                        // eslint-disable-next-line react/no-danger
                        dangerouslySetInnerHTML={{
                          __html: marked.parse(dataSource?.changelog ?? ''),
                        }}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Table);
