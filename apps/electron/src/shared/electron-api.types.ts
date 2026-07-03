import type { BookProject, BuildResult } from '@press/core';

export interface AssetVariants {
  original?: string;
  thumbnail?: string;
  mobile?: string;
  print?: string;
}

export interface AssetRecord {
  id: string;
  bookId: string;
  filename: string;
  localPath: string;
  mimeType: string;
  sizeBytes: number;
  variants: AssetVariants;
}

export interface ProjectRecord {
  id: string;
  title: string;
  author: string;
  folderPath: string;
  wordCount: number;
  lastModified: string;
  createdAt: string;
}

export interface SnapshotRecord {
  id: string;
  bookId: string;
  label?: string;
  wordCount: number;
  isManual: boolean;
  createdAt: string;
  projectJson: string;
}

export interface ElectronAPI {
  // Build
  buildPdf(project: BookProject, target: string, outputDir: string): Promise<BuildResult>;
  buildEpub(project: BookProject, target: string, outputDir: string): Promise<BuildResult>;
  onBuildProgress(callback: (percent: number, message: string) => void): () => void;

  // File System
  openFolderDialog(): Promise<string | null>;
  saveFolderDialog(defaultPath?: string): Promise<string | null>;
  readWorkspace(folderPath: string): Promise<BookProject>;
  writeWorkspace(folderPath: string, project: BookProject): Promise<void>;
  importZip(zipPath: string): Promise<BookProject>;
  exportOutput(sourcePath: string, defaultFilename: string): Promise<string | null>;

  // Assets
  optimizeAsset(localFilePath: string, bookId: string): Promise<AssetVariants>;
  getLocalAssets(bookId: string): Promise<AssetRecord[]>;

  // App
  getAppVersion(): Promise<string>;
  checkForUpdate(): Promise<{ available: boolean; version: string }>;
}
