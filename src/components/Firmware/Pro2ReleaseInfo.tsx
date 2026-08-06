import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { Alert, Button } from '@onekeyfe/ui-components';
import { marked } from 'marked';
import type {
  FirmwareUpdateV4Params,
  FirmwareUpdateV4Target,
  IProtocolV2FirmwareComponentTarget,
} from '@onekeyfe/hd-core';
import { RootState } from '@/store';
import { serviceHardware } from '@/hardware';
import { buildResourceFilesFromDirectory } from '@/utils/protocolV2ResourceManifest';

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
  devicePath?: string;
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
  const locale = useSelector((state: RootState) => state.runtime.locale);
  const protocolV2DeviceType = device?.deviceType === 'neo' ? 'neo' : 'pro2';
  const release = useSelector(
    (state: RootState) =>
      state.runtime.releaseMap[protocolV2DeviceType]?.['firmware-v1']?.[0]
  );
  const bootResources = useSelector(
    (state: RootState) =>
      state.runtime.releaseMap[protocolV2DeviceType]?.resources?.boot
  );
  const [tab, setTab] = useState<Pro2Tab>('remote');
  const [selectedRemoteTargets, setSelectedRemoteTargets] = useState<
    FirmwareUpdateV4Target[]
  >([]);
  const [localFiles, setLocalFiles] = useState<
    Record<string, LocalFileSelection>
  >({});
  const [resourceDirectory, setResourceDirectory] = useState<File[]>([]);
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
      if (!target) return [];
      return [
        {
          key,
          label:
            LOCAL_TARGETS.find((item) => item.key === target)?.label ?? key,
          target,
          version: component.version,
        },
      ];
    });
  }, [release]);

  const remoteTargets = useMemo(() => {
    const targets = remoteComponents.map((component) => component.target);
    if (release?.resourceBundles?.length) targets.push('resource');
    return targets;
  }, [release, remoteComponents]);

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

  const setLocalFile = (
    key: string,
    file: File | undefined,
    devicePath?: string
  ) => {
    setLocalFiles((current) => {
      const next = { ...current };
      if (file) next[key] = { file, devicePath };
      else delete next[key];
      return next;
    });
  };

  const selectedCount =
    tab === 'remote'
      ? selectedRemoteTargets.length
      : Object.keys(localFiles).length + (resourceDirectory.length ? 1 : 0);

  const handleInstall = useCallback(async () => {
    if (!device || !confirmed || selectedCount === 0 || isUpdating) return;

    setIsUpdating(true);
    clearTimer?.();
    try {
      const params: FirmwareUpdateV4Params = { platform: 'web' };
      if (tab === 'remote') {
        params.targetsToUpdate = selectedRemoteTargets;
      } else {
        for (const target of LOCAL_TARGETS) {
          const selection = localFiles[target.key];
          if (selection) {
            params[target.binaryField] = await selection.file.arrayBuffer();
          }
        }

        if (resourceDirectory.length) {
          params.resourceFiles = await buildResourceFilesFromDirectory(
            resourceDirectory
          );
        } else {
          const resourceFiles = Object.entries(localFiles)
            .filter(
              ([key, selection]) =>
                key.startsWith('resource:') && Boolean(selection.devicePath)
            )
            .map(async ([, selection]) => ({
              binary: await selection.file.arrayBuffer(),
              devicePath: selection.devicePath as string,
            }));
          if (resourceFiles.length) {
            params.resourceFiles = await Promise.all(resourceFiles);
          }
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
    resourceDirectory,
    selectedCount,
    selectedRemoteTargets,
    tab,
  ]);

  const renderLocalFilePicker = (
    key: string,
    label: string,
    devicePath?: string
  ) => {
    const selection = localFiles[key];
    return (
      <div key={key} className="rounded-lg border border-gray-200 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="font-medium text-gray-900">{label}</div>
            {devicePath && (
              <div className="mt-1 break-all font-mono text-xs text-gray-500">
                {devicePath}
              </div>
            )}
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
                onChange={(event) =>
                  setLocalFile(key, event.target.files?.[0], devicePath)
                }
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
        <nav
          className="-mb-px flex gap-8"
          aria-label="Protocol V2 firmware source"
        >
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
        <div className="mt-4 space-y-4">
          {release ? (
            <>
              <div className="rounded-lg border border-gray-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-gray-500">
                      {intl.formatMessage({ id: 'TR_PRO2_REMOTE_VERSION' })}
                    </div>
                    <div className="mt-1 text-xl font-semibold text-gray-900">
                      {formatVersion(release.version)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {remoteComponents.length}{' '}
                    {intl.formatMessage({ id: 'TR_PRO2_COMPONENT_COUNT' })}
                    {release.resourceBundles?.length
                      ? ` · ${
                          release.resourceBundles.length
                        } ${intl.formatMessage({
                          id: 'TR_PRO2_RESOURCE_COUNT',
                        })}`
                      : ''}
                  </div>
                </div>
                {release.changelog?.[locale] && (
                  <div
                    className="changelog-content mt-4 text-sm text-gray-700"
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{
                      __html: marked.parse(release.changelog[locale]),
                    }}
                  />
                )}
              </div>

              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
                  <span className="text-sm font-semibold text-gray-900">
                    {intl.formatMessage({ id: 'TR_PRO2_SELECT_COMPONENTS' })}
                  </span>
                  <div className="flex gap-3 text-sm">
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
                </div>
                {[
                  ...remoteComponents,
                  ...(release.resourceBundles?.length
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
                    className="flex cursor-pointer items-center justify-between border-b border-gray-100 px-4 py-3 last:border-b-0 hover:bg-gray-50"
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

              {bootResources && (
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="text-sm font-semibold text-gray-900">
                      {intl.formatMessage({
                        id: 'TR_PRO2_BOOT_RESOURCES',
                      })}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {intl.formatMessage({
                        id: 'TR_PRO2_BOOT_RESOURCES_DESC',
                      })}
                    </div>
                  </div>
                  <label className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                        checked={selectedRemoteTargets.includes(
                          'boot_resources'
                        )}
                        onChange={() => toggleRemoteTarget('boot_resources')}
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {intl.formatMessage({
                            id: 'TR_PRO2_BOOT_RESOURCES_PACKAGE',
                          })}
                        </div>
                        <div className="mt-0.5 text-xs text-amber-600">
                          {intl.formatMessage({ id: 'TR_PRO2_OPTIONAL' })}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatFileSize(
                        bootResources.files.reduce(
                          (total, file) => total + file.size,
                          0
                        )
                      )}
                    </span>
                  </label>
                </div>
              )}
            </>
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
              {LOCAL_TARGETS.map((target) =>
                renderLocalFilePicker(target.key, target.label)
              )}
            </div>
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold text-gray-900">
              {intl.formatMessage({ id: 'TR_PRO2_FULL_RESOURCES' })}
            </h3>
            <p className="mb-3 text-xs text-gray-500">
              {intl.formatMessage({ id: 'TR_PRO2_FULL_RESOURCES_DESC' })}
            </p>
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 text-sm text-gray-600">
                  {resourceDirectory.length
                    ? intl.formatMessage(
                        { id: 'TR_PRO2_RESOURCE_FILES_SELECTED' },
                        { count: resourceDirectory.length }
                      )
                    : intl.formatMessage({
                        id: 'TR_PRO2_RESOURCE_DIRECTORY_EXPECTED',
                      })}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!!resourceDirectory.length && (
                    <button
                      type="button"
                      className="rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
                      onClick={() => setResourceDirectory([])}
                    >
                      {intl.formatMessage({ id: 'TR_PRO2_CLEAR_FILE' })}
                    </button>
                  )}
                  <label className="cursor-pointer rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500">
                    {intl.formatMessage({
                      id: resourceDirectory.length
                        ? 'TR_PRO2_RESELECT_FILE'
                        : 'TR_PRO2_SELECT_DIRECTORY',
                    })}
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      aria-label={intl.formatMessage({
                        id: 'TR_PRO2_SELECT_DIRECTORY',
                      })}
                      {...({
                        webkitdirectory: '',
                        directory: '',
                      } as React.InputHTMLAttributes<HTMLInputElement>)}
                      onChange={(event) => {
                        const files = Array.from(event.target.files ?? []);
                        setResourceDirectory(files);
                        if (files.length) {
                          setLocalFiles((current) =>
                            Object.fromEntries(
                              Object.entries(current).filter(
                                ([key]) => !key.startsWith('resource:')
                              )
                            )
                          );
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
          {!!release?.resourceBundles?.length && !resourceDirectory.length && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-900">
                {intl.formatMessage({ id: 'TR_PRO2_RESOURCE_BUNDLES' })}
              </h3>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {release.resourceBundles.map((bundle) =>
                  renderLocalFilePicker(
                    `resource:${bundle.name}`,
                    bundle.name,
                    bundle.devicePath
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}

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
    </div>
  );
};

export default Pro2ReleaseInfo;
