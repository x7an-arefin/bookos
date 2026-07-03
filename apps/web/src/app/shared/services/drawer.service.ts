import { Injectable, signal, Type } from '@angular/core';

/**
 * Configuration object passed to DrawerService.open().
 *
 * T is the type of the dynamically loaded component.
 */
export interface DrawerConfig<T = unknown> {
  /** Header title rendered in the drawer's fixed top bar */
  title: string;
  /** The standalone Angular component to dynamically load */
  component: Type<T>;
  /** Signal inputs to pass to the component via setInput() */
  inputs?: Record<string, unknown>;
  /**
   * Drawer width:
   *   'full'       — full screen (default) — for forms and complex views
   *   'two-thirds' — 67vw — for tables and lists
   *   'half'       — 50vw — for simple detail panels
   */
  width?: 'full' | 'two-thirds' | 'half';
  /** Optional callback fired when the drawer finishes closing */
  onClose?: () => void;
}

/**
 * DrawerService — single API for the full-screen left drawer UX pattern.
 *
 * ARCHITECTURE RULE:
 *   Any user action within a feature module that would open a "new screen"
 *   (form, detail panel, list, settings) MUST call drawerService.open().
 *   Router navigation is reserved for CROSS-MODULE transitions only.
 *
 * Usage:
 *   const drawer = inject(DrawerService);
 *   drawer.open({ title: 'New Book', component: CreateBookFormComponent });
 */
@Injectable({ providedIn: 'root' })
export class DrawerService {
  /** Reactive signal — true when the drawer is open */
  readonly isOpen = signal(false);

  /** Reactive signal — the current drawer configuration, or null when closed */
  readonly config = signal<DrawerConfig | null>(null);

  /**
   * Opens the drawer with the given configuration.
   * If a drawer is already open, it is replaced immediately.
   */
  open<T>(config: DrawerConfig<T>): void {
    this.config.set(config as DrawerConfig);
    this.isOpen.set(true);
  }

  /**
   * Closes the drawer.
   * The config is cleared after the close animation completes (300ms).
   */
  close(): void {
    this.isOpen.set(false);
    setTimeout(() => {
      const cfg = this.config();
      cfg?.onClose?.();
      this.config.set(null);
    }, 300);
  }
}
