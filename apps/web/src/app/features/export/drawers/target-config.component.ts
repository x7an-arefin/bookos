import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ExportStore, BUILT_IN_TARGETS } from '../export.store';
import { DrawerService } from '../../../shared/services/drawer.service';

@Component({
  selector: 'app-target-config',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="p-6 space-y-6">

      <div>
        <h3 class="text-sm font-semibold text-foreground mb-1">Export Target Configuration</h3>
        <p class="text-xs text-muted-foreground">Choose format and page size for this export run.</p>
      </div>

      <div class="space-y-4">

        <div class="space-y-1.5">
          <label class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Format</label>
          <div class="grid grid-cols-2 gap-2">
            @for (fmt of formats; track fmt.value) {
              <button
                (click)="exportStore.selectFormat(fmt.value)"
                [class.bg-primary]="exportStore.selectedFormat() === fmt.value"
                [class.text-primary-foreground]="exportStore.selectedFormat() === fmt.value"
                [class.border-primary]="exportStore.selectedFormat() === fmt.value"
                [class.bg-card]="exportStore.selectedFormat() !== fmt.value"
                [class.text-foreground]="exportStore.selectedFormat() !== fmt.value"
                [class.border-border]="exportStore.selectedFormat() !== fmt.value"
                class="flex flex-col items-start gap-1 px-4 py-3 rounded-lg border text-left
                       transition-all duration-150"
              >
                <span class="font-semibold text-sm">{{ fmt.label }}</span>
                <span class="text-[11px] opacity-75">{{ fmt.desc }}</span>
              </button>
            }
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Target</label>
          <div class="space-y-1.5">
            @for (target of filteredTargets(); track target.key) {
              <button
                (click)="exportStore.selectTarget(target.key)"
                [class]="'flex items-center gap-3 w-full px-4 py-3 rounded-lg border bg-card text-left transition-all duration-150 hover:border-primary/60 ' +
                         (exportStore.selectedTargetKey() === target.key ? 'border-primary bg-primary/5' : 'border-border')"
              >
                <div class="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                     [class.border-primary]="exportStore.selectedTargetKey() === target.key"
                     [class.border-border]="exportStore.selectedTargetKey() !== target.key">
                  @if (exportStore.selectedTargetKey() === target.key) {
                    <div class="w-2 h-2 rounded-full bg-primary"></div>
                  }
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-foreground">{{ target.label }}</p>
                  <p class="text-xs text-muted-foreground">{{ target.description }}</p>
                </div>
              </button>
            }
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3 pt-2 border-t border-border">
        <button
          (click)="drawer.close()"
          class="px-5 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium
                 hover:bg-primary/90 transition-colors"
        >
          Apply
        </button>
        <button
          (click)="drawer.close()"
          class="px-5 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  `,
})
export class TargetConfigComponent {
  readonly exportStore = inject(ExportStore);
  readonly drawer = inject(DrawerService);

  readonly formats = [
    { value: 'pdf' as const, label: 'PDF', desc: 'Print-ready PDF' },
    { value: 'epub' as const, label: 'EPUB', desc: 'Digital e-readers' },
  ];

  filteredTargets() {
    return BUILT_IN_TARGETS.filter((t) => t.format === this.exportStore.selectedFormat());
  }
}
