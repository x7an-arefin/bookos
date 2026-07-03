import { BrowserWindow, IpcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import AdmZip from 'adm-zip';
import { IpcChannels } from '../../shared/ipc-channels.js';
import type { DatabaseService } from '../services/database.service.js';
import type { WorkspaceService } from '../services/workspace.service.js';
import type { BookProject } from '@press/core';

export function registerFileHandlers(
  ipcMain: IpcMain,
  mainWindow: BrowserWindow | null,
  db: DatabaseService,
  workspace: WorkspaceService
): void {
  // 1. Open Folder Dialog
  ipcMain.handle(IpcChannels.FILE_OPEN_FOLDER, async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    });
    return result.filePaths[0] || null;
  });

  // 2. Save Folder Dialog
  ipcMain.handle(IpcChannels.FILE_SAVE_DIALOG, async (event, defaultPath?: string) => {
    if (!mainWindow) return null;
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath,
      properties: ['createDirectory'],
    });
    return result.filePath || null;
  });

  // 3. Read Workspace
  ipcMain.handle(IpcChannels.FILE_READ_WORKSPACE, async (event, folderPath: string) => {
    const project = await workspace.readWorkspace(folderPath);
    db.upsertProject(project, folderPath);
    return project;
  });

  // 4. Write Workspace
  ipcMain.handle(IpcChannels.FILE_WRITE_WORKSPACE, async (event, folderPath: string, project: BookProject) => {
    await workspace.writeWorkspace(folderPath, project);
    db.upsertProject(project, folderPath);
  });

  // 5. Import ZIP
  ipcMain.handle(IpcChannels.FILE_IMPORT_ZIP, async (event, zipPath: string) => {
    let targetZip = zipPath;
    if (!targetZip && mainWindow) {
      const result = await dialog.showOpenDialog(mainWindow, {
        filters: [{ name: 'ZIP Archives', extensions: ['zip'] }],
        properties: ['openFile'],
      });
      if (result.filePaths[0]) {
        targetZip = result.filePaths[0];
      } else {
        return null;
      }
    }

    const tempDir = path.join(os.tmpdir(), `bookos-import-${Date.now()}-${Math.random()}`);
    await fs.ensureDir(tempDir);

    try {
      const zip = new AdmZip(targetZip);
      zip.extractAllTo(tempDir, true);
      const project = await workspace.readWorkspace(tempDir);
      return project;
    } catch (err: any) {
      throw new Error(`Failed to import ZIP archive: ${err.message}`);
    }
  });

  // 6. Export Output
  ipcMain.handle(IpcChannels.FILE_EXPORT_OUTPUT, async (event, sourcePath: string, defaultFilename: string) => {
    if (!mainWindow) return null;
    const extension = path.extname(sourcePath).substring(1); // 'pdf' or 'epub'
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultFilename,
      filters: [{ name: `${extension.toUpperCase()} Books`, extensions: [extension] }],
    });

    if (result.filePath) {
      await fs.copy(sourcePath, result.filePath);
      return result.filePath;
    }
    return null;
  });
}
