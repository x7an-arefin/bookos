import path from 'path';
import fs from 'fs-extra';
import type { BookProject } from '@press/core';
import type { ProjectRecord, AssetRecord, SnapshotRecord, AssetVariants } from '../../shared/electron-api.types.js';

let electronApp: any;
try {
  // Graceful load of electron to allow Node-only testing environment execution
  const electron = require('electron');
  electronApp = electron.app;
} catch (e) {
  // Ignored in unit testing
}

export class DatabaseService {
  private filePath: string;
  private data: {
    projects: ProjectRecord[];
    assets: AssetRecord[];
    snapshots: SnapshotRecord[];
  } = { projects: [], assets: [], snapshots: [] };

  constructor(dbPath?: string) {
    if (dbPath) {
      this.filePath = dbPath;
    } else {
      const userData = electronApp ? electronApp.getPath('userData') : process.cwd();
      this.filePath = path.join(userData, 'bookos.json');
    }
    this.initSchema();
  }

  public initSchema(): void {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        this.data = JSON.parse(raw);
        // Ensure default structures are present
        this.data.projects = this.data.projects || [];
        this.data.assets = this.data.assets || [];
        this.data.snapshots = this.data.snapshots || [];
      } catch (err) {
        console.error('Failed to parse database file, resetting schema:', err);
        this.resetSchema();
      }
    } else {
      this.resetSchema();
    }
  }

  private resetSchema(): void {
    this.data = { projects: [], assets: [], snapshots: [] };
    this.save();
  }

  private save(): void {
    try {
      fs.ensureDirSync(path.dirname(this.filePath));
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  // --- Projects API ---

  public upsertProject(project: BookProject, folderPath: string): void {
    const wordCount = this.calculateWordCount(project);
    const existingIndex = this.data.projects.findIndex((p) => p.id === project.id);

    const record: ProjectRecord = {
      id: project.id,
      title: project.meta.title || 'Untitled',
      author: project.meta.author || 'Unknown',
      folderPath,
      wordCount,
      lastModified: project.updatedAt || new Date().toISOString(),
      createdAt: project.createdAt || new Date().toISOString(),
    };

    if (existingIndex > -1) {
      this.data.projects[existingIndex] = record;
    } else {
      this.data.projects.push(record);
    }
    this.save();
  }

  public getAllProjects(): ProjectRecord[] {
    return this.data.projects;
  }

  public getProjectById(id: string): ProjectRecord | undefined {
    return this.data.projects.find((p) => p.id === id);
  }

  public deleteProject(id: string): void {
    this.data.projects = this.data.projects.filter((p) => p.id !== id);
    // Cascade delete assets and snapshots
    this.data.assets = this.data.assets.filter((a) => a.bookId !== id);
    this.data.snapshots = this.data.snapshots.filter((s) => s.bookId !== id);
    this.save();
  }

  // --- Assets API ---

  public upsertAsset(asset: AssetRecord): void {
    const existingIndex = this.data.assets.findIndex((a) => a.id === asset.id);
    if (existingIndex > -1) {
      this.data.assets[existingIndex] = asset;
    } else {
      this.data.assets.push(asset);
    }
    this.save();
  }

  public getAssetById(id: string): AssetRecord | undefined {
    return this.data.assets.find((a) => a.id === id);
  }

  public getAssetsByBookId(bookId: string): AssetRecord[] {
    return this.data.assets.filter((a) => a.bookId === bookId);
  }

  public deleteAsset(id: string): void {
    this.data.assets = this.data.assets.filter((a) => a.id !== id);
    this.save();
  }

  public updateAssetVariants(id: string, variants: AssetVariants): void {
    const asset = this.data.assets.find((a) => a.id === id);
    if (asset) {
      asset.variants = {
        ...asset.variants,
        ...variants,
      };
      this.save();
    }
  }

  // --- Snapshots API ---

  public insertSnapshot(snapshot: SnapshotRecord): void {
    this.data.snapshots.push(snapshot);
    this.save();
  }

  public getSnapshotsByBookId(bookId: string): SnapshotRecord[] {
    return this.data.snapshots.filter((s) => s.bookId === bookId);
  }

  public getSnapshotById(id: string): SnapshotRecord | undefined {
    return this.data.snapshots.find((s) => s.id === id);
  }

  public deleteOldestSnapshotsIfOverLimit(bookId: string, limit: number): void {
    const bookSnapshots = this.data.snapshots
      .filter((s) => s.bookId === bookId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (bookSnapshots.length > limit) {
      const deleteCount = bookSnapshots.length - limit;
      const toDeleteIds = bookSnapshots.slice(0, deleteCount).map((s) => s.id);
      this.data.snapshots = this.data.snapshots.filter((s) => !toDeleteIds.includes(s.id));
      this.save();
    }
  }

  // --- Helper Methods ---

  private calculateWordCount(project: BookProject): number {
    let count = 0;
    const sections = [
      ...(project.frontMatterSections || []),
      ...(project.chapters || []),
      ...(project.backMatterSections || []),
    ];
    for (const sect of sections) {
      const text = sect.contentMarkdown || '';
      count += text.trim().split(/\s+/).filter(Boolean).length;
    }
    return count;
  }
}
