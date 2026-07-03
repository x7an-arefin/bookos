import { Injectable, inject } from '@angular/core';
import { IpcService } from '../ipc/ipc.service';
import type { WorkspaceRepository } from './workspace.repository';
import type { BookProject } from '@press/core';

/**
 * ElectronWorkspaceRepository — implements WorkspaceRepository via Electron IPC.
 *
 * Injected via the WORKSPACE_REPOSITORY token in app.config.ts.
 * Will be swapped for CloudflareWorkspaceRepository in Phase 4 browser mode.
 */
@Injectable()
export class ElectronWorkspaceRepository implements WorkspaceRepository {
  private readonly ipc = inject(IpcService);

  openFolder(): Promise<string | null> {
    return this.ipc.openFolderDialog();
  }

  readProject(folderPath: string): Promise<BookProject> {
    return this.ipc.readWorkspace(folderPath);
  }

  writeProject(folderPath: string, project: BookProject): Promise<void> {
    return this.ipc.writeWorkspace(folderPath, project);
  }

  deleteProject(folderPath: string): Promise<void> {
    return this.ipc.deleteWorkspace(folderPath);
  }

  renameProject(folderPath: string, newTitle: string): Promise<void> {
    // Rename is done by reading the project, mutating title, and writing back
    return this.ipc
      .readWorkspace(folderPath)
      .then((project: BookProject) => {
        const updated = { ...project, meta: { ...project.meta, title: newTitle } };
        return this.ipc.writeWorkspace(folderPath, updated);
      });
  }

  getRecentProjects(): Promise<string[]> {
    return this.ipc.getRecentProjects();
  }
}
