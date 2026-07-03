import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ExportStore, BUILT_IN_TARGETS } from './export.store';
import { BUILD_REPOSITORY } from '../../core/tokens/repository.tokens';
import { WORKSPACE_REPOSITORY } from '../../core/tokens/repository.tokens';
import type { BuildRepository, BuildProgressEvent } from '../../core/repositories/build.repository';
import type { WorkspaceRepository } from '../../core/repositories/workspace.repository';
import type { BookProject } from '@press/core';

function makeProject(overrides: Partial<BookProject> = {}): BookProject {
  return {
    id: 'p1',
    meta: { title: 'My Book', author: 'Jane', language: 'en' },
    config: { global: {}, targets: {}, activeTheme: 'default' },
    frontMatterSections: [],
    chapters: [
      { id: 'c1', title: 'Ch 1', sortOrder: 1, contentMarkdown: 'Some content', lastModified: '' },
    ],
    backMatterSections: [],
    assets: [],
    exportHistory: [],
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function makeBuildRepo(overrides: Partial<BuildRepository> = {}): BuildRepository {
  return {
    buildProgress$: of<BuildProgressEvent>(),
    buildPdf:       jest.fn().mockResolvedValue({ success: true, outputPath: '/out.pdf' }),
    buildEpub:      jest.fn().mockResolvedValue({ success: true, outputPath: '/out.epub' }),
    revealOutput:   jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeWorkspaceRepo(): WorkspaceRepository {
  return {
    openFolder:       jest.fn().mockResolvedValue('/book'),
    readProject:      jest.fn().mockResolvedValue(makeProject()),
    writeProject:     jest.fn().mockResolvedValue(undefined),
    deleteProject:    jest.fn().mockResolvedValue(undefined),
    renameProject:    jest.fn().mockResolvedValue(undefined),
    getRecentProjects: jest.fn().mockResolvedValue([]),
  };
}

describe('ExportStore', () => {
  let store: InstanceType<typeof ExportStore>;
  let buildRepo: BuildRepository;

  const setup = (buildOverrides: Partial<BuildRepository> = {}) => {
    buildRepo = makeBuildRepo(buildOverrides);
    TestBed.configureTestingModule({
      providers: [
        { provide: BUILD_REPOSITORY, useValue: buildRepo },
        { provide: WORKSPACE_REPOSITORY, useValue: makeWorkspaceRepo() },
      ],
    });
    store = TestBed.inject(ExportStore);
  };

  afterEach(() => TestBed.resetTestingModule());

  describe('initial state', () => {
    it('defaults to pdf format', () => {
      setup();
      expect(store.selectedFormat()).toBe('pdf');
    });

    it('has a default target selected', () => {
      setup();
      expect(store.selectedTargetKey()).toBe('print-standard');
      expect(store.selectedTarget()).toBeDefined();
    });

    it('isBuilding starts false', () => {
      setup();
      expect(store.isBuilding()).toBe(false);
    });

    it('preflightDone starts false', () => {
      setup();
      expect(store.preflightDone()).toBe(false);
    });
  });

  describe('BUILT_IN_TARGETS', () => {
    it('contains 5 targets total', () => {
      expect(BUILT_IN_TARGETS).toHaveLength(5);
    });

    it('has 3 pdf targets and 2 epub targets', () => {
      expect(BUILT_IN_TARGETS.filter((t) => t.format === 'pdf')).toHaveLength(3);
      expect(BUILT_IN_TARGETS.filter((t) => t.format === 'epub')).toHaveLength(2);
    });
  });

  describe('selectFormat()', () => {
    it('switches to epub and selects first epub target', () => {
      setup();
      store.selectFormat('epub');
      expect(store.selectedFormat()).toBe('epub');
      const target = store.selectedTarget();
      expect(target?.format).toBe('epub');
    });

    it('resets preflight state on format change', () => {
      setup();
      TestBed.runInInjectionContext(() => store.runPreflight());
      store.selectFormat('epub');
      expect(store.preflightDone()).toBe(false);
      expect(store.preflightIssues()).toHaveLength(0);
    });
  });

  describe('selectTarget()', () => {
    it('changes selected target key', () => {
      setup();
      store.selectTarget('print-a4');
      expect(store.selectedTargetKey()).toBe('print-a4');
    });
  });

  describe('runPreflight()', () => {
    it('passes when project is valid', async () => {
      setup();
      const wsStore = TestBed.inject(require('../../store/workspace.store').WorkspaceStore);
      await wsStore.openProject();
      store.runPreflight();
      expect(store.preflightDone()).toBe(true);
      expect(store.hasErrors()).toBe(false);
      const infoOnly = store.preflightIssues().every((i) => i.severity === 'info');
      expect(infoOnly).toBe(true);
    });

    it('reports error when no project is open', () => {
      setup();
      store.runPreflight();
      expect(store.hasErrors()).toBe(true);
      expect(store.preflightIssues().some((i) => i.code === 'NO_PROJECT')).toBe(true);
    });

    it('reports MISSING_TITLE error when title is empty', async () => {
      setup({ buildPdf: jest.fn().mockResolvedValue({ success: true }) });
      const wsStore = TestBed.inject(require('../../store/workspace.store').WorkspaceStore);
      await wsStore.openProject();
      wsStore.updateMeta({ title: '' });
      store.runPreflight();
      expect(store.preflightIssues().some((i) => i.code === 'MISSING_TITLE')).toBe(true);
    });

    it('reports NO_CHAPTERS error when chapters array is empty', async () => {
      const emptyProject = makeProject({ chapters: [] });
      const repo = makeWorkspaceRepo();
      (repo.readProject as jest.Mock).mockResolvedValue(emptyProject);
      buildRepo = makeBuildRepo();
      TestBed.configureTestingModule({
        providers: [
          { provide: BUILD_REPOSITORY, useValue: buildRepo },
          { provide: WORKSPACE_REPOSITORY, useValue: repo },
        ],
      });
      store = TestBed.inject(ExportStore);
      const wsStore = TestBed.inject(require('../../store/workspace.store').WorkspaceStore);
      await wsStore.openProject();
      store.runPreflight();
      expect(store.preflightIssues().some((i) => i.code === 'NO_CHAPTERS')).toBe(true);
    });
  });

  describe('errorCount / warningCount computed', () => {
    it('errorCount counts only error-severity issues', () => {
      setup();
      store.runPreflight();
      const errors = store.preflightIssues().filter((i) => i.severity === 'error').length;
      expect(store.errorCount()).toBe(errors);
    });
  });

  describe('pdfTargets / epubTargets computed', () => {
    it('pdfTargets returns only pdf-format targets', () => {
      setup();
      store.pdfTargets().forEach((t) => expect(t.format).toBe('pdf'));
    });

    it('epubTargets returns only epub-format targets', () => {
      setup();
      store.epubTargets().forEach((t) => expect(t.format).toBe('epub'));
    });
  });

  describe('reset()', () => {
    it('returns store to initial state', () => {
      setup();
      store.selectFormat('epub');
      store.reset();
      expect(store.selectedFormat()).toBe('pdf');
      expect(store.selectedTargetKey()).toBe('print-standard');
      expect(store.preflightDone()).toBe(false);
    });
  });
});
