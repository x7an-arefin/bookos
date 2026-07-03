import { app, BrowserWindow, IpcMain } from 'electron';
import { IpcChannels } from '../../shared/ipc-channels.js';

export function registerAppHandlers(ipcMain: IpcMain, mainWindow: BrowserWindow | null): void {
  // 1. Get App Version
  ipcMain.handle(IpcChannels.APP_VERSION, async () => {
    return app.getVersion();
  });

  // 2. Check for Update
  ipcMain.handle(IpcChannels.APP_CHECK_UPDATE, async () => {
    const isDev = !app.isPackaged;
    if (isDev) {
      return { available: false, version: app.getVersion() };
    }

    try {
      const { autoUpdater } = await import('electron-updater');
      const result = await autoUpdater.checkForUpdates();
      const available = result !== null && result.updateInfo !== undefined;
      const version = available ? result.updateInfo.version : app.getVersion();
      return { available, version };
    } catch (err) {
      console.error('Update check failed:', err);
      return { available: false, version: app.getVersion() };
    }
  });
}
