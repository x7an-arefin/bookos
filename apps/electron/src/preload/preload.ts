import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannels } from '../shared/ipc-channels.js';
import type { BookProject, BuildResult } from '@press/core';
import type { ElectronAPI, AssetVariants, AssetRecord } from '../shared/electron-api.types.js';

const api: ElectronAPI = {
  // Build
  buildPdf(project: BookProject, target: string, outputDir: string): Promise<BuildResult> {
    return ipcRenderer.invoke(IpcChannels.BUILD_PDF, project, target, outputDir);
  },

  buildEpub(project: BookProject, target: string, outputDir: string): Promise<BuildResult> {
    return ipcRenderer.invoke(IpcChannels.BUILD_EPUB, project, target, outputDir);
  },

  onBuildProgress(callback: (percent: number, message: string) => void): () => void {
    const listener = (_event: any, percent: number, message: string) => {
      callback(percent, message);
    };
    ipcRenderer.on(IpcChannels.BUILD_PROGRESS, listener);
    return () => {
      ipcRenderer.removeListener(IpcChannels.BUILD_PROGRESS, listener);
    };
  },

  // File System
  openFolderDialog(): Promise<string | null> {
    return ipcRenderer.invoke(IpcChannels.FILE_OPEN_FOLDER);
  },

  saveFolderDialog(defaultPath?: string): Promise<string | null> {
    return ipcRenderer.invoke(IpcChannels.FILE_SAVE_DIALOG, defaultPath);
  },

  readWorkspace(folderPath: string): Promise<BookProject> {
    return ipcRenderer.invoke(IpcChannels.FILE_READ_WORKSPACE, folderPath);
  },

  writeWorkspace(folderPath: string, project: BookProject): Promise<void> {
    return ipcRenderer.invoke(IpcChannels.FILE_WRITE_WORKSPACE, folderPath, project);
  },

  importZip(zipPath: string): Promise<BookProject> {
    return ipcRenderer.invoke(IpcChannels.FILE_IMPORT_ZIP, zipPath);
  },

  exportOutput(sourcePath: string, defaultFilename: string): Promise<string | null> {
    return ipcRenderer.invoke(IpcChannels.FILE_EXPORT_OUTPUT, sourcePath, defaultFilename);
  },

  // Assets
  optimizeAsset(localFilePath: string, bookId: string): Promise<AssetVariants> {
    return ipcRenderer.invoke(IpcChannels.ASSET_OPTIMIZE, localFilePath, bookId);
  },

  getLocalAssets(bookId: string): Promise<AssetRecord[]> {
    return ipcRenderer.invoke(IpcChannels.ASSET_GET_LOCAL, bookId);
  },

  // App
  getAppVersion(): Promise<string> {
    return ipcRenderer.invoke(IpcChannels.APP_VERSION);
  },

  checkForUpdate(): Promise<{ available: boolean; version: string }> {
    return ipcRenderer.invoke(IpcChannels.APP_CHECK_UPDATE);
  },
};

// Expose the API to the renderer process context
contextBridge.exposeInMainWorld('electronAPI', api);
