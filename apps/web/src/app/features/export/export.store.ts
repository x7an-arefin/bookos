import { computed } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { WorkspaceStore } from '../../store/workspace.store';
import { BUILD_REPOSITORY } from '../../core/tokens/repository.tokens';
import type { BuildProgressEvent, BuildResult } from '../../core/repositories/build.repository';

export type ExportFormat = 'pdf' | 'epub';
export type BuildStage = BuildProgressEvent['stage'];

export interface ExportTarget {
  key: string;
  label: string;
  format: ExportFormat;
  pageSize: string;
  description: string;
}

export interface PreflightIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
}

export interface ExportState {
  selectedFormat: ExportFormat;
  selectedTargetKey: string;
  outputDir: string | null;
  isBuilding: boolean;
  buildProgress: number;
  buildStage: BuildStage | null;
  buildMessage: string;
  lastResult: BuildResult | null;
  preflightIssues: PreflightIssue[];
  preflightDone: boolean;
}

const initialState: ExportState = {
  selectedFormat: 'pdf',
  selectedTargetKey: 'print-standard',
  outputDir: null,
  isBuilding: false,
  buildProgress: 0,
  buildStage: null,
  buildMessage: '',
  lastResult: null,
  preflightIssues: [],
  preflightDone: false,
};

export const BUILT_IN_TARGETS: ExportTarget[] = [
  { key: 'print-standard', label: 'Print — 6×9 in', format: 'pdf', pageSize: '6in 9in', description: 'Standard trade paperback size.' },
  { key: 'print-a4', label: 'Print — A4', format: 'pdf', pageSize: 'A4', description: 'European A4 format for print.' },
  { key: 'print-letter', label: 'Print — Letter', format: 'pdf', pageSize: 'Letter', description: 'US Letter size for print.' },
  { key: 'epub-standard', label: 'EPUB 3 — Reflowable', format: 'epub', pageSize: 'reflowable', description: 'Standard reflowable EPUB for e-readers.' },
  { key: 'epub-fixed', label: 'EPUB 3 — Fixed Layout', format: 'epub', pageSize: 'fixed', description: 'Fixed layout EPUB for illustrated books.' },
];

export const ExportStore = signalStore(
  { providedIn: 'root' },

  withState<ExportState>(initialState),

  withComputed(({ selectedTargetKey, selectedFormat, preflightIssues }) => ({
    selectedTarget: computed<ExportTarget | undefined>(() =>
      BUILT_IN_TARGETS.find((t) => t.key === selectedTargetKey())
    ),
    hasErrors: computed(() => preflightIssues().some((i) => i.severity === 'error')),
    errorCount: computed(() => preflightIssues().filter((i) => i.severity === 'error').length),
    warningCount: computed(() => preflightIssues().filter((i) => i.severity === 'warning').length),
    pdfTargets: computed(() => BUILT_IN_TARGETS.filter((t) => t.format === 'pdf')),
    epubTargets: computed(() => BUILT_IN_TARGETS.filter((t) => t.format === 'epub')),
  })),

  withMethods((store) => {
    const buildRepo = inject(BUILD_REPOSITORY);
    const workspaceStore = inject(WorkspaceStore);

    return {
      selectFormat(format: ExportFormat): void {
        const firstTarget = BUILT_IN_TARGETS.find((t) => t.format === format);
        patchState(store, {
          selectedFormat: format,
          selectedTargetKey: firstTarget?.key ?? '',
          preflightDone: false,
          preflightIssues: [],
          lastResult: null,
        });
      },

      selectTarget(key: string): void {
        patchState(store, { selectedTargetKey: key, preflightDone: false, preflightIssues: [], lastResult: null });
      },

      runPreflight(): void {
        const project = workspaceStore.project();
        const issues: PreflightIssue[] = [];

        if (!project) {
          issues.push({ severity: 'error', code: 'NO_PROJECT', message: 'No book project is open.' });
          patchState(store, { preflightIssues: issues, preflightDone: true });
          return;
        }

        if (!project.meta?.title?.trim()) {
          issues.push({ severity: 'error', code: 'MISSING_TITLE', message: 'Book title is required.' });
        }
        if (!project.meta?.author?.trim()) {
          issues.push({ severity: 'warning', code: 'MISSING_AUTHOR', message: 'Author name is not set.' });
        }
        if ((project.chapters?.length ?? 0) === 0) {
          issues.push({ severity: 'error', code: 'NO_CHAPTERS', message: 'The book has no chapters.' });
        }
        if (!project.meta?.language) {
          issues.push({ severity: 'warning', code: 'MISSING_LANG', message: 'Book language is not set — defaulting to English.' });
        }
        if (project.chapters?.some((c) => !c.contentMarkdown?.trim())) {
          issues.push({ severity: 'warning', code: 'EMPTY_CHAPTER', message: 'One or more chapters have no content.' });
        }

        if (issues.length === 0) {
          issues.push({ severity: 'info', code: 'OK', message: 'All preflight checks passed.' });
        }

        patchState(store, { preflightIssues: issues, preflightDone: true });
      },

      async build(): Promise<void> {
        const project = workspaceStore.project();
        const target = store.selectedTarget();
        if (!project || !target) return;

        const outDir = store.outputDir() ?? workspaceStore.folderPath() ?? '.';

        patchState(store, { isBuilding: true, buildProgress: 0, buildStage: 'validating', buildMessage: 'Starting…', lastResult: null });

        const sub = buildRepo.buildProgress$.subscribe((ev) => {
          patchState(store, { buildProgress: ev.percent, buildStage: ev.stage, buildMessage: ev.message });
        });

        try {
          let result: BuildResult;
          if (target.format === 'pdf') {
            result = await buildRepo.buildPdf(project, target.key, outDir);
          } else {
            result = await buildRepo.buildEpub(project, target.key, outDir);
          }
          patchState(store, { isBuilding: false, buildProgress: 100, buildStage: 'done', lastResult: result });
        } catch (err) {
          patchState(store, {
            isBuilding: false,
            lastResult: { success: false, error: err instanceof Error ? err.message : 'Build failed' },
          });
        } finally {
          sub.unsubscribe();
        }
      },

      async revealOutput(): Promise<void> {
        const path = store.lastResult()?.outputPath;
        if (path) await buildRepo.revealOutput(path);
      },

      reset(): void {
        patchState(store, initialState);
      },
    };
  })
);
