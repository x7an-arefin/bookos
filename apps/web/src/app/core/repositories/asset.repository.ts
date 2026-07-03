/**
 * AssetRecord — a processed image asset tracked in book.json.
 */
export interface AssetRecord {
  id: string;
  originalName: string;
  relativePath: string;   // relative to book workspace root
  dpi?: number;
  width?: number;
  height?: number;
  fileSizeBytes: number;
  mimeType: string;
  variants: AssetVariants;
}

/**
 * AssetVariants — output paths for each processed resolution.
 * Mirrors the shape from @press/core image optimizer.
 */
export interface AssetVariants {
  print: string;    // 300 DPI, full resolution
  web: string;      // 96 DPI, compressed
  thumb: string;    // 200px thumbnail
}

/**
 * AssetRepository — interface for all image asset operations.
 *
 * Electron implementation: reads local disk, calls sharp via IPC
 * Cloudflare implementation (Phase 4): uploads to R2, calls image worker
 */
export interface AssetRepository {
  /** Optimize a local file and generate print/web/thumb variants */
  optimizeAsset(localFilePath: string, bookId: string): Promise<AssetVariants>;

  /** Returns all tracked assets for a given book project */
  getLocalAssets(bookId: string): Promise<AssetRecord[]>;

  /** Deletes an asset and all its variants */
  deleteAsset(bookId: string, assetId: string): Promise<void>;

  /** Opens the system file picker for image selection; returns local path or null */
  pickImageFile(): Promise<string | null>;
}
