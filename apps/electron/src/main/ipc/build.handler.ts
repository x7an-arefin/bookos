import { BrowserWindow, IpcMain } from 'electron';
import { IpcChannels } from '../../shared/ipc-channels.js';
import type { BookProject, BuildResult } from '@press/core';

// Concurrency guard map: bookId -> isBuilding
const activeBuilds = new Map<string, boolean>();

export function registerBuildHandlers(ipcMain: IpcMain, mainWindow: BrowserWindow | null): void {
  ipcMain.handle(IpcChannels.BUILD_PDF, async (event, project: BookProject, target: string, outputDir: string) => {
    return runBuild('pdf', project, target, outputDir, mainWindow);
  });

  ipcMain.handle(IpcChannels.BUILD_EPUB, async (event, project: BookProject, target: string, outputDir: string) => {
    return runBuild('epub', project, target, outputDir, mainWindow);
  });
}

async function runBuild(
  format: 'pdf' | 'epub',
  project: BookProject,
  target: string,
  outputDir: string,
  mainWindow: BrowserWindow | null
): Promise<BuildResult> {
  const bookId = project.id || 'unknown-book';

  if (activeBuilds.get(bookId)) {
    return {
      success: false,
      outputPath: '',
      format,
      duration: 0,
      validation: { isValid: false, errors: [], warnings: [], info: [] },
      error: 'Build already in progress for this book.',
    };
  }

  activeBuilds.set(bookId, true);

  try {
    // Dynamic import to load ESM @press/core inside CommonJS Electron process
    const { buildBook } = await import('@press/core');

    const onProgress = (percent: number, message: string) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IpcChannels.BUILD_PROGRESS, percent, message);
      }
    };

    const result = await buildBook({
      project,
      target,
      outputDir,
      onProgress,
    });

    return result;
  } catch (err: any) {
    return {
      success: false,
      outputPath: '',
      format,
      duration: 0,
      validation: { isValid: false, errors: [], warnings: [], info: [] },
      error: err.message || 'An unexpected build error occurred.',
    };
  } finally {
    activeBuilds.delete(bookId);
  }
}
