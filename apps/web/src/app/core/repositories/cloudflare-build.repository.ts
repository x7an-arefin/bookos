import { Injectable } from '@angular/core';
import { Observable, EMPTY } from 'rxjs';
import type { BuildRepository, BuildResult, BuildProgressEvent } from './build.repository';
import type { BookProject } from '@press/core';

@Injectable()
export class CloudflareBuildRepository implements BuildRepository {
  readonly buildProgress$: Observable<BuildProgressEvent> = EMPTY;

  buildPdf(
    project: BookProject,
    target: string,
    outputDir: string
  ): Promise<BuildResult> {
    return Promise.resolve({
      success: false,
      error: 'PDF generation requires the BookOS desktop app.',
      validation: { errors: [], warnings: [] },
    });
  }

  buildEpub(
    project: BookProject,
    target: string,
    outputDir: string
  ): Promise<BuildResult> {
    return Promise.resolve({
      success: false,
      error: 'EPUB generation requires the BookOS desktop app.',
      validation: { errors: [], warnings: [] },
    });
  }

  revealOutput(outputPath: string): Promise<void> {
    return Promise.resolve();
  }
}
