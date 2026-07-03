import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { IpcService } from '../ipc/ipc.service';
import type {
  BuildRepository,
  BuildResult,
  BuildProgressEvent,
} from './build.repository';
import type { BookProject } from '@press/core';

/**
 * ElectronBuildRepository — implements BuildRepository via Electron IPC.
 *
 * The buildProgress$ observable is shared so multiple subscribers (e.g. the
 * export store and a toast) both receive events from a single IPC listener.
 */
@Injectable()
export class ElectronBuildRepository implements BuildRepository {
  private readonly ipc = inject(IpcService);

  readonly buildProgress$: Observable<BuildProgressEvent> =
    this.ipc.onBuildProgress();

  buildPdf(
    project: BookProject,
    target: string,
    outputDir: string
  ): Promise<BuildResult> {
    return this.ipc.buildPdf(project, target, outputDir);
  }

  buildEpub(
    project: BookProject,
    target: string,
    outputDir: string
  ): Promise<BuildResult> {
    return this.ipc.buildEpub(project, target, outputDir);
  }

  revealOutput(outputPath: string): Promise<void> {
    return this.ipc.revealOutput(outputPath);
  }
}
