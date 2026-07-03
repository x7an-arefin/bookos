import type { BookProject } from '@press/core';

/**
 * WorkspaceRepository — interface for all project file system operations.
 *
 * Electron implementation: reads/writes via IPC → main process file handlers
 * Cloudflare implementation (Phase 4): reads/writes via HTTP → Workers API
 */
export interface WorkspaceRepository {
  /** Opens the native folder picker; returns selected path or null on cancel */
  openFolder(): Promise<string | null>;

  /** Reads a BookProject from the given folder path */
  readProject(folderPath: string): Promise<BookProject>;

  /** Writes a BookProject back to disk at the given folder path */
  writeProject(folderPath: string, project: BookProject): Promise<void>;

  /** Deletes a project workspace folder (with confirmation on the main process) */
  deleteProject(folderPath: string): Promise<void>;

  /** Renames the book (updates book.json title) */
  renameProject(folderPath: string, newTitle: string): Promise<void>;

  /** Returns a list of recently opened project folder paths from app prefs */
  getRecentProjects(): Promise<string[]>;
}
