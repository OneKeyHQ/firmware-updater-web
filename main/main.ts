import { app, BrowserWindow, session, ipcMain } from 'electron';
import isDev from 'electron-is-dev';
import logger from 'electron-log';
import path from 'path';
import fs from 'fs';
import { format as formatUrl, parse } from 'url';
import initProcess from './process/index';

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

logger.debug('preloadJsUrl', preloadJsUrl);

const sdkConnectSrc = isDev
  ? `file://${path.join(staticPath, 'js-sdk/')}`
  : '/static/js-sdk/';

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

  const startUrl = formatUrl({
    pathname: path.join(__dirname, '../build/index.html'),
    protocol: 'file',
    slashes: true,
  });
  mainWindow.loadURL(isDev ? 'http://localhost:8000/' : startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.send('SET_ONEKEY_DESKTOP_GLOBALS', {
      resourcesPath: (global as any).resourcesPath,
      staticPath: `file://${staticPath}`,
      preloadJsUrl: `file://${preloadJsUrl}?timestamp=${Date.now()}`,
      sdkConnectSrc,
    });
  });

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

  if (!isDev) {
    const PROTOCOL = 'file';
    session.defaultSession.protocol.interceptFileProtocol(
      PROTOCOL,
      (request, callback) => {
        const isJsSdkFile = request.url.indexOf('/static/js-sdk') > -1;
        const isIFrameHtml =
          request.url.indexOf('/static/js-sdk/iframe.html') > -1;

        logger.debug('=====>request: ', request.url);

        // resolve iframe path
        if (isJsSdkFile && isIFrameHtml) {
          callback({
            path: path.join(__dirname, '../build/static/js-sdk/iframe.html'),
          });
          return;
        }

        if (isJsSdkFile) {
          const urlPath = parse(request.url).pathname;
          if (urlPath) {
            const decodedPath = decodeURI(urlPath);
            // Remove leading '/' on Windows
            const normalizedPath =
              process.platform === 'win32'
                ? decodedPath.replace(/^\/+/, '')
                : decodedPath;
            // File path for files in js-sdk folder
            const sdkFilePath = path.join(
              __dirname,
              `../build${normalizedPath}`
            );
            logger.debug('sdkfilePath: ', sdkFilePath);
            callback({ path: sdkFilePath });
            return;
          }
        }

        // Otherwise, convert the file URL to a file path
        const parsedUrl = parse(request.url);
        let filePath = '';

        if (parsedUrl.pathname) {
          filePath = decodeURI(path.normalize(parsedUrl.pathname));
        }

        // Windows platform compatibility
        if (process.platform === 'win32') {
          filePath = filePath.replace(/^\/+/, '');
        }

        callback({ path: filePath });
      }
    );
  }

  ipcMain.on('read-bin-file', (event, filePath, responseChannel) => {
    const firmwarePath = isDev
      ? path.join(staticPath, 'firmware/')
      : path.join(__dirname, '../build/static/firmware/');
    fs.readFile(path.join(firmwarePath, filePath), (error, data) => {
      if (error) {
        console.log('====>file error: ', error);
        event.sender.send(responseChannel, {
          success: false,
          error: error.message,
        });
      } else {
        event.sender.send(responseChannel, { success: true, data });
      }
    });
  });
}

app.on('ready', () => {
  if (!mainWindow) {
    createWindow();
  }
  showMainWindow();
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
