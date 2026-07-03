import { computed } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { WORKSPACE_REPOSITORY } from '../core/tokens/repository.tokens';
import type { BookProject, Chapter } from '@press/core';
import { DrawerService } from '../shared/services/drawer.service';
import { ConflictResolutionComponent } from '../features/editor/drawers/conflict-resolution.component';

export interface WorkspaceState {
  project: BookProject | null;
  folderPath: string | null;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: WorkspaceState = {
  project: null,
  folderPath: null,
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,
  isLoading: false,
  error: null,
};

/**
 * WorkspaceStore — global NgRx Signal Store for the currently open BookProject.
 *
 * This is the single source of truth for:
 *   - Which book is currently open
 *   - Its content (chapters, metadata, assets)
 *   - Save / dirty state
 *
 * All mutations go through this store's methods.
 * The editor auto-save effect reads `isDirty` and calls `saveProject()`.
 */
export const WorkspaceStore = signalStore(
  { providedIn: 'root' },

  withState<WorkspaceState>(initialState),

  withComputed(({ project, folderPath, isDirty, isSaving }) => ({
    hasOpenProject: computed(() => !!project()),
    projectTitle: computed(() => project()?.meta?.title ?? null),
    chapterCount: computed(() => project()?.chapters?.length ?? 0),
    totalWordCount: computed(() => {
      const chapters = project()?.chapters ?? [];
      return chapters.reduce((acc, ch) => {
        const words = ch.contentMarkdown
          ?.split(/\s+/)
          .filter((w: string) => w.length > 0).length ?? 0;
        return acc + words;
      }, 0);
    }),
  })),

  withMethods((store) => {
    const repo = inject(WORKSPACE_REPOSITORY);
    const drawer = inject(DrawerService);

    return {
      /** Opens the native folder picker and loads the selected project */
      async openProject(): Promise<void> {
        patchState(store, { isLoading: true, error: null });
        try {
          const path = await repo.openFolder();
          if (!path) {
            patchState(store, { isLoading: false });
            return;
          }
          const project = await repo.readProject(path);
          patchState(store, {
            project,
            folderPath: path,
            isDirty: false,
            isLoading: false,
            lastSavedAt: new Date(),
          });
        } catch (err) {
          patchState(store, {
            isLoading: false,
            error: err instanceof Error ? err.message : 'Failed to open project',
          });
        }
      },

      /** Loads a project from a known path (e.g., from recent projects list) */
      async loadProject(folderPath: string): Promise<void> {
        patchState(store, { isLoading: true, error: null });
        try {
          const project = await repo.readProject(folderPath);
          patchState(store, {
            project,
            folderPath,
            isDirty: false,
            isLoading: false,
            lastSavedAt: new Date(),
          });
        } catch (err) {
          patchState(store, {
            isLoading: false,
            error: err instanceof Error ? err.message : 'Failed to load project',
          });
        }
      },

      setProject(proj: BookProject): void {
        patchState(store, { project: proj });
      },

      /** Saves the current project to disk */
      async saveProject(): Promise<void> {
        const { project, folderPath } = store;
        if (!project() || !folderPath()) return;
        patchState(store, { isSaving: true });
        try {
          await repo.writeProject(folderPath()!, project()!);
          patchState(store, {
            isSaving: false,
            isDirty: false,
            lastSavedAt: new Date(),
          });
        } catch (err: any) {
          patchState(store, {
            isSaving: false,
            error: err instanceof Error ? err.message : 'Failed to save project',
          });
          if (err && err.name === 'SyncConflictError') {
            drawer.open({
              title: 'Resolve Conflicts',
              component: ConflictResolutionComponent,
              width: 'half',
              inputs: { conflicts: err.conflicts }
            });
          }
        }
      },

      /** Updates a single chapter's markdown content and marks the store dirty */
      updateChapterContent(chapterId: string, markdown: string): void {
        patchState(store, (state) => {
          if (!state.project) return {};
          const updateInList = (list: Chapter[]) =>
            list.map((ch) => (ch.id === chapterId ? { ...ch, contentMarkdown: markdown } : ch));
          return {
            project: {
              ...state.project,
              frontMatterSections: updateInList(state.project.frontMatterSections ?? []),
              chapters: updateInList(state.project.chapters ?? []),
              backMatterSections: updateInList(state.project.backMatterSections ?? []),
            },
            isDirty: true,
          };
        });
      },

      /** Adds a new chapter to the project and marks dirty */
      addChapter(chapter: Chapter): void {
        patchState(store, (state) => {
          if (!state.project) return {};
          const type = chapter.frontMatter?.type ?? 'normal';
          const frontMatterSections = [...(state.project.frontMatterSections ?? [])];
          const chapters = [...(state.project.chapters ?? [])];
          const backMatterSections = [...(state.project.backMatterSections ?? [])];

          if (type === 'frontmatter') {
            frontMatterSections.push(chapter);
          } else if (type === 'backmatter') {
            backMatterSections.push(chapter);
          } else {
            chapters.push(chapter);
          }

          return {
            project: {
              ...state.project,
              frontMatterSections,
              chapters,
              backMatterSections,
            },
            isDirty: true,
          };
        });
      },

      /** Updates an existing chapter in the project and marks dirty */
      updateChapter(chapter: Chapter): void {
        patchState(store, (state) => {
          if (!state.project) return {};
          const chapterId = chapter.id;
          const newType = chapter.frontMatter?.type ?? 'normal';

          const filterOut = (list: Chapter[]) => list.filter((ch) => ch.id !== chapterId);
          let frontMatterSections = filterOut(state.project.frontMatterSections ?? []);
          let chapters = filterOut(state.project.chapters ?? []);
          let backMatterSections = filterOut(state.project.backMatterSections ?? []);

          if (newType === 'frontmatter') {
            frontMatterSections.push(chapter);
          } else if (newType === 'backmatter') {
            backMatterSections.push(chapter);
          } else {
            chapters.push(chapter);
          }

          const sortByOrder = (a: Chapter, b: Chapter) => a.sortOrder - b.sortOrder;
          frontMatterSections.sort(sortByOrder);
          chapters.sort(sortByOrder);
          backMatterSections.sort(sortByOrder);

          return {
            project: {
              ...state.project,
              frontMatterSections,
              chapters,
              backMatterSections,
            },
            isDirty: true,
          };
        });
      },

      /** Deletes a chapter by id and marks dirty */
      deleteChapter(chapterId: string): void {
        patchState(store, (state) => {
          if (!state.project) return {};
          const filterOut = (list: Chapter[]) => list.filter((ch) => ch.id !== chapterId);
          return {
            project: {
              ...state.project,
              frontMatterSections: filterOut(state.project.frontMatterSections ?? []),
              chapters: filterOut(state.project.chapters ?? []),
              backMatterSections: filterOut(state.project.backMatterSections ?? []),
            },
            isDirty: true,
          };
        });
      },

      /** Updates the book metadata and marks dirty */
      updateMeta(meta: Partial<any>): void {
        patchState(store, (state) => ({
          project: state.project
            ? { ...state.project, meta: { ...state.project.meta, ...meta } }
            : null,
          isDirty: true,
        }));
      },

      /** Marks the workspace dirty without any other state change */
      markDirty(): void {
        patchState(store, { isDirty: true });
      },

      /** Clears the open project (on close/new) */
      closeProject(): void {
        patchState(store, initialState);
      },
    };
  })
);
