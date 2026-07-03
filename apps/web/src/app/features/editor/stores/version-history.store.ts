import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { ENVIRONMENT } from '../../../core/tokens/environment.token';
import { WorkspaceStore } from '../../../store/workspace.store';
import type { BookProject } from '@press/core';

export interface SnapshotSummary {
  id: string;
  label: string | null;
  chapterCount: number;
  wordCount: number;
  createdAt: number;
  isAuto: number;
}

export interface VersionHistoryState {
  snapshots: SnapshotSummary[];
  isLoading: boolean;
  selectedSnapshotId: string | null;
  previewProject: BookProject | null;
  isLoadingPreview: boolean;
  error: string | null;
}

const initialState: VersionHistoryState = {
  snapshots: [],
  isLoading: false,
  selectedSnapshotId: null,
  previewProject: null,
  isLoadingPreview: false,
  error: null,
};

export const VersionHistoryStore = signalStore(
  { providedIn: 'root' },

  withState<VersionHistoryState>(initialState),

  withMethods((store) => {
    const http = inject(HttpClient);
    const env = inject(ENVIRONMENT);
    const workspaceStore = inject(WorkspaceStore);

    return {
      async loadSnapshots(bookId: string): Promise<void> {
        patchState(store, { isLoading: true, error: null });
        try {
          const url = `${env.apiBaseUrl}/api/books/${bookId}/snapshots`;
          const res = await http.get<SnapshotSummary[]>(url).toPromise();
          patchState(store, { snapshots: res || [], isLoading: false });
        } catch (err: any) {
          patchState(store, {
            error: err?.error?.error || 'Failed to load snapshots',
            isLoading: false,
          });
        }
      },

      async selectSnapshot(snapshotId: string): Promise<void> {
        const bookId = workspaceStore.project()?.id;
        if (!bookId) return;

        patchState(store, { selectedSnapshotId: snapshotId, isLoadingPreview: true, error: null });
        try {
          const url = `${env.apiBaseUrl}/api/books/${bookId}/snapshots/${snapshotId}`;
          const res = await http.get<{ data: BookProject }>(url).toPromise();
          patchState(store, {
            previewProject: res?.data || null,
            isLoadingPreview: false,
          });
        } catch (err: any) {
          patchState(store, {
            error: err?.error?.error || 'Failed to load snapshot details',
            isLoadingPreview: false,
            previewProject: null,
          });
        }
      },

      async createSnapshot(label: string): Promise<void> {
        const bookId = workspaceStore.project()?.id;
        if (!bookId) return;

        patchState(store, { isLoading: true, error: null });
        try {
          const url = `${env.apiBaseUrl}/api/books/${bookId}/snapshots`;
          await http.post(url, { label }).toPromise();
          
          // Reload snapshots list
          await this.loadSnapshots(bookId);
        } catch (err: any) {
          patchState(store, {
            error: err?.error?.error || 'Failed to create snapshot',
            isLoading: false,
          });
        }
      },

      async restoreSnapshot(snapshotId: string): Promise<void> {
        const bookId = workspaceStore.project()?.id;
        if (!bookId) return;

        patchState(store, { isLoading: true, error: null });
        try {
          const url = `${env.apiBaseUrl}/api/books/${bookId}/snapshots/${snapshotId}/restore`;
          await http.post(url, {}).toPromise();
          
          // Reload the live project in the main workspace store
          await workspaceStore.loadProject(bookId);
          
          // Reload snapshots
          await this.loadSnapshots(bookId);
        } catch (err: any) {
          patchState(store, {
            error: err?.error?.error || 'Failed to restore snapshot',
            isLoading: false,
          });
        }
      },
    };
  })
);
