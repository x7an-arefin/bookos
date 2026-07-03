import { BrowserWindow, IpcMain } from 'electron';
import path from 'path';
import fs from 'fs-extra';
import { IpcChannels } from '../../shared/ipc-channels.js';
import type { DatabaseService } from '../services/database.service.js';
import type { AssetVariants, AssetRecord } from '../../shared/electron-api.types.js';

function getMimeType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.ttf')) return 'font/ttf';
  if (lower.endsWith('.otf')) return 'font/otf';
  return 'application/octet-stream';
}

export function registerAssetHandlers(
  ipcMain: IpcMain,
  mainWindow: BrowserWindow | null,
  db: DatabaseService
): void {
  // 1. Optimize Asset
  ipcMain.handle(IpcChannels.ASSET_OPTIMIZE, async (event, localFilePath: string, bookId: string) => {
    const exists = await fs.pathExists(localFilePath);
    if (!exists) {
      throw new Error(`Asset file not found at: ${localFilePath}`);
    }

    const filename = path.basename(localFilePath);
    const assetId = `asset-${filename.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
    
    // Output variants directory inside workspace folder structure: assets/.variants/<assetId>/
    const workspaceDir = path.dirname(path.dirname(localFilePath));
    const outputDir = path.join(workspaceDir, 'assets', '.variants', assetId);
    await fs.ensureDir(outputDir);

    try {
      const { optimizeImage } = await import('@press/core');
      const variants: AssetVariants = await optimizeImage(localFilePath, outputDir);

      const stats = await fs.stat(localFilePath);
      const assetRecord: AssetRecord = {
        id: assetId,
        bookId,
        filename,
        localPath: localFilePath,
        mimeType: getMimeType(filename),
        sizeBytes: stats.size,
        variants,
      };

      db.upsertAsset(assetRecord);
      return variants;
    } catch (err: any) {
      throw new Error(`Image optimization failed: ${err.message}`);
    }
  });

  // 2. Get Local Assets
  ipcMain.handle(IpcChannels.ASSET_GET_LOCAL, async (event, bookId: string) => {
    return db.getAssetsByBookId(bookId);
  });
}
