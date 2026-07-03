import { computed } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';

export interface DashboardState {
  recentPaths: string[];
  searchQuery: string;
  viewMode: 'grid' | 'list';
  sortBy: 'title' | 'modified' | 'wordCount';
}

const initialState: DashboardState = {
  recentPaths: [],
  searchQuery: '',
  viewMode: 'grid',
  sortBy: 'modified',
};

/**
 * DashboardStore — feature-level store for the dashboard view.
 *
 * Manages:
 *   - View mode (grid / list)
 *   - Search query filter
 *   - Sort preference
 *   - Recent project paths (persisted to localStorage)
 *
 * Delegates actual project loading to WorkspaceStore (global).
 */
export const DashboardStore = signalStore(
  { providedIn: 'root' },

  withState<DashboardState>(initialState),

  withComputed(({ recentPaths, searchQuery }) => ({
    hasRecentPaths: computed(() => recentPaths().length > 0),
    trimmedQuery: computed(() => searchQuery().trim().toLowerCase()),
  })),

  withMethods((store) => {
    return {
      /** Loads recent paths from localStorage on startup */
      loadRecentPaths(): void {
        try {
          const stored = localStorage.getItem('bookos-recent-paths');
          if (stored) {
            patchState(store, { recentPaths: JSON.parse(stored) });
          }
        } catch {
          // ignore
        }
      },

      /** Adds a path to the recent list and persists it */
      addRecentPath(path: string): void {
        const current = store.recentPaths();
        const updated = [path, ...current.filter((p) => p !== path)].slice(0, 10);
        localStorage.setItem('bookos-recent-paths', JSON.stringify(updated));
        patchState(store, { recentPaths: updated });
      },

      setViewMode(mode: 'grid' | 'list'): void {
        patchState(store, { viewMode: mode });
      },

      setSortBy(sort: DashboardState['sortBy']): void {
        patchState(store, { sortBy: sort });
      },

      setSearchQuery(query: string): void {
        patchState(store, { searchQuery: query });
      },
    };
  })
);
