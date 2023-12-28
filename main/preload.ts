import { ipcRenderer } from 'electron';

declare global {
  interface Window {
    desktopApi: typeof desktopApi;
  }
}

ipcRenderer.on(
  'SET_ONEKEY_DESKTOP_GLOBALS',
  (_, globals: Record<string, string>) => {
    console.log('====>>>>set globals');
    // @ts-expect-error
    window.ONEKEY_DESKTOP_GLOBALS = globals;
  }
);

const desktopApi = {
  readFileAsBuffer: (filePath: string) =>
    new Promise((resolve, reject) => {
      const responseChannel = `read-bin-file-response-${Math.random()}`;
      ipcRenderer.once(responseChannel, (event, { success, data, error }) => {
        if (success) {
          resolve(data);
        } else {
          reject(new Error(error));
        }
      });
      ipcRenderer.send('read-bin-file', filePath, responseChannel);
    }),
};

window.desktopApi = desktopApi;
