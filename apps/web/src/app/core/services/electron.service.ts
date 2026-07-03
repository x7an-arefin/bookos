import { Injectable, signal } from '@angular/core';

/**
 * ElectronService — runtime detection for the Electron context.
 * Provides a reactive signal so components and guards can react to
 * the presence or absence of the Electron IPC bridge.
 *
 * This is the ONLY service that accesses window.electronAPI at the detection level.
 * Actual IPC calls go through IpcService → repositories.
 */
@Injectable({ providedIn: 'root' })
export class ElectronService {
  /** True when running inside the Electron shell (preload bridge exposed) */
  readonly isElectron = signal(
    typeof (window as any)['electronAPI'] !== 'undefined'
  );
}
