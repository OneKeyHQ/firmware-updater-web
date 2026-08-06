import { matchPro2ResourcePackageDirectory } from './pro2ResourcePackageDirectory';

const slots = [
  { key: 'images', label: 'Images', fileNamePrefix: 'images' },
  {
    key: 'boot_resource',
    label: 'Boot Resource',
    fileNamePrefix: 'boot_resource',
  },
] as const;

describe('Pro2 resource package directory', () => {
  test('matches release-suffixed and simplified package names without a manifest', () => {
    const result = matchPro2ResourcePackageDirectory(
      [
        new File(['{}'], 'manifest.json'),
        new File(['images'], 'images-resource-build-id.okpkg'),
        new File(['boot'], 'boot_resource.okpkg'),
      ],
      slots
    );

    expect(result.images.name).toBe('images-resource-build-id.okpkg');
    expect(result.boot_resource.name).toBe('boot_resource.okpkg');
  });

  test('rejects incomplete directories', () => {
    expect(() =>
      matchPro2ResourcePackageDirectory(
        [new File(['images'], 'images.okpkg')],
        slots
      )
    ).toThrow('Missing resource package: Boot Resource');
  });

  test('rejects duplicate packages', () => {
    expect(() =>
      matchPro2ResourcePackageDirectory(
        [
          new File(['images'], 'images.okpkg'),
          new File(['images'], 'images-resource-build-id.okpkg'),
          new File(['boot'], 'boot_resource.okpkg'),
        ],
        slots
      )
    ).toThrow('Duplicate resource package: Images');
  });
});
