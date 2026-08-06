import type { FirmwareUpdateV4Params } from '@onekeyfe/hd-core';

type FirmwareUpdateV4ResourceFile = NonNullable<
  FirmwareUpdateV4Params['resourceFiles']
>[number];

type ResourceManifestEntry = {
  archive_path: string;
  device_path: string;
  size: number;
  sha256: string;
};

type ResourceManifest = {
  schema: number;
  files: ResourceManifestEntry[];
};

const normalizeRelativePath = (path: string) =>
  path.replace(/^\.\//, '').replace(/\\/g, '/');

const readFile = <T extends string | ArrayBuffer>(
  file: File,
  method: 'readAsText' | 'readAsArrayBuffer'
) =>
  new Promise<T>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(reader.error ?? new Error(`Failed to read ${file.name}`));
    reader.onload = () => resolve(reader.result as T);
    reader[method](file);
  });

const isSafeRelativePath = (path: string) => {
  const normalized = normalizeRelativePath(path);
  return (
    normalized.length > 0 &&
    !normalized.startsWith('/') &&
    !normalized.split('/').includes('..')
  );
};

export const parseResourceManifest = (value: unknown): ResourceManifest => {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid resource manifest');
  }

  const manifest = value as Partial<ResourceManifest>;
  if (manifest.schema !== 1 || !Array.isArray(manifest.files)) {
    throw new Error('Unsupported resource manifest schema');
  }

  const devicePaths = new Set<string>();
  const files = manifest.files.map((entry, index) => {
    if (
      !entry ||
      typeof entry.archive_path !== 'string' ||
      !isSafeRelativePath(entry.archive_path) ||
      typeof entry.device_path !== 'string' ||
      !entry.device_path.startsWith('vol0:/') ||
      entry.device_path.split('/').includes('..') ||
      !Number.isSafeInteger(entry.size) ||
      entry.size <= 0 ||
      typeof entry.sha256 !== 'string' ||
      !/^[0-9a-f]{64}$/i.test(entry.sha256) ||
      devicePaths.has(entry.device_path)
    ) {
      throw new Error(`Invalid resource manifest file at index ${index}`);
    }
    devicePaths.add(entry.device_path);
    return entry;
  });

  if (files.length === 0) throw new Error('Resource manifest is empty');
  return { schema: 1, files };
};

export const buildResourceFilesFromDirectory = async (
  selectedFiles: readonly File[]
): Promise<FirmwareUpdateV4ResourceFile[]> => {
  const manifestFile =
    selectedFiles.find((file) =>
      normalizeRelativePath(file.webkitRelativePath || file.name).endsWith(
        '/manifest.json'
      )
    ) ?? selectedFiles.find((file) => file.name === 'manifest.json');
  if (!manifestFile) {
    throw new Error('The selected directory does not contain manifest.json');
  }

  const manifest = parseResourceManifest(
    JSON.parse(await readFile<string>(manifestFile, 'readAsText')) as unknown
  );
  const filesByPath = new Map<string, File>();
  selectedFiles.forEach((file) => {
    const relativePath = normalizeRelativePath(
      file.webkitRelativePath || file.name
    );
    filesByPath.set(relativePath, file);
    const firstSlash = relativePath.indexOf('/');
    if (firstSlash >= 0) {
      filesByPath.set(relativePath.slice(firstSlash + 1), file);
    }
  });

  return Promise.all(
    manifest.files.map(async (entry) => {
      const file = filesByPath.get(normalizeRelativePath(entry.archive_path));
      if (!file) {
        throw new Error(`Missing manifest resource: ${entry.archive_path}`);
      }
      if (file.size !== entry.size) {
        throw new Error(`Size mismatch: ${entry.archive_path}`);
      }
      return {
        binary: await readFile<ArrayBuffer>(file, 'readAsArrayBuffer'),
        devicePath: entry.device_path,
        size: entry.size,
        fileHash: entry.sha256.toLowerCase(),
      };
    })
  );
};
