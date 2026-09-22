import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { Alert, Button } from '@onekeyfe/ui-components';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { marked } from 'marked';
import { getDeviceType } from '@onekeyfe/hd-core';
import type {
  FirmwareUpdateV4Target,
  IProtocolV2FirmwareComponentTarget,
} from '@onekeyfe/hd-core';
import { RootState } from '@/store';
import { serviceHardware } from '@/hardware';
import type { FirmwareUpdateV4Request } from '@/hardware';

type Pro2Tab = 'remote' | 'local';
type Pro2BinaryField =
  | 'bootloaderBinary'
  | 'applicationP1Binary'
  | 'applicationP2Binary'
  | 'coprocessorBinary'
  | 'se01Binary'
  | 'se02Binary'
  | 'se03Binary'
  | 'se04Binary';

type LocalTarget = {
  key: FirmwareUpdateV4Target;
  label: string;
  binaryField: Pro2BinaryField;
};

type LocalFileSelection = {
  file: File;
};

const TARGET_BY_CONFIG_TARGET: Partial<
  Record<IProtocolV2FirmwareComponentTarget, FirmwareUpdateV4Target>
> = {
  BOOTLOADER: 'boot',
  APPLICATION_P1: 'app_v1',
  APPLICATION_P2: 'app_v2',
  COPROCESSOR: 'coprocessor',
  SE01: 'se01',
  SE02: 'se02',
  SE03: 'se03',
  SE04: 'se04',
};

const LOCAL_TARGETS: LocalTarget[] = [
  { key: 'boot', label: 'Bootloader', binaryField: 'bootloaderBinary' },
  { key: 'app_v1', label: 'APP P1', binaryField: 'applicationP1Binary' },
  { key: 'app_v2', label: 'APP P2', binaryField: 'applicationP2Binary' },
  {
    key: 'coprocessor',
    label: 'Coprocessor',
    binaryField: 'coprocessorBinary',
  },
  { key: 'se01', label: 'SE01', binaryField: 'se01Binary' },
  { key: 'se02', label: 'SE02', binaryField: 'se02Binary' },
  { key: 'se03', label: 'SE03', binaryField: 'se03Binary' },
  { key: 'se04', label: 'SE04', binaryField: 'se04Binary' },
];

const formatVersion = (version?: number[]) => version?.join('.') || '-';

const SAFE_MARKDOWN_OPTIONS = {
  sanitize: true,
  silent: true,
} as const;

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

interface Pro2ReleaseInfoProps {
  clearTimer?: () => void;
}

const Pro2ReleaseInfo: FC<Pro2ReleaseInfoProps> = ({ clearTimer }) => {
  const intl = useIntl();
  const device = useSelector((state: RootState) => state.runtime.device);
  const currentDeviceType =
    device?.deviceType ?? getDeviceType(device?.features);
  const releaseDeviceType = currentDeviceType === 'neo' ? 'neo' : 'pro2';
  const localTargets = useMemo(
    () =>
      releaseDeviceType === 'neo'
        ? LOCAL_TARGETS.filter(
            (target) => target.key !== 'se03' && target.key !== 'se04'
          )
        : LOCAL_TARGETS,
    [releaseDeviceType]
  );
  const supportedFirmwareTargets = useMemo(
    () => new Set(localTargets.map((target) => target.key)),
    [localTargets]
  );
  const locale = useSelector((state: RootState) => state.runtime.locale);
  const release = useSelector(
    (state: RootState) =>
      state.runtime.releaseMap[releaseDeviceType]?.['firmware-v1']?.[0]
  );
  const deviceResourceSource = useSelector(
    (state: RootState) =>
      state.runtime.releaseMap[releaseDeviceType]?.resources?.source
  );
  const resourceSource = release?.resources?.source ?? deviceResourceSource;
  const releaseNotes = useMemo(() => {
    const notes = [release?.changelog?.[locale], release?.changelog?.['en-US']]
      .map((item) => item?.trim())
      .find(Boolean);

    return notes ?? '';
  }, [locale, release]);
  const [tab, setTab] = useState<Pro2Tab>('remote');
  const [isComponentListOpen, setIsComponentListOpen] = useState(false);
  const [selectedRemoteTargets, setSelectedRemoteTargets] = useState<
    FirmwareUpdateV4Target[]
  >([]);
  const [localFiles, setLocalFiles] = useState<
    Record<string, LocalFileSelection>
  >({});
  const [resourceArchiveFile, setResourceArchiveFile] = useState<File>();
  const [confirmed, setConfirmed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const remoteComponents = useMemo(() => {
    if (!release?.components) return [];
    const componentEntries = Object.entries(release.components);
    const orderedKeys = [
      ...(release.installOrder ?? []),
      ...componentEntries
        .map(([key]) => key)
        .filter((key) => !release.installOrder?.includes(key)),
    ];

    return orderedKeys.flatMap((key) => {
      const component = release.components?.[key];
      if (!component) return [];
      const target = TARGET_BY_CONFIG_TARGET[component.target];
      if (!target || !supportedFirmwareTargets.has(target)) return [];
      return [
        {
          key,
          label: localTargets.find((item) => item.key === target)?.label ?? key,
          target,
          version: component.version,
        },
      ];
    });
  }, [localTargets, release, supportedFirmwareTargets]);

  const remoteTargets = useMemo(() => {
    const targets = remoteComponents.map((component) => component.target);
    if (resourceSource?.archiveUrl) targets.push('resource');
    return targets;
  }, [remoteComponents, resourceSource?.archiveUrl]);

  useEffect(() => {
    setSelectedRemoteTargets(remoteTargets);
  }, [remoteTargets]);

  const toggleRemoteTarget = (target: FirmwareUpdateV4Target) => {
    setSelectedRemoteTargets((current) =>
      current.includes(target)
        ? current.filter((item) => item !== target)
        : [...current, target]
    );
  };

  const setLocalFile = (key: string, file: File | undefined) => {
    setLocalFiles((current) => {
      const next = { ...current };
      if (file) next[key] = { file };
      else delete next[key];
      return next;
    });
  };

  const selectedCount =
    tab === 'remote'
      ? selectedRemoteTargets.length
      : localTargets.filter((target) => localFiles[target.key]).length +
        (resourceArchiveFile ? 1 : 0);

  const handleInstall = useCallback(async () => {
    if (!device || !confirmed || selectedCount === 0 || isUpdating) return;

    setIsUpdating(true);
    clearTimer?.();
    try {
      const params: FirmwareUpdateV4Request = { platform: 'web' };
      if (tab === 'remote') {
        params.targetsToUpdate = selectedRemoteTargets;
      } else {
        for (const target of localTargets) {
          const selection = localFiles[target.key];
          if (selection) {
            params[target.binaryField] = await selection.file.arrayBuffer();
          }
        }

        if (resourceArchiveFile) {
          params.localResourceArchiveBinary =
            await resourceArchiveFile.arrayBuffer();
        }
      }

      await serviceHardware.firmwareUpdateV4(params);
    } finally {
      setIsUpdating(false);
    }
  }, [
    clearTimer,
    confirmed,
    device,
    isUpdating,
    localFiles,
    localTargets,
    resourceArchiveFile,
    selectedCount,
    selectedRemoteTargets,
    tab,
  ]);

  const renderLocalFilePicker = (key: string, label: string) => {
    const selection = localFiles[key];
    return (
      <div key={key} className="rounded-lg border border-gray-200 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="font-medium text-gray-900">{label}</div>
            {selection && (
              <div className="mt-2 truncate text-sm text-gray-600">
                {selection.file.name} · {formatFileSize(selection.file.size)}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {selection && (
              <button
                type="button"
                className="rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
                onClick={() => setLocalFile(key, undefined)}
              >
                {intl.formatMessage({ id: 'TR_PRO2_CLEAR_FILE' })}
              </button>
            )}
            <label className="cursor-pointer rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500">
              {intl.formatMessage({
                id: selection ? 'TR_PRO2_RESELECT_FILE' : 'TR_PRO2_SELECT_FILE',
              })}
              <input
                key={`${key}-${selection?.file.name ?? 'empty'}`}
                type="file"
                className="hidden"
                accept=".okpkg,.bin"
                onChange={(event) => setLocalFile(key, event.target.files?.[0])}
              />
            </label>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="my-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-8" aria-label="Pro2 firmware source">
          {(['remote', 'local'] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={`border-b-2 px-1 py-4 text-sm font-medium ${
                tab === item
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
              onClick={() => {
                setTab(item);
                setConfirmed(false);
              }}
            >
              {intl.formatMessage({
                id:
                  item === 'remote'
                    ? 'TR_REMOTE_FIRMWARE'
                    : 'TR_LOCAL_FIRMWARE',
              })}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'remote' ? (
        <div className="mt-6">
          {release ? (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="p-5 sm:p-6">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase text-brand-700">
                      {intl.formatMessage({ id: 'TR_PRO2_NEW_VERSION' })}
                    </div>
                    <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">
                      safeOS {formatVersion(release.version)}
                    </h2>
                    <div className="mt-2 text-sm text-gray-500 sm:text-base">
                      {remoteComponents.length}{' '}
                      {intl.formatMessage({ id: 'TR_PRO2_COMPONENT_COUNT' })}
                      {resourceSource?.archiveUrl && (
                        <>
                          {' · '}
                          {intl.formatMessage({
                            id: 'TR_PRO2_RESOURCE_COUNT',
                          })}
                        </>
                      )}
                      {' · '}
                      {intl.formatMessage(
                        { id: 'TR_PRO2_SELECTED_COMPONENT_COUNT' },
                        {
                          selected: selectedRemoteTargets.length,
                          total: remoteTargets.length,
                        }
                      )}
                    </div>
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-600">
                      {intl.formatMessage({
                        id: 'TR_PRO2_FIRMWARE_UPDATE_DESC',
                      })}
                    </p>
                  </div>
                  <div className="w-full shrink-0 sm:w-48">
                    <Button
                      block
                      type="primary"
                      size="xl"
                      loading={isUpdating}
                      disabled={
                        !device ||
                        !confirmed ||
                        selectedCount === 0 ||
                        isUpdating
                      }
                      onClick={handleInstall}
                    >
                      {intl.formatMessage({ id: 'TR_PRO2_UPDATE_DEVICE' })}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-gray-900 sm:text-base">
                      {intl.formatMessage({ id: 'TR_PRO2_SELECT_COMPONENTS' })}
                    </h3>
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                      {selectedRemoteTargets.length}/{remoteTargets.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                    aria-expanded={isComponentListOpen}
                    aria-controls="pro2-component-list"
                    onClick={() =>
                      setIsComponentListOpen((current) => !current)
                    }
                  >
                    {intl.formatMessage({
                      id: isComponentListOpen
                        ? 'TR_PRO2_HIDE_COMPONENTS'
                        : 'TR_PRO2_CUSTOMIZE_COMPONENTS',
                    })}
                    <ChevronDownIcon
                      aria-hidden="true"
                      className={`h-4 w-4 transition-transform motion-reduce:transition-none ${
                        isComponentListOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </div>
                <div id="pro2-component-list" hidden={!isComponentListOpen}>
                  <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-5 py-2 text-sm sm:px-6">
                    <button
                      type="button"
                      className="text-brand-600 hover:text-brand-500"
                      onClick={() => setSelectedRemoteTargets(remoteTargets)}
                    >
                      {intl.formatMessage({ id: 'TR_PRO2_SELECT_ALL' })}
                    </button>
                    <button
                      type="button"
                      className="text-gray-500 hover:text-gray-700"
                      onClick={() => setSelectedRemoteTargets([])}
                    >
                      {intl.formatMessage({ id: 'TR_PRO2_CLEAR_ALL' })}
                    </button>
                  </div>
                  {[
                    ...remoteComponents,
                    ...(resourceSource?.archiveUrl
                      ? [
                          {
                            key: 'resource',
                            label: intl.formatMessage({
                              id: 'TR_PRO2_RESOURCES',
                            }),
                            target: 'resource' as const,
                            version: release.version,
                          },
                        ]
                      : []),
                  ].map((component) => (
                    <label
                      key={component.key}
                      className="flex cursor-pointer items-center justify-between border-t border-gray-100 px-5 py-3 hover:bg-gray-50 sm:px-6"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                          checked={selectedRemoteTargets.includes(
                            component.target
                          )}
                          onChange={() => toggleRemoteTarget(component.target)}
                        />
                        <span className="text-sm font-medium text-gray-900">
                          {component.label}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {formatVersion(component.version)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div
                className="border-t border-gray-200 px-5 py-6 sm:px-6"
                aria-labelledby="pro2-release-notes-title"
              >
                <h3
                  id="pro2-release-notes-title"
                  className="text-lg font-semibold text-gray-900"
                >
                  {intl.formatMessage(
                    { id: 'TR_PRO2_RELEASE_NOTES' },
                    { version: formatVersion(release.version) }
                  )}
                </h3>
                {releaseNotes ? (
                  <div
                    className="changelog-content mt-3 text-sm leading-6 text-gray-700"
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{
                      __html: marked.parse(releaseNotes, SAFE_MARKDOWN_OPTIONS),
                    }}
                  />
                ) : (
                  <p className="mt-3 text-sm text-gray-500">
                    {intl.formatMessage({
                      id: 'TR_PRO2_RELEASE_NOTES_UNAVAILABLE',
                    })}
                  </p>
                )}
              </div>

              <div className="border-t border-gray-200 bg-gray-50 px-5 py-5 sm:px-6">
                <label className="flex items-start gap-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    checked={confirmed}
                    onChange={(event) => setConfirmed(event.target.checked)}
                  />
                  <span>
                    {intl.formatMessage({ id: 'TR_FIRMWARE_USER_ENSURE' })}
                  </span>
                </label>
              </div>
            </div>
          ) : (
            <Alert
              type="warning"
              title={intl.formatMessage({ id: 'TR_NO_FIRMWARE_AVAILABLE' })}
            />
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          <Alert
            type="warning"
            title={intl.formatMessage({ id: 'TR_LOCAL_FIRMWARE_UPLOAD' })}
            content={intl.formatMessage({
              id: 'TR_LOCAL_FIRMWARE_DESCRIPTION',
            })}
          />
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              {intl.formatMessage({ id: 'TR_PRO2_FIRMWARE_COMPONENTS' })}
            </h3>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {localTargets.map((target) =>
                renderLocalFilePicker(target.key, target.label)
              )}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {intl.formatMessage({ id: 'TR_PRO2_RESOURCES' })}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {resourceArchiveFile
                    ? `${resourceArchiveFile.name} · ${formatFileSize(
                        resourceArchiveFile.size
                      )}`
                    : 'Select the Protocol V2 resource ZIP. Each .okpkg must carry its own RESC device path.'}
                </div>
              </div>
              <div className="flex gap-2">
                <label className="cursor-pointer rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500">
                  Select CI ZIP
                  <input
                    type="file"
                    className="hidden"
                    accept=".zip,application/zip"
                    onChange={(event) => {
                      const zipFile = event.currentTarget.files?.[0];
                      event.currentTarget.value = '';
                      if (!zipFile) return;
                      setResourceArchiveFile(zipFile);
                    }}
                  />
                </label>
                {resourceArchiveFile && (
                  <button
                    type="button"
                    className="rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
                    onClick={() => setResourceArchiveFile(undefined)}
                  >
                    {intl.formatMessage({ id: 'TR_PRO2_CLEAR_FILE' })}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'local' && (
        <div className="mt-6 flex flex-col items-center">
          <label className="flex items-start gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>{intl.formatMessage({ id: 'TR_FIRMWARE_USER_ENSURE' })}</span>
          </label>
          <div className="mt-4">
            <Button
              type="primary"
              size="xl"
              loading={isUpdating}
              disabled={
                !device || !confirmed || selectedCount === 0 || isUpdating
              }
              onClick={handleInstall}
            >
              {intl.formatMessage({ id: 'TR_FIRMWARE_HEADING' })}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pro2ReleaseInfo;
