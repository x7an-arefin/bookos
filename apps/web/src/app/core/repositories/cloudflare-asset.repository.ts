import { Injectable, inject } from '@angular/core';
import type { AssetRepository, AssetRecord, AssetVariants } from './asset.repository';
import { IndexedDbService } from '../../shared/services/indexed-db.service';

@Injectable()
export class CloudflareAssetRepository implements AssetRepository {
  private readonly db = inject(IndexedDbService);

  private static fileCache = new Map<string, File>();

  async pickImageFile(): Promise<string | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      
      input.onchange = () => {
        const file = input.files?.item(0);
        if (file) {
          const objectUrl = URL.createObjectURL(file);
          CloudflareAssetRepository.fileCache.set(objectUrl, file);
          resolve(objectUrl);
        } else {
          resolve(null);
        }
      };
      
      input.click();
    });
  }

  async optimizeAsset(localFilePath: string, bookId: string): Promise<AssetVariants> {
    const file = CloudflareAssetRepository.fileCache.get(localFilePath);
    if (!file) {
      return {
        print: localFilePath,
        web: localFilePath,
        thumb: localFilePath
      };
    }

    const img = new Image();
    img.src = localFilePath;
    await new Promise((resolve) => (img.onload = resolve));

    // Web variant: max 1200px width
    const webCanvas = document.createElement('canvas');
    const webCtx = webCanvas.getContext('2d');
    const scaleWeb = Math.min(1, 1200 / img.width);
    webCanvas.width = img.width * scaleWeb;
    webCanvas.height = img.height * scaleWeb;
    webCtx?.drawImage(img, 0, 0, webCanvas.width, webCanvas.height);
    const webBlob = await new Promise<Blob | null>((resolve) => webCanvas.toBlob(resolve, 'image/jpeg', 0.8));
    const webUrl = webBlob ? URL.createObjectURL(webBlob) : localFilePath;

    // Thumb variant: max 200px width
    const thumbCanvas = document.createElement('canvas');
    const thumbCtx = thumbCanvas.getContext('2d');
    const scaleThumb = Math.min(1, 200 / img.width);
    thumbCanvas.width = img.width * scaleThumb;
    thumbCanvas.height = img.height * scaleThumb;
    thumbCtx?.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);
    const thumbBlob = await new Promise<Blob | null>((resolve) => thumbCanvas.toBlob(resolve, 'image/jpeg', 0.7));
    const thumbUrl = thumbBlob ? URL.createObjectURL(thumbBlob) : localFilePath;

    const variants: AssetVariants = {
      print: localFilePath,
      web: webUrl,
      thumb: thumbUrl,
    };

    const assetId = crypto.randomUUID();
    const assetsList = await this.db.get<AssetRecord[]>('workspace', `${bookId}_assets`) || [];
    const newAsset: AssetRecord = {
      id: assetId,
      originalName: file.name,
      relativePath: `assets/${file.name}`,
      fileSizeBytes: file.size,
      mimeType: file.type,
      variants,
    };
    assetsList.push(newAsset);
    await this.db.set('workspace', `${bookId}_assets`, assetsList);

    return variants;
  }

  async getLocalAssets(bookId: string): Promise<AssetRecord[]> {
    return await this.db.get<AssetRecord[]>('workspace', `${bookId}_assets`) || [];
  }

  async deleteAsset(bookId: string, assetId: string): Promise<void> {
    const assetsList = await this.db.get<AssetRecord[]>('workspace', `${bookId}_assets`) || [];
    const filtered = assetsList.filter((a) => a.id !== assetId);
    await this.db.set('workspace', `${bookId}_assets`, filtered);
  }
}
