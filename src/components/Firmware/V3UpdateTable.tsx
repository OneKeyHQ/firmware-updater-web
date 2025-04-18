import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import semver from 'semver';
import { RootState } from '@/store';
import {
  setV3UpdateSelections,
  setSelectedV3Component,
} from '@/store/reducers/runtime';
import { getDeviceType, getDeviceBootloaderVersion } from '@onekeyfe/hd-core';
import type { IFirmwareReleaseInfo, IBLEFirmwareReleaseInfo } from '@/types';
import { marked } from 'marked';

interface ComponentItem {
  type: 'fw' | 'ble' | 'boot';
  title: string;
  description: string;
  latestVersion: string;
  changelog: string;
  versions: Array<{
    version: string;
    info: IFirmwareReleaseInfo | IBLEFirmwareReleaseInfo;
  }>;
  downloadUrl?: string;
}

const V3UpdateTable = () => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const device = useSelector((state: RootState) => state.runtime.device);
  const releaseMap = useSelector(
    (state: RootState) => state.runtime.releaseMap
  );
  const v3UpdateSelections = useSelector(
    (state: RootState) => state.runtime.v3UpdateSelections
  );
  const selectedV3Components = useSelector(
    (state: RootState) => state.runtime.selectedV3Components
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

    // Firmware (fw)
    if (releaseMap[deviceType] && releaseMap[deviceType]['firmware-v6']) {
      const fwVersions =
        releaseMap[deviceType]?.['firmware-v6']?.map(
          (info: IFirmwareReleaseInfo) => ({
            version: info.version.join('.'),
            info,
          })
        ) || [];

      if (fwVersions.length > 0) {
        const latestInfo = fwVersions[0].info;
        components.push({
          type: 'fw',
          title: intl.formatMessage({ id: 'TR_FIRMWARE' }),
          description: 'Firmware',
          latestVersion: fwVersions[0].version,
          changelog: latestInfo.changelog?.[locale] || '',
          versions: fwVersions,
          downloadUrl: latestInfo.url || '',
        });
      }
    }

    // BLE
    if (releaseMap[deviceType] && releaseMap[deviceType].ble) {
      const bleVersions =
        releaseMap[deviceType]?.ble?.map((info: IBLEFirmwareReleaseInfo) => ({
          version: info.version.join('.'),
          info,
        })) || [];

      if (bleVersions.length > 0) {
        const latestInfo = bleVersions[0].info;
        components.push({
          type: 'ble',
          title: intl.formatMessage({ id: 'TR_BLUETOOTH_FIRMWARE' }),
          description: 'Bluetooth Firmware',
          latestVersion: bleVersions[0].version,
          changelog: latestInfo.changelog?.[locale] || '',
          versions: bleVersions,
          downloadUrl: latestInfo.url || '',
        });
      }
    }

    // Bootloader (boot)
    if (releaseMap[deviceType] && releaseMap[deviceType]['firmware-v6']) {
      const bootVersions =
        releaseMap[deviceType]?.['firmware-v6']
          ?.filter((info: IFirmwareReleaseInfo) => info.bootloaderVersion)
          .map((info: IFirmwareReleaseInfo) => ({
            version: info.bootloaderVersion?.join('.') || '',
            info,
          })) || [];

      if (bootVersions.length > 0) {
        const latestInfo = bootVersions[0].info;
        components.push({
          type: 'boot',
          title: intl.formatMessage({ id: 'TR_BOOTLOADER' }),
          description: 'Bootloader',
          latestVersion: bootVersions[0].version,
          changelog: latestInfo.bootloaderChangelog?.[locale] || '',
          versions: bootVersions,
          downloadUrl: latestInfo.bootloaderResource || '',
        });
      }
    }

    return components;
  }, [device, releaseMap, isV3Supported, locale, intl]);

  // Get resource item if available
  const resourceItem = useMemo(() => {
    if (!device?.features || !isV3Supported) return null;

    const deviceType = getDeviceType(device.features);

    // 检查releaseMap中是否有资源信息
    let resourceUrl = '';
    let resourceVersion = '';

    // 从firmware-v6数组的第一个元素中获取资源URL
    if (releaseMap && deviceType) {
      const firmwareV5 = releaseMap[deviceType]?.['firmware-v6'];
      if (
        firmwareV5 &&
        Array.isArray(firmwareV5) &&
        firmwareV5.length > 0 &&
        firmwareV5[0]?.resource
      ) {
        resourceUrl = firmwareV5[0].resource;
        // 从URL中提取版本信息
        if (resourceUrl) {
          const versionMatch = resourceUrl.match(
            /res-([0-9]+(?:\.[0-9]+)*(?:-[0-9]+(?:\.[0-9]+)*))/i
          );
          if (versionMatch && versionMatch[1]) {
            resourceVersion = versionMatch[1];
            console.log(
              'Extracted resource version from URL:',
              resourceVersion
            );
          } else if (firmwareV5[0]?.version) {
            // 如果无法从URL中提取版本，使用固件版本作为备选
            const version = firmwareV5[0].version;
            if (Array.isArray(version)) {
              resourceVersion = version.join('.');
              console.log(
                'Using firmware version as resource version:',
                resourceVersion
              );
            }
          }
        }
      }
    }

    // 如果没有找到资源URL，则不提供资源选项
    if (!resourceUrl) {
      console.log('No resource URL found in firmware-v6');
      return null;
    }

    return {
      type: 'resource' as const,
      title: intl.formatMessage({ id: 'TR_RESOURCE' }) || '资源',
      description: '资源文件',
      latestVersion: resourceVersion,
      changelog: '',
      downloadUrl: resourceUrl,
    };
  }, [device, releaseMap, isV3Supported, intl]);

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
                  {availableComponents.map((component) => {
                    const selection = v3UpdateSelections[component.type] || {};
                    const isSelected = selectedV3Components.includes(
                      component.type
                    );
                    const isExpanded = expandedChangelogs[component.type];

                    // 获取组件类型显示文本
                    let componentTypeText = '';
                    switch (component.type) {
                      case 'fw':
                        componentTypeText = intl.formatMessage({
                          id: 'TR_FIRMWARE',
                        });
                        break;
                      case 'ble':
                        componentTypeText = intl.formatMessage({
                          id: 'TR_BLUETOOTH_FIRMWARE',
                        });
                        break;
                      case 'boot':
                        componentTypeText = intl.formatMessage({
                          id: 'TR_BOOTLOADER',
                        });
                        break;
                      default:
                        componentTypeText = component.type;
                    }

                    return (
                      <>
                        <tr
                          style={{
                            backgroundColor:
                              isSelected && selection.source === 'remote'
                                ? '#dff7e6'
                                : 'white',
                          }}
                        >
                          <td className="px-3 py-4 text-sm text-gray-800 w-28">
                            {componentTypeText}
                          </td>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            <div className="flex flex-col">
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  id={`v3-component-${component.type}`}
                                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                  checked={
                                    isSelected && selection.source === 'remote'
                                  }
                                  onChange={() => {
                                    // 可以取消勾选，二次点击就是取消
                                    const currentSelection =
                                      v3UpdateSelections[component.type] || {};

                                    // 如果当前已选中且来源是远程，则取消选择
                                    if (
                                      isSelected &&
                                      selection.source === 'remote'
                                    ) {
                                      dispatch(
                                        setSelectedV3Component({
                                          component: component.type,
                                          selected: false,
                                        })
                                      );
                                    } else {
                                      // 否则选中并设置为远程源
                                      dispatch(
                                        setV3UpdateSelections({
                                          [component.type]: {
                                            ...currentSelection,
                                            source: 'remote',
                                            version: component.latestVersion,
                                          },
                                        })
                                      );
                                      dispatch(
                                        setSelectedV3Component({
                                          component: component.type,
                                          selected: true,
                                        })
                                      );
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`v3-component-${component.type}`}
                                  className="ml-3 block text-sm font-medium text-gray-900"
                                >
                                  {component.latestVersion}
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
                                  onClick={() =>
                                    toggleChangelog(component.type)
                                  }
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
                        </tr>
                        {isExpanded && component.changelog && (
                          <tr>
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
                        )}
                      </>
                    );
                  })}
                  {/* Resource row */}
                  {resourceItem && (
                    <tr
                      key="resource"
                      style={{
                        backgroundColor:
                          selectedV3Components.includes('resource') &&
                          v3UpdateSelections.resource?.source === 'remote'
                            ? '#dff7e6'
                            : 'white',
                      }}
                    >
                      <td className="px-3 py-4 text-sm text-gray-800 w-28">
                        {intl.formatMessage({ id: 'TR_RESOURCE' }) || '资源'}
                      </td>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="v3-component-resource"
                            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                            checked={
                              selectedV3Components.includes('resource') &&
                              v3UpdateSelections.resource?.source === 'remote'
                            }
                            onChange={() => {
                              const currentSelection =
                                v3UpdateSelections.resource || {};

                              if (
                                selectedV3Components.includes('resource') &&
                                v3UpdateSelections.resource?.source === 'remote'
                              ) {
                                dispatch(
                                  setSelectedV3Component({
                                    component: 'resource',
                                    selected: false,
                                  })
                                );
                              } else {
                                dispatch(
                                  setV3UpdateSelections({
                                    resource: {
                                      ...currentSelection,
                                      source: 'remote',
                                      version: resourceItem.latestVersion,
                                    },
                                  })
                                );
                                dispatch(
                                  setSelectedV3Component({
                                    component: 'resource',
                                    selected: true,
                                  })
                                );
                              }
                            }}
                          />
                          <label
                            htmlFor="v3-component-resource"
                            className="ml-3 block text-sm font-medium text-gray-900"
                          >
                            {resourceItem.latestVersion || ''}
                          </label>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-800">
                        <div
                          className="changelog-content"
                          // eslint-disable-next-line react/no-danger
                        />
                      </td>
                    </tr>
                  )}
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
