import { ipcRenderer } from 'electron';

ipcRenderer.on(
  'SET_ONEKEY_DESKTOP_GLOBALS',
  (_, globals: Record<string, string>) => {
    console.log('====>>>>set globals');
    // @ts-expect-error
    window.ONEKEY_DESKTOP_GLOBALS = globals;
  }
);
