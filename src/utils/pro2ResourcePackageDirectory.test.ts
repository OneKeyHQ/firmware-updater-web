import JSZip from 'jszip';

import {
  preparePro2ResourcePackageDirectory,
  preparePro2ResourcePackageZip,
} from './pro2ResourcePackageDirectory';

const manifest = {
  schema: 1,
  files: [
    {
      archive_path: 'bundles/images/images-build.okpkg',
      device_path: 'vol0:/bundles/images/images.okpkg',
    },
    {
      archive_path: 'loaders/bootloader/boot_resource-build.okpkg',
      device_path: 'vol0:/loaders/bootloader/boot_resource.okpkg',
    },
  ],
};

const prepared = [
  {
    binary: new Uint8Array([1]).buffer,
    devicePath: 'vol0:/bundles/images/images.okpkg',
    size: 1,
    fileHash: 'a'.repeat(64),
  },
];

function createDirectoryFile(content: BlobPart, relativePath: string) {
  const file = new File([content], relativePath.split('/').pop() ?? 'file');
  Object.defineProperty(file, 'webkitRelativePath', {
    configurable: true,
    value: `Pro2 Resource/${relativePath}`,
  });
  Object.defineProperty(file, 'text', {
    configurable: true,
    value: () =>
      typeof content === 'string'
        ? Promise.resolve(content)
        : Promise.reject(new Error('Expected text fixture')),
  });
  Object.defineProperty(file, 'arrayBuffer', {
    configurable: true,
    value: () =>
      Promise.resolve(
        Uint8Array.from(String(content), (character) => character.charCodeAt(0))
          .buffer
      ),
  });
  return file;
}

describe('Pro2 resource manifest package', () => {
  test('uses manifest archive paths from an extracted CI directory', async () => {
    const hardwareSDK = {
      prepareProtocolV2ResourceFiles: jest.fn().mockReturnValue(prepared),
    };
    const selectedFiles = [
      createDirectoryFile(JSON.stringify(manifest), 'manifest.json'),
      createDirectoryFile('images', manifest.files[0].archive_path),
      createDirectoryFile('boot', manifest.files[1].archive_path),
    ];

    await expect(
      preparePro2ResourcePackageDirectory({ hardwareSDK, selectedFiles })
    ).resolves.toEqual(prepared);
    expect(hardwareSDK.prepareProtocolV2ResourceFiles).toHaveBeenCalledWith({
      manifest,
      files: expect.arrayContaining([
        expect.objectContaining({
          archivePath: manifest.files[0].archive_path,
        }),
        expect.objectContaining({
          archivePath: manifest.files[1].archive_path,
        }),
      ]),
      targetsToUpdate: ['resource', 'boot_resources'],
    });
  });

  test('extracts the hardware CI ZIP before SDK verification', async () => {
    const zip = new JSZip();
    zip.file('manifest.json', JSON.stringify(manifest));
    zip.file(manifest.files[0].archive_path, 'images');
    zip.file(manifest.files[1].archive_path, 'boot');
    const zipBytes = await zip.generateAsync({ type: 'uint8array' });
    const hardwareSDK = {
      prepareProtocolV2ResourceFiles: jest.fn().mockReturnValue(prepared),
    };

    await expect(
      preparePro2ResourcePackageZip({
        hardwareSDK,
        zipFile: new File([zipBytes], 'pro2-resource.zip'),
      })
    ).resolves.toEqual(prepared);
    expect(hardwareSDK.prepareProtocolV2ResourceFiles).toHaveBeenCalledTimes(1);
  });

  test('requires manifest.json instead of matching package filename prefixes', async () => {
    await expect(
      preparePro2ResourcePackageDirectory({
        hardwareSDK: { prepareProtocolV2ResourceFiles: jest.fn() },
        selectedFiles: [createDirectoryFile('images', 'images.okpkg')],
      })
    ).rejects.toThrow('manifest.json');
  });
});
