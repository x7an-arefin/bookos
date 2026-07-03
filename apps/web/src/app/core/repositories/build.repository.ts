import { Observable } from 'rxjs';
import type { BookProject } from '@press/core';

/**
 * BuildResult returned by the build pipeline.
 * Mirrors the shape from @press/core engine.
 */
export interface BuildResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  validation?: {
    errors: Array<{ severity: string; code: string; message: string }>;
    warnings: Array<{ severity: string; code: string; message: string }>;
  };
}

/**
 * BuildProgressEvent pushed from the main process during a build.
 */
export interface BuildProgressEvent {
  percent: number;
  message: string;
  stage: 'validating' | 'compiling' | 'rendering' | 'optimizing' | 'packaging' | 'done';
}

/**
 * BuildRepository — interface for all book compilation operations.
 *
 * Electron implementation: invokes IPC → engine.ts in main process
 * Cloudflare implementation (Phase 4): invokes build Worker endpoint
 */
export interface BuildRepository {
  /** Hot observable of build progress events — subscribe before calling buildPdf/buildEpub */
  readonly buildProgress$: Observable<BuildProgressEvent>;

  /** Triggers a PDF build for the given project and target */
  buildPdf(
    project: BookProject,
    target: string,
    outputDir: string
  ): Promise<BuildResult>;

  /** Triggers an EPUB build for the given project and target */
  buildEpub(
    project: BookProject,
    target: string,
    outputDir: string
  ): Promise<BuildResult>;

  /** Opens the output folder in the OS file explorer */
  revealOutput(outputPath: string): Promise<void>;
}
