import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ComponentRef,
  OnDestroy,
  ViewChild,
  ViewContainerRef,
  computed,
  effect,
  inject,
  untracked,
  NgZone,
} from '@angular/core';
import { DrawerService } from '../../services/drawer.service';

/**
 * AppDrawerHostComponent — the single global drawer host.
 *
 * Placed ONCE in AppComponent's template. Watches DrawerService signals and:
 *   1. Dynamically creates the configured component via ViewContainerRef
 *   2. Renders a fixed header with the drawer title and ✕ close button
 *   3. Listens for Escape key to close
 *   4. Destroys the component on close (after animation)
 *
 * ARCHITECTURE: This component IS the intra-module navigation primitive.
 * No feature component should import or render it directly.
 */
@Component({
  selector: 'app-drawer-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Backdrop -->
    @if (drawerService.isOpen()) {
      <div
        class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        (click)="drawerService.close()"
        aria-hidden="true"
      ></div>
    }

    <!-- Drawer Panel -->
    <div
      class="fixed inset-y-0 left-0 z-50 flex flex-col bg-card border-r border-border shadow-2xl
             transform transition-transform duration-300 ease-in-out"
      [class]="panelClass()"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="drawerService.config()?.title ?? 'Drawer'"
    >
      <!-- ── Fixed Header ─────────────────────────────────────────────────── -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-border shrink-0 bg-card">
        <h2 class="text-lg font-semibold text-foreground tracking-tight">
          {{ drawerService.config()?.title }}
        </h2>
        <button
          (click)="drawerService.close()"
          class="flex items-center justify-center w-8 h-8 rounded-md
                 text-muted-foreground hover:text-foreground
                 hover:bg-muted transition-colors duration-150
                 focus-visible:outline-2 focus-visible:outline-ring"
          aria-label="Close drawer"
          type="button"
        >
          <!-- ✕ icon (inline SVG — no icon lib dependency) -->
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
               viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>
      </div>

      <!-- ── Dynamic Content Area ────────────────────────────────────────── -->
      <div class="flex-1 overflow-y-auto overflow-x-hidden">
        <ng-container #dynamicHost />
      </div>
    </div>
  `,
})
export class AppDrawerHostComponent implements AfterViewInit, OnDestroy {
  @ViewChild('dynamicHost', { read: ViewContainerRef })
  private dynamicHost!: ViewContainerRef;

  readonly drawerService = inject(DrawerService);
  private readonly cdr = inject(ChangeDetectorRef);
  private componentRef: ComponentRef<unknown> | null = null;
  private escapeHandler: ((e: KeyboardEvent) => void) | null = null;

  /** CSS classes for width + slide-in/out transform */
  panelClass = computed(() => {
    const open = this.drawerService.isOpen();
    const width = this.drawerService.config()?.width ?? 'full';

    const widthClass = {
      full:         'w-full',
      'two-thirds': 'w-[67vw]',
      half:         'w-[50vw] min-w-[480px]',
    }[width];

    const translateClass = open ? 'translate-x-0' : '-translate-x-full';

    return `${widthClass} ${translateClass}`;
  });

  private readonly ngZone = inject(NgZone);

  static isTesting = false;

  constructor() {
    effect(() => {
      const open = this.drawerService.isOpen();
      const config = untracked(() => this.drawerService.config());

      if (open && config && this.dynamicHost) {
        this.mountComponent();
      } else if (!open && this.componentRef) {
        console.log('close timeout scheduled');
        if (AppDrawerHostComponent.isTesting) {
          this.destroyComponent();
          this.cdr.markForCheck();
        } else {
          this.ngZone.run(() => {
            setTimeout(() => {
              this.destroyComponent();
              this.cdr.markForCheck();
            }, 310);
          });
        }
      }

      this.updateEscapeListener(open);
    });
  }

  ngAfterViewInit(): void {
    // If drawer was opened before ViewChild was ready, mount now
    if (this.drawerService.isOpen() && this.drawerService.config()) {
      this.mountComponent();
    }
  }

  private mountComponent(): void {
    this.destroyComponent();
    const config = untracked(() => this.drawerService.config());
    if (!config || !this.dynamicHost) return;

    this.componentRef = this.dynamicHost.createComponent(config.component);

    if (config.inputs) {
      for (const [key, value] of Object.entries(config.inputs)) {
        this.componentRef.setInput(key, value);
      }
    }

    this.componentRef.changeDetectorRef.markForCheck();
    this.cdr.markForCheck();
  }

  private destroyComponent(): void {
    console.log('destroyComponent called. componentRef exists:', !!this.componentRef);
    this.componentRef?.destroy();
    this.dynamicHost?.clear();
    this.componentRef = null;
  }

  private updateEscapeListener(open: boolean): void {
    if (open && !this.escapeHandler) {
      this.escapeHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') this.drawerService.close();
      };
      document.addEventListener('keydown', this.escapeHandler);
    } else if (!open && this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
      this.escapeHandler = null;
    }
  }

  ngOnDestroy(): void {
    this.destroyComponent();
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
    }
  }
}
