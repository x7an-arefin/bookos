import { TestBed } from '@angular/core/testing';
import { WorkspaceStore } from './workspace.store';
import { WORKSPACE_REPOSITORY } from '../core/tokens/repository.tokens';
import type { WorkspaceRepository } from '../core/repositories/workspace.repository';
import type { BookProject } from '@press/core';

function makeProject(overrides: Partial<BookProject> = {}): BookProject {
  return {
    id: 'proj-1',
    meta: { title: 'Test Book', author: 'Author', language: 'en' },
    config: { global: {}, targets: {}, activeTheme: 'default' },
    frontMatterSections: [],
    chapters: [
      { id: 'ch-1', title: 'Chapter One', sortOrder: 1, contentMarkdown: 'Hello world', lastModified: '' },
      { id: 'ch-2', title: 'Chapter Two', sortOrder: 2, contentMarkdown: 'Foo bar baz', lastModified: '' },
    ],
    backMatterSections: [],
    assets: [],
    exportHistory: [],
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function makeRepo(overrides: Partial<WorkspaceRepository> = {}): WorkspaceRepository {
  return {
    openFolder:       jest.fn().mockResolvedValue('/test/book'),
    readProject:      jest.fn().mockResolvedValue(makeProject()),
    writeProject:     jest.fn().mockResolvedValue(undefined),
    deleteProject:    jest.fn().mockResolvedValue(undefined),
    renameProject:    jest.fn().mockResolvedValue(undefined),
    getRecentProjects: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe('WorkspaceStore', () => {
  let store: InstanceType<typeof WorkspaceStore>;
  let repo: WorkspaceRepository;

  const setup = (repoOverrides: Partial<WorkspaceRepository> = {}) => {
    repo = makeRepo(repoOverrides);
    TestBed.configureTestingModule({
      providers: [{ provide: WORKSPACE_REPOSITORY, useValue: repo }],
    });
    store = TestBed.inject(WorkspaceStore);
  };

  afterEach(() => TestBed.resetTestingModule());

  describe('initial state', () => {
    it('starts with no project open', () => {
      setup();
      expect(store.hasOpenProject()).toBe(false);
      expect(store.project()).toBeNull();
      expect(store.isLoading()).toBe(false);
      expect(store.error()).toBeNull();
    });

    it('totalWordCount is 0 with no project', () => {
      setup();
      expect(store.totalWordCount()).toBe(0);
    });

    it('chapterCount is 0 with no project', () => {
      setup();
      expect(store.chapterCount()).toBe(0);
    });
  });

  describe('openProject()', () => {
    it('loads a project and sets state correctly', async () => {
      setup();
      await store.openProject();
      expect(store.hasOpenProject()).toBe(true);
      expect(store.folderPath()).toBe('/test/book');
      expect(store.projectTitle()).toBe('Test Book');
      expect(store.isDirty()).toBe(false);
      expect(store.isLoading()).toBe(false);
    });

    it('sets error state when repo throws', async () => {
      setup({ readProject: jest.fn().mockRejectedValue(new Error('Disk read failed')) });
      await store.openProject();
      expect(store.error()).toBe('Disk read failed');
      expect(store.isLoading()).toBe(false);
      expect(store.hasOpenProject()).toBe(false);
    });

    it('returns early without state change when openFolder returns null', async () => {
      setup({ openFolder: jest.fn().mockResolvedValue(null) });
      await store.openProject();
      expect(store.hasOpenProject()).toBe(false);
      expect(store.isLoading()).toBe(false);
    });
  });

  describe('computed signals', () => {
    it('chapterCount reflects loaded project chapters', async () => {
      setup();
      await store.openProject();
      expect(store.chapterCount()).toBe(2);
    });

    it('totalWordCount sums words across all chapters', async () => {
      setup();
      await store.openProject();
      expect(store.totalWordCount()).toBe(5);
    });

    it('projectTitle returns null when no project', () => {
      setup();
      expect(store.projectTitle()).toBeNull();
    });
  });

  describe('updateChapterContent()', () => {
    it('updates a chapter markdown and marks store dirty', async () => {
      setup();
      await store.openProject();
      store.updateChapterContent('ch-1', 'Updated content here');
      const chapter = store.project()!.chapters.find((c) => c.id === 'ch-1');
      expect(chapter?.contentMarkdown).toBe('Updated content here');
      expect(store.isDirty()).toBe(true);
    });

    it('does not modify other chapters', async () => {
      setup();
      await store.openProject();
      store.updateChapterContent('ch-1', 'New');
      const ch2 = store.project()!.chapters.find((c) => c.id === 'ch-2');
      expect(ch2?.contentMarkdown).toBe('Foo bar baz');
    });
  });

  describe('saveProject()', () => {
    it('calls writeProject and clears dirty flag', async () => {
      setup();
      await store.openProject();
      store.updateChapterContent('ch-1', 'New content');
      expect(store.isDirty()).toBe(true);
      await store.saveProject();
      expect(store.isDirty()).toBe(false);
      expect(repo.writeProject).toHaveBeenCalledTimes(1);
    });

    it('is a no-op when no project is open', async () => {
      setup();
      await store.saveProject();
      expect(repo.writeProject).not.toHaveBeenCalled();
    });
  });

  describe('closeProject()', () => {
    it('resets state back to initial', async () => {
      setup();
      await store.openProject();
      store.closeProject();
      expect(store.hasOpenProject()).toBe(false);
      expect(store.folderPath()).toBeNull();
      expect(store.isDirty()).toBe(false);
    });
  });

  describe('updateMeta()', () => {
    it('merges partial meta into the project and marks dirty', async () => {
      setup();
      await store.openProject();
      store.updateMeta({ title: 'New Title', genre: 'Fantasy' });
      expect(store.projectTitle()).toBe('New Title');
      expect(store.project()!.meta.genre).toBe('Fantasy');
      expect(store.isDirty()).toBe(true);
    });
  });
});
