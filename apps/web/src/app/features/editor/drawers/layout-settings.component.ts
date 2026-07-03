import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkspaceStore } from '../../../../store/workspace.store';
import { DrawerService } from '../../../../shared/services/drawer.service';

@Component({
  selector: 'app-layout-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="p-6 space-y-6 max-w-lg mx-auto">
      <div>
        <h3 class="text-lg font-semibold text-foreground">Layout Settings</h3>
        <p class="text-xs text-muted-foreground">Configure page geometry and typography settings.</p>
      </div>

      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-xs font-semibold uppercase tracking-widest text-muted-foreground" for="page-size">Page Size</label>
            <select
              id="page-size"
              [(ngModel)]="pageSize"
              class="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            >
              <option value="6in 9in">6×9 in (Standard)</option>
              <option value="A4">A4</option>
              <option value="Letter">US Letter</option>
            </select>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold uppercase tracking-widest text-muted-foreground" for="font-family">Base Font</label>
            <select
              id="font-family"
              [(ngModel)]="baseFont"
              class="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            >
              <option value="serif">Playfair Display (Serif)</option>
              <option value="sans">Inter (Sans-serif)</option>
              <option value="mono">JetBrains Mono (Monospace)</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-xs font-semibold uppercase tracking-widest text-muted-foreground" for="font-size">Font Size</label>
            <input
              id="font-size"
              type="text"
              [(ngModel)]="baseFontSize"
              class="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            />
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold uppercase tracking-widest text-muted-foreground" for="line-height">Line Height</label>
            <input
              id="line-height"
              type="number"
              step="0.05"
              [(ngModel)]="baseLineHeight"
              class="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            />
          </div>
        </div>

        <div class="space-y-3 pt-2">
          <div class="flex items-center gap-2">
            <input
              id="headers"
              type="checkbox"
              [(ngModel)]="runningHeaders"
              class="w-4 h-4 rounded border-border accent-primary"
            />
            <label class="text-sm text-foreground font-medium" for="headers">Enable Running Headers</label>
          </div>

          <div class="flex items-center gap-2">
            <input
              id="drop-caps"
              type="checkbox"
              [(ngModel)]="dropCaps"
              class="w-4 h-4 rounded border-border accent-primary"
            />
            <label class="text-sm text-foreground font-medium" for="drop-caps">Enable Drop Caps</label>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3 pt-2 border-t border-border">
        <button
          (click)="save()"
          class="px-5 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Save Layout
        </button>
        <button
          (click)="drawer.close()"
          class="px-5 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  `
})
export class LayoutSettingsComponent implements OnInit {
  readonly drawer = inject(DrawerService);
  private readonly workspaceStore = inject(WorkspaceStore);

  pageSize = signal('6in 9in');
  baseFont = signal('serif');
  baseFontSize = signal('11pt');
  baseLineHeight = signal(1.5);
  runningHeaders = signal(true);
  dropCaps = signal(false);

  ngOnInit(): void {
    const config = this.workspaceStore.project()?.config?.global;
    if (config) {
      this.pageSize.set(config.pageSize ?? '6in 9in');
      this.baseFont.set(config.baseFont ?? 'serif');
      this.baseFontSize.set(config.baseFontSize ?? '11pt');
      this.baseLineHeight.set(config.baseLineHeight ?? 1.5);
      this.runningHeaders.set(config.runningHeaders ?? true);
      this.dropCaps.set(config.dropCaps ?? false);
    }
  }

  save(): void {
    const project = this.workspaceStore.project();
    if (project) {
      const globalConfig = {
        ...project.config.global,
        pageSize: this.pageSize(),
        baseFont: this.baseFont(),
        baseFontSize: this.baseFontSize(),
        baseLineHeight: this.baseLineHeight(),
        runningHeaders: this.runningHeaders(),
        dropCaps: this.dropCaps()
      };
      this.workspaceStore.updateMeta({
        config: {
          ...project.config,
          global: globalConfig
        }
      });
    }
    this.drawer.close();
  }
}
