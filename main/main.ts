import { app, BrowserWindow, session } from 'electron';
import isDev from 'electron-is-dev';
import initProcess, { restartBridge } from './process/index';

const path = require('path');
const urlFormat = require('url');

let mainWindow: BrowserWindow | null;

function showMainWindow() {
  if (!mainWindow) {
    return;
  }
  mainWindow.show();
  mainWindow.focus();
}

(global as any).resourcesPath = isDev
  ? path.join(__dirname, '../public/static')
  : process.resourcesPath;
const staticPath = isDev
  ? path.join(__dirname, '../public/static')
  : path.join((global as any).resourcesPath, 'static');
// static path
const preloadJsUrl = path.join(staticPath, 'preload.js');

const sdkConnectSrc = isDev
  ? `file://${path.join(staticPath, 'js-sdk/')}`
  : path.join('/static', 'js-sdk/');

function initChildProcess() {
  return initProcess();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      sandbox: false,
      nodeIntegration: true,
      webSecurity: false,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const startUrl = urlFormat.format({
    pathname: path.join(__dirname, '/../build/index.html'),
    protocol: 'file:',
    slashes: true,
  });
  // mainWindow.loadURL(isDev ? 'http://localhost:8000/' : startUrl);
  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.webContents.on('did-finish-load', () => {});

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  initChildProcess();

  const filter = {
    urls: ['http://127.0.0.1:21320/*', 'http://localhost:21320/*'],
  };

  session.defaultSession.webRequest.onBeforeSendHeaders(
    filter,
    (details, callback) => {
      const { url } = details;
      if (
        url.startsWith('http://127.0.0.1:21320/') ||
        url.startsWith('http://localhost:21320/')
      ) {
        // resolve onekey bridge CORS error
        details.requestHeaders.Origin = 'https://jssdk.onekey.so';
      }

      callback({ cancel: false, requestHeaders: details.requestHeaders });
    }
  );
}

app.on('ready', () => {
  if (!mainWindow) {
    createWindow();
  }
  showMainWindow();
  mainWindow?.webContents.send('SET_ONEKEY_DESKTOP_GLOBALS', {
    resourcesPath: (global as any).resourcesPath,
    staticPath: `file://${staticPath}`,
    preloadJsUrl: `file://${preloadJsUrl}?timestamp=${Date.now()}`,
    sdkConnectSrc,
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
