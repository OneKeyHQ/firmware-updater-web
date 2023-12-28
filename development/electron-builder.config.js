/* eslint-disable no-template-curly-in-string */
module.exports = {
  extraMetadata: {
    main: 'dist/main.js',
    version: '0.0.1',
  },
  appId: 'so.onekey.wallet.desktop.firmware.updater',
  productName: 'OneKey Firmware Updater',
  copyright: 'Copyright © OneKeyHQ',
  asar: true,
  buildVersion: '20231227001',
  directories: {
    output: 'build-electron',
  },
  files: [
    'build/**/*',
    '!build/static/bin/**/*',
    'dist/**/*.js',
    '!dist/__**',
    'package.json',
  ],
  extraResources: [
    {
      from: 'build/static/images/icons/512x512.png',
      to: 'static/images/icons/512x512.png',
    },
    {
      from: 'build/static/preload.js',
      to: 'static/preload.js',
    },
  ],
  dmg: {
    sign: false,
    contents: [
      {
        x: 410,
        y: 175,
        type: 'link',
        path: '/Applications',
      },
      {
        x: 130,
        y: 175,
        type: 'file',
      },
    ],
    background: 'build/static/images/icons/background.png',
  },
  nsis: {
    oneClick: false,
    installerSidebar: 'build/static/images/icons/installerSidebar.bmp',
  },
  mac: {
    extraResources: [
      {
        from: 'build/static/bin/bridge/mac-${arch}',
        to: 'bin/bridge',
      },
    ],
    icon: 'build/static/images/icons/512x512.png',
    artifactName: 'OneKey-Firmware-Updater-${version}-mac-${arch}.${ext}',
    hardenedRuntime: true,
    gatekeeperAssess: false,
    darkModeSupport: false,
    category: 'productivity',
    target: [
      { target: 'dmg', arch: ['x64', 'arm64'] },
      { target: 'zip', arch: ['x64', 'arm64'] },
    ],
    entitlements: 'development/entitlements.mac.plist',
    extendInfo: {
      NSCameraUsageDescription: 'Please allow OneKey to use your camera',
    },
  },
  win: {
    extraResources: [
      {
        from: 'build/static/bin/bridge/win-${arch}',
        to: 'bin/bridge',
      },
    ],
    icon: 'build/static/images/icons/512x512.png',
    artifactName: 'OneKey-Wallet-${version}-win-${arch}.${ext}',
    verifyUpdateCodeSignature: false,
    target: ['nsis'],
  },
};
