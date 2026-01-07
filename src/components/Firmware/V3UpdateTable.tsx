import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import semver from 'semver';
import { RootState } from '@/store';
import { getDeviceType, getDeviceBootloaderVersion } from '@onekeyfe/hd-core';
// import type { IFirmwareReleaseInfo, IBLEFirmwareReleaseInfo } from '@/types';
import { marked } from 'marked';
import { useV3Components, V3ComponentType } from '@/utils/v3FirmwareUtils';

interface ComponentItem {
  type: V3ComponentType;
  title: string;
  description: string;
  changelog: string;
  downloadUrl: string;
  version: string;
}

const V3UpdateTable: React.FC = () => {
  const intl = useIntl();
  const {
    device,
    v3UpdateSelections,
    selectedV3Components,
    toggleComponentSelection,
    getComponentTypeText,
  } = useV3Components();

  const releaseMap = useSelector(
    (state: RootState) => state.runtime.releaseMap
  );
  const locale = useSelector((state: RootState) => state.runtime.locale);

  // State for tracking which changelogs are expanded
  const [expandedChangelogs, setExpandedChangelogs] = useState<
    Record<string, boolean>
  >({});

  // Toggle changelog expansion
  const toggleChangelog = (componentType: string) => {
    setExpandedChangelogs((prev) => ({
      ...prev,
      [componentType]: !prev[componentType],
    }));
  };

  // Check if device supports V3 update
  const isV3Supported = useMemo(() => {
    if (!device?.features) return false;

    // Check if it's a Pro device
    const deviceType = getDeviceType(device.features);
    if (deviceType !== 'pro') return false;

    // Check if bootloader version is >= 2.8.0
    const bootloaderVersion = getDeviceBootloaderVersion(device.features).join(
      '.'
    );
    if (!semver.gte(bootloaderVersion, '2.8.0')) return false;

    return true;
  }, [device]);

  // Get available firmware versions
  const availableComponents = useMemo(() => {
    if (!device?.features || !releaseMap || !isV3Supported) return [];

    const deviceType = getDeviceType(device.features);
    const components: ComponentItem[] = [];

    const fieldInfo = releaseMap[deviceType]?.['firmware-v8']?.[0];
    const bleFieldInfo = releaseMap[deviceType]?.ble?.[0];
    // Bootloader (boot)
    if (fieldInfo) {
      components.push({
        type: 'boot',
        title: intl.formatMessage({ id: 'TR_BOOTLOADER' }),
        description: 'Bootloader',
        changelog: fieldInfo.bootloaderChangelog?.[locale] || '',
        version: fieldInfo.displayBootloaderVersion?.join('.') || '',
        downloadUrl: fieldInfo.bootloaderResource || '',
      });
    }
    // Firmware (fw)
    if (fieldInfo) {
      components.push({
        type: 'fw',
        title: intl.formatMessage({ id: 'TR_FIRMWARE' }),
        description: 'Firmware',
        changelog: fieldInfo.changelog?.[locale] || '',
        version: fieldInfo.version.join('.'),
        downloadUrl: fieldInfo.url || '',
      });
    }

    // BLE
    if (bleFieldInfo) {
      components.push({
        type: 'ble',
        title: intl.formatMessage({ id: 'TR_BLUETOOTH_FIRMWARE' }),
        description: 'Bluetooth Firmware',
        version: bleFieldInfo.version.join('.'),
        changelog: bleFieldInfo.changelog?.[locale] || '',
        downloadUrl: bleFieldInfo.url || '',
      });
    }

    return components;
  }, [device, releaseMap, isV3Supported, locale, intl]);

  // Render component row with its changelog row if expanded
  const renderComponentRow = (component: ComponentItem) => {
    const selection = v3UpdateSelections[component.type] || {};
    const isSelected = selectedV3Components.includes(component.type);
    const isExpanded = expandedChangelogs[component.type];

    return [
      <tr
        key={`component-${component.type}`}
        style={{
          backgroundColor:
            isSelected && selection.source === 'remote' ? '#dff7e6' : 'white',
        }}
      >
        <td className="px-3 py-4 text-sm text-gray-800 w-28">
          {getComponentTypeText(component.type)}
        </td>
        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
          <div className="flex flex-col">
            <div className="flex items-center">
              <input
                type="checkbox"
                id={`v3-component-${component.type}`}
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                checked={isSelected && selection.source === 'remote'}
                onChange={() => {
                  toggleComponentSelection(
                    component.type,
                    'remote',
                    component.version
                  );
                }}
              />
              <label
                htmlFor={`v3-component-${component.type}`}
                className="ml-3 block text-sm font-medium text-gray-900"
              >
                {component.version}
              </label>
            </div>
          </div>
        </td>
        <td className="px-3 py-4 text-sm text-gray-800">
          {component.changelog &&
            (component.changelog.length < 100 ? (
              <div
                className="changelog-content"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{
                  __html: marked.parse(component.changelog),
                }}
              />
            ) : (
              <button
                type="button"
                className="flex items-center text-sm text-brand-600 hover:text-brand-500 focus:outline-none"
                onClick={() => toggleChangelog(component.type)}
              >
                <svg
                  className={`h-5 w-5 mr-1 transform ${
                    isExpanded ? 'rotate-90' : ''
                  } transition-transform duration-200`}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {isExpanded
                  ? intl.formatMessage({
                      id: 'TR_HIDE_CHANGELOG',
                    }) || '收起日志'
                  : intl.formatMessage({
                      id: 'TR_SHOW_CHANGELOG',
                    }) || '展开日志'}
              </button>
            ))}
        </td>
      </tr>,
      isExpanded && component.changelog && (
        <tr key={`changelog-${component.type}`}>
          <td
            colSpan={3}
            className="whitespace-nowrap px-3 py-4 text-sm text-gray-800"
          >
            <div
              className="changelog-content"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{
                __html: marked.parse(component.changelog),
              }}
            />
          </td>
        </tr>
      ),
    ].filter(Boolean);
  };

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
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      {intl.formatMessage({ id: 'TR_FIRMWARE_TYPE' }) ||
                        '固件类型'}
                    </th>
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
                  {availableComponents.flatMap(renderComponentRow)}

                  {availableComponents.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="py-4 pl-4 pr-3 text-sm font-normal text-gray-700 sm:pl-6"
                      >
                        {intl.formatMessage({ id: 'TR_NO_FIRMWARE_AVAILABLE' })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default V3UpdateTable;
