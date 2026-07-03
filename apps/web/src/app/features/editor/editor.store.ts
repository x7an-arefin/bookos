import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { WorkspaceStore } from '../../store/workspace.store';
import { ENVIRONMENT } from '../../core/tokens/environment.token';
import { AuthStore } from '../../store/auth.store';
import { Doc } from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import type { Chapter } from '@press/core';

export interface EditorState {
  activeChapterId: string | null;
  previewVisible: boolean;
  wordCountVisible: boolean;
  focusMode: boolean;
  isCollabActive: boolean;
  collabUsersCount: number;
  yDoc: Doc | null;
  yProvider: WebsocketProvider | null;
}

const initialState: EditorState = {
  activeChapterId: null,
  previewVisible: false,
  wordCountVisible: true,
  focusMode: false,
  isCollabActive: false,
  collabUsersCount: 0,
  yDoc: null,
  yProvider: null,
};

export const EditorStore = signalStore(
  { providedIn: 'root' },

  withState<EditorState>(initialState),

  withComputed(({ activeChapterId }) => {
    const workspaceStore = inject(WorkspaceStore);
    return {
      activeChapter: computed<Chapter | null>(() => {
        const id = activeChapterId();
        if (!id) return null;
        const project = workspaceStore.project();
        return (
          project?.chapters?.find((c) => c.id === id) ??
          project?.frontMatterSections?.find((c) => c.id === id) ??
          project?.backMatterSections?.find((c) => c.id === id) ??
          null
        );
      }),
      allChapters: computed<Chapter[]>(() => {
        const p = workspaceStore.project();
        if (!p) return [];
        return [
          ...(p.frontMatterSections ?? []),
          ...(p.chapters ?? []),
          ...(p.backMatterSections ?? []),
        ].sort((a, b) => a.sortOrder - b.sortOrder);
      }),
    };
  }),

  withMethods((store) => {
    const workspaceStore = inject(WorkspaceStore);
    const authStore = inject(AuthStore);
    const env = inject(ENVIRONMENT);

    return {
      activateChapter(chapterId: string): void {
        patchState(store, { activeChapterId: chapterId });
      },

      activateFirstChapter(): void {
        const chapters = store.allChapters();
        if (chapters.length > 0) {
          patchState(store, { activeChapterId: chapters[0].id });
        }
      },

      updateContent(markdown: string): void {
        const id = store.activeChapterId();
        if (!id) return;
        workspaceStore.updateChapterContent(id, markdown);
      },

      togglePreview(): void {
        patchState(store, { previewVisible: !store.previewVisible() });
      },

      toggleFocusMode(): void {
        patchState(store, { focusMode: !store.focusMode() });
      },

      startCollaboration(bookId: string): void {
        if (store.isCollabActive()) return;

        const token = authStore.jwt();
        if (!token) return;

        const wsBase = env.apiBaseUrl.replace(/^http/, 'ws');
        const wsUrl = `${wsBase}/api/books/${bookId}/collab/ws?token=${token}`;

        const doc = new Doc();
        const provider = new WebsocketProvider(wsUrl, bookId, doc);

        provider.awareness.on('change', () => {
          const count = provider.awareness.getStates().size;
          patchState(store, { collabUsersCount: count });
        });

        patchState(store, {
          isCollabActive: true,
          yDoc: doc,
          yProvider: provider,
        });
      },

      stopCollaboration(): void {
        if (!store.isCollabActive()) return;

        const provider = store.yProvider();
        if (provider) {
          provider.destroy();
        }

        const doc = store.yDoc();
        if (doc) {
          doc.destroy();
        }

        patchState(store, {
          isCollabActive: false,
          yDoc: null,
          yProvider: null,
          collabUsersCount: 0,
        });
      },

      reset(): void {
        this.stopCollaboration();
        patchState(store, initialState);
      },
    };
  })
);
