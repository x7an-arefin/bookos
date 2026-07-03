import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import type { BookProject } from '@press/core';
import type { BuildProgressEvent } from '../repositories/build.repository';

/**
 * IpcService — the ONLY place in the Angular codebase that reads window.electronAPI.
 *
 * Rule: No component, store, or repository should ever access window.electronAPI directly.
 * Everything goes through this service.
 *
 * This service wraps raw IPC calls into typed Promises and Observables.
 * Repository implementations inject this to build their higher-level DAL methods.
 */
@Injectable({ providedIn: 'root' })
export class IpcService {
  private readonly api = (window as any)['electronAPI'] as
    | ElectronAPIBridge
    | undefined;

  /** Reactive signal — true when running inside Electron */
  readonly isElectron = signal(!!this.api);

  // ── Workspace / File Operations ─────────────────────────────────────────────

  openFolderDialog(): Promise<string | null> {
    this.assertElectron('openFolderDialog');
    return this.api!.openFolderDialog();
  }

  readWorkspace(folderPath: string): Promise<BookProject> {
    this.assertElectron('readWorkspace');
    return this.api!.readWorkspace(folderPath);
  }

  writeWorkspace(folderPath: string, project: BookProject): Promise<void> {
    this.assertElectron('writeWorkspace');
    return this.api!.writeWorkspace(folderPath, project);
  }

  deleteWorkspace(folderPath: string): Promise<void> {
    this.assertElectron('deleteWorkspace');
    return this.api!.deleteWorkspace(folderPath);
  }

  getRecentProjects(): Promise<string[]> {
    this.assertElectron('getRecentProjects');
    return this.api!.getRecentProjects();
  }

  // ── Build Operations ────────────────────────────────────────────────────────

  buildPdf(project: BookProject, target: string, outputDir: string): Promise<any> {
    this.assertElectron('buildPdf');
    return this.api!.buildPdf(project, target, outputDir);
  }

  buildEpub(project: BookProject, target: string, outputDir: string): Promise<any> {
    this.assertElectron('buildEpub');
    return this.api!.buildEpub(project, target, outputDir);
  }

  revealOutput(outputPath: string): Promise<void> {
    this.assertElectron('revealOutput');
    return this.api!.revealOutput(outputPath);
  }

  /**
   * Returns an Observable that emits build progress events.
   * The underlying IPC listener is registered once and cleaned up on unsubscribe.
   */
  onBuildProgress(): Observable<BuildProgressEvent> {
    return new Observable((subscriber) => {
      if (!this.api) {
        subscriber.complete();
        return;
      }
      const cleanup = this.api.onBuildProgress(
        (percent: number, message: string, stage: string) => {
          subscriber.next({ percent, message, stage } as BuildProgressEvent);
        }
      );
      return () => cleanup();
    });
  }

  // ── Asset Operations ────────────────────────────────────────────────────────

  optimizeAsset(localFilePath: string, bookId: string): Promise<any> {
    this.assertElectron('optimizeAsset');
    return this.api!.optimizeAsset(localFilePath, bookId);
  }

  getLocalAssets(bookId: string): Promise<any[]> {
    this.assertElectron('getLocalAssets');
    return this.api!.getLocalAssets(bookId);
  }

  deleteAsset(bookId: string, assetId: string): Promise<void> {
    this.assertElectron('deleteAsset');
    return this.api!.deleteAsset(bookId, assetId);
  }

  pickImageFile(): Promise<string | null> {
    this.assertElectron('pickImageFile');
    return this.api!.pickImageFile();
  }

  // ── App Info ────────────────────────────────────────────────────────────────

  getAppVersion(): Promise<string> {
    this.assertElectron('getAppVersion');
    return this.api!.getAppVersion();
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private assertElectron(method: string): void {
    if (!this.api) {
      throw new Error(
        `IpcService.${method}() called but window.electronAPI is not available. ` +
          `Are you running in the Electron shell?`
      );
    }
  }
}

/**
 * Type definition mirroring the bridge exposed by preload.ts.
 * This must stay in sync with apps/electron/src/preload/preload.ts.
 */
interface ElectronAPIBridge {
  // Workspace
  openFolderDialog(): Promise<string | null>;
  readWorkspace(folderPath: string): Promise<any>;
  writeWorkspace(folderPath: string, project: any): Promise<void>;
  deleteWorkspace(folderPath: string): Promise<void>;
  getRecentProjects(): Promise<string[]>;
  // Build
  buildPdf(project: any, target: string, outputDir: string): Promise<any>;
  buildEpub(project: any, target: string, outputDir: string): Promise<any>;
  revealOutput(outputPath: string): Promise<void>;
  onBuildProgress(cb: (percent: number, message: string, stage: string) => void): () => void;
  // Assets
  optimizeAsset(localFilePath: string, bookId: string): Promise<any>;
  getLocalAssets(bookId: string): Promise<any[]>;
  deleteAsset(bookId: string, assetId: string): Promise<void>;
  pickImageFile(): Promise<string | null>;
  // App
  getAppVersion(): Promise<string>;
}
