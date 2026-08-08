import JSZip from 'jszip';

import type {
  CoreApi,
  FirmwareUpdateV4Target,
  IProtocolV2ResourceManifest,
  ProtocolV2PreparedResourceFile,
} from '@onekeyfe/hd-core';

type ResourcePreparer = Pick<CoreApi, 'prepareProtocolV2ResourceFiles'>;

const RESOURCE_TARGETS: FirmwareUpdateV4Target[] = [
  'resource',
  'boot_resources',
];

function parseManifest(text: string): IProtocolV2ResourceManifest {
  try {
    return JSON.parse(text) as IProtocolV2ResourceManifest;
  } catch {
    throw new Error('Invalid resource manifest JSON');
  }
}

function getManifestEntries(manifest: IProtocolV2ResourceManifest) {
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    throw new Error('Resource manifest has no files');
  }
  for (let index = 0; index < manifest.files.length; index += 1) {
    const entry = manifest.files[index];
    const archivePath = entry?.archive_path;
    if (
      typeof archivePath !== 'string' ||
      archivePath.startsWith('/') ||
      archivePath.includes('\\') ||
      archivePath.includes(':') ||
      archivePath
        .split('/')
        .some((part) => !part || part === '.' || part === '..')
    ) {
      throw new Error(`Invalid resource archive path at files[${index}]`);
    }
  }
  return manifest.files;
}

function getDirectoryRelativePath(file: File) {
  const relativePath = file.webkitRelativePath || file.name;
  const parts = relativePath.split('/');
  return parts.length > 1 ? parts.slice(1).join('/') : relativePath;
}

function prepareResourceFiles({
  hardwareSDK,
  manifest,
  files,
  targetsToUpdate = RESOURCE_TARGETS,
}: {
  hardwareSDK: ResourcePreparer;
  manifest: IProtocolV2ResourceManifest;
  files: Array<{ archivePath: string; binary: ArrayBuffer }>;
  targetsToUpdate?: FirmwareUpdateV4Target[];
}) {
  return hardwareSDK.prepareProtocolV2ResourceFiles({
    manifest,
    files,
    targetsToUpdate,
  });
}

export async function preparePro2ResourcePackageDirectory({
  hardwareSDK,
  selectedFiles,
}: {
  hardwareSDK: ResourcePreparer;
  selectedFiles: readonly File[];
}): Promise<ProtocolV2PreparedResourceFile[]> {
  const filesByPath = new Map(
    selectedFiles.map((file) => [getDirectoryRelativePath(file), file] as const)
  );
  const manifestFile = filesByPath.get('manifest.json');
  if (!manifestFile) {
    throw new Error('Missing resource manifest.json');
  }
  const manifest = parseManifest(await manifestFile.text());
  const files = await Promise.all(
    getManifestEntries(manifest).map(async (entry) => {
      const file = filesByPath.get(entry.archive_path);
      if (!file) {
        throw new Error(`Missing resource package: ${entry.archive_path}`);
      }
      return {
        archivePath: entry.archive_path,
        binary: await file.arrayBuffer(),
      };
    })
  );
  return prepareResourceFiles({ hardwareSDK, manifest, files });
}

export async function preparePro2ResourcePackageZip({
  hardwareSDK,
  zipFile,
}: {
  hardwareSDK: ResourcePreparer;
  zipFile: File;
}): Promise<ProtocolV2PreparedResourceFile[]> {
  const zip = await JSZip.loadAsync(zipFile);
  const manifestEntry = zip.file('manifest.json');
  if (!manifestEntry) {
    throw new Error('Missing resource manifest.json');
  }
  const manifest = parseManifest(await manifestEntry.async('text'));
  const files = await Promise.all(
    getManifestEntries(manifest).map(async (entry) => {
      const packageEntry = zip.file(entry.archive_path);
      if (!packageEntry) {
        throw new Error(`Missing resource package: ${entry.archive_path}`);
      }
      return {
        archivePath: entry.archive_path,
        binary: await packageEntry.async('arraybuffer'),
      };
    })
  );
  return prepareResourceFiles({ hardwareSDK, manifest, files });
}

export async function preparePro2RemoteResourcePackage({
  hardwareSDK,
  manifestUrl,
  targetsToUpdate,
}: {
  hardwareSDK: ResourcePreparer;
  manifestUrl: string;
  targetsToUpdate: FirmwareUpdateV4Target[];
}): Promise<ProtocolV2PreparedResourceFile[]> {
  const manifestResponse = await fetch(manifestUrl);
  if (!manifestResponse.ok) {
    throw new Error(
      `Failed to download resource manifest: ${manifestResponse.status}`
    );
  }
  const manifest =
    (await manifestResponse.json()) as IProtocolV2ResourceManifest;
  const files = await Promise.all(
    getManifestEntries(manifest).map(async (entry) => {
      const fileUrl = new URL(entry.archive_path, manifestUrl).toString();
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to download resource package: ${entry.archive_path}`
        );
      }
      return {
        archivePath: entry.archive_path,
        binary: await response.arrayBuffer(),
      };
    })
  );
  return prepareResourceFiles({
    hardwareSDK,
    manifest,
    files,
    targetsToUpdate,
  });
}
