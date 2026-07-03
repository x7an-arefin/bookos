import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { ENVIRONMENT } from '../../core/tokens/environment.token';
import { ElectronService } from '../../core/services/electron.service';
import { WorkspaceStore } from '../../store/workspace.store';
import { SyncQueueService } from '../../shared/services/sync-queue.service';

export interface SessionRecord {
  jti: string;
  createdAt: number;
  expiresAt: number;
  deviceHint: string | null;
}

export type SyncStatusType = 'idle' | 'syncing' | 'synced' | 'offline' | 'conflict';

export interface SettingsState {
  syncStatus: SyncStatusType;
  lastSyncedAt: Date | null;
  activeSessions: SessionRecord[];
  isLoadingSessions: boolean;
  error: string | null;
}

const initialState: SettingsState = {
  syncStatus: 'idle',
  lastSyncedAt: null,
  activeSessions: [],
  isLoadingSessions: false,
  error: null,
};

export const SettingsStore = signalStore(
  { providedIn: 'root' },

  withState<SettingsState>(initialState),

  withMethods((store) => {
    const http = inject(HttpClient);
    const env = inject(ENVIRONMENT);
    const electron = inject(ElectronService);
    const workspaceStore = inject(WorkspaceStore);
    const syncQueue = inject(SyncQueueService);

    return {
      async loadSessions(): Promise<void> {
        if (electron.isElectron()) {
          patchState(store, { activeSessions: [] });
          return;
        }

        patchState(store, { isLoadingSessions: true, error: null });
        try {
          const url = `${env.apiBaseUrl}/api/auth/sessions`;
          const res = await http.get<SessionRecord[]>(url).toPromise();
          patchState(store, { activeSessions: res || [], isLoadingSessions: false });
        } catch (err: any) {
          patchState(store, {
            error: err?.error?.error || 'Failed to load sessions',
            isLoadingSessions: false,
          });
        }
      },

      async revokeSession(jti: string): Promise<void> {
        if (electron.isElectron()) return;

        try {
          const url = `${env.apiBaseUrl}/api/auth/sessions/${jti}`;
          await http.delete(url).toPromise();
          patchState(store, (state) => ({
            activeSessions: state.activeSessions.filter((s) => s.jti !== jti),
          }));
        } catch (err: any) {
          patchState(store, { error: err?.error?.error || 'Failed to revoke session' });
        }
      },

      async syncNow(): Promise<void> {
        if (electron.isElectron() || !navigator.onLine) {
          patchState(store, { syncStatus: 'offline' });
          return;
        }

        patchState(store, { syncStatus: 'syncing' });
        try {
          // Drain local queue first
          await syncQueue.drain();
          
          // Save workspace if open
          if (workspaceStore.project()) {
            await workspaceStore.saveProject();
          }
          
          patchState(store, {
            syncStatus: 'synced',
            lastSyncedAt: new Date(),
          });
          
          // Reset to idle after a few seconds
          setTimeout(() => {
            patchState(store, { syncStatus: 'idle' });
          }, 3000);
        } catch (err) {
          patchState(store, { syncStatus: 'conflict' });
        }
      },
    };
  })
);
