import {
  buildResourceFilesFromDirectory,
  parseResourceManifest,
} from './protocolV2ResourceManifest';

const makeDirectoryFile = (path: string, contents: string) => {
  const file = new File([contents], path.split('/').pop() ?? path);
  Object.defineProperty(file, 'webkitRelativePath', {
    value: `resource-release/${path}`,
  });
  return file;
};

describe('Protocol V2 full resource manifest', () => {
  test('maps every manifest file to its final device path', async () => {
    const resource = makeDirectoryFile('bundles/images/images.okpkg', 'RES');
    const manifest = makeDirectoryFile(
      'manifest.json',
      JSON.stringify({
        schema: 1,
        files: [
          {
            archive_path: 'bundles/images/images.okpkg',
            device_path: 'vol0:/bundles/images/images.okpkg',
            size: resource.size,
            sha256: 'A'.repeat(64),
          },
        ],
      })
    );

    const [result] = await buildResourceFilesFromDirectory([
      manifest,
      resource,
    ]);

    expect(result).toMatchObject({
      devicePath: 'vol0:/bundles/images/images.okpkg',
      size: resource.size,
      fileHash: 'a'.repeat(64),
    });
    expect(Array.from(new Uint8Array(result.binary))).toEqual([
      'R'.charCodeAt(0),
      'E'.charCodeAt(0),
      'S'.charCodeAt(0),
    ]);
  });

  test('rejects unsafe archive paths and duplicate device targets', () => {
    expect(() =>
      parseResourceManifest({
        schema: 1,
        files: [
          {
            archive_path: '../images.okpkg',
            device_path: 'vol0:/bundles/images/images.okpkg',
            size: 1,
            sha256: 'a'.repeat(64),
          },
        ],
      })
    ).toThrow('Invalid resource manifest file at index 0');
  });
});
