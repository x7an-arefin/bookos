import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { ExportStore } from '../export.store';
import { DrawerService } from '../../../shared/services/drawer.service';

@Component({
  selector: 'app-preflight-check',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6 space-y-4">

      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-foreground">Preflight Check</h3>
        <button
          (click)="exportStore.runPreflight()"
          class="text-xs text-primary hover:underline"
        >
          Run again
        </button>
      </div>

      @if (!exportStore.preflightDone()) {
        <div class="flex items-center gap-3 text-sm text-muted-foreground py-4">
          <div class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          Running preflight checks…
        </div>
      } @else {
        <div class="space-y-2">
          @for (issue of exportStore.preflightIssues(); track issue.code) {
            <div
              [class]="'flex items-start gap-2.5 px-3 py-2.5 rounded-md text-sm border ' +
                       (issue.severity === 'error' ? 'bg-destructive/10 border-destructive/20 text-destructive' :
                        issue.severity === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                        'bg-emerald-500/10 border-emerald-500/20 text-emerald-600')"
            >
              <svg class="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                @if (issue.severity === 'error') {
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                } @else if (issue.severity === 'warning') {
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                } @else {
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                }
              </svg>
              <span>{{ issue.message }}</span>
            </div>
          }
        </div>

        @if (exportStore.errorCount() === 0 && exportStore.warningCount() === 0) {
          <p class="text-xs text-muted-foreground">
            ✓ Book is ready to export.
          </p>
        } @else {
          <p class="text-xs text-muted-foreground">
            {{ exportStore.errorCount() }} error(s) · {{ exportStore.warningCount() }} warning(s)
          </p>
        }
      }
    </div>
  `,
})
export class PreflightCheckComponent {
  readonly exportStore = inject(ExportStore);
  readonly drawer = inject(DrawerService);
}
