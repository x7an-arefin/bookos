import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { DrawerService } from '../../../../shared/services/drawer.service';
import { PreflightIssue } from '../export.store';

@Component({
  selector: 'app-preflight-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6 space-y-6 max-w-lg mx-auto">
      <div>
        <h3 class="text-lg font-semibold text-foreground">Preflight Diagnostics</h3>
        <p class="text-xs text-muted-foreground">Deep dive diagnostic warnings and suggestions for publishing quality.</p>
      </div>

      <div class="space-y-4">
        @for (issue of issues(); track issue.code) {
          <div class="p-4 rounded-lg bg-card border border-border space-y-2">
            <div class="flex items-center gap-2">
              <span
                class="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded"
                [class.bg-destructive/15]="issue.severity === 'error'"
                [class.text-destructive]="issue.severity === 'error'"
                [class.bg-amber-500/15]="issue.severity === 'warning'"
                [class.text-amber-500]="issue.severity === 'warning'"
                [class.bg-emerald-500/15]="issue.severity === 'info'"
                [class.text-emerald-500]="issue.severity === 'info'"
              >
                {{ issue.severity }}
              </span>
              <span class="text-xs font-mono text-muted-foreground">{{ issue.code }}</span>
            </div>
            <p class="text-sm text-foreground">{{ issue.message }}</p>
          </div>
        } @empty {
          <div class="text-center py-8 text-sm text-muted-foreground">
            No diagnostic issues found.
          </div>
        }
      </div>

      <div class="flex items-center gap-3 pt-2 border-t border-border">
        <button
          (click)="drawer.close()"
          class="px-5 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  `
})
export class PreflightDetailComponent {
  readonly drawer = inject(DrawerService);
  readonly issues = input<PreflightIssue[]>([]);
}
