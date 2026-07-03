import { Injectable, inject } from '@angular/core';
import { IpcService } from '../ipc/ipc.service';
import type {
  AssetRepository,
  AssetRecord,
  AssetVariants,
} from './asset.repository';

/**
 * ElectronAssetRepository — implements AssetRepository via Electron IPC.
 */
@Injectable()
export class ElectronAssetRepository implements AssetRepository {
  private readonly ipc = inject(IpcService);

  optimizeAsset(localFilePath: string, bookId: string): Promise<AssetVariants> {
    return this.ipc.optimizeAsset(localFilePath, bookId);
  }

  getLocalAssets(bookId: string): Promise<AssetRecord[]> {
    return this.ipc.getLocalAssets(bookId);
  }

  deleteAsset(bookId: string, assetId: string): Promise<void> {
    return this.ipc.deleteAsset(bookId, assetId);
  }

  pickImageFile(): Promise<string | null> {
    return this.ipc.pickImageFile();
  }
}
