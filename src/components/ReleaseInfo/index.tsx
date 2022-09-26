import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { classNames } from '@/utils';
import { setSelectedVersion } from '@/store/reducers/runtime';
import Table from './Table';

export type TabType = 'firmware' | 'ble';

const tabs = [
  { name: '固件', key: 'firmware' },
  { name: '蓝牙固件', key: 'ble' },
];

export default function ReleaseInfo() {
  const [currentTab, setCurrentTab] = useState<TabType>('firmware');
  const dispatch = useDispatch();
  return (
    <div>
      <div className="sm:hidden">
        <label htmlFor="tabs" className="sr-only">
          Select a tab
        </label>
        <select
          id="tabs"
          name="tabs"
          className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-brand-500 focus:outline-none focus:ring-brand-500 sm:text-sm"
          defaultValue={
            (tabs ?? []).find((tab) => tab?.key === currentTab)?.name
          }
        >
          {tabs.map((tab) => (
            <option key={tab.name}>{tab.name}</option>
          ))}
        </select>
      </div>
      <div className="hidden sm:block">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
              <div
                key={tab.name}
                className={classNames(
                  currentTab === tab.key
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                  'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
                )}
                aria-current={tab.key === currentTab ? 'page' : undefined}
                onClick={() => {
                  setCurrentTab(tab.key as TabType);
                  dispatch(setSelectedVersion(null));
                }}
              >
                {tab.name}
              </div>
            ))}
          </nav>
        </div>
      </div>
      <Table tabType={currentTab} />
    </div>
  );
}
