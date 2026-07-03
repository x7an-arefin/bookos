import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { DecimalPipe, UpperCasePipe, SlicePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ExportStore } from './export.store';
import { WorkspaceStore } from '../../store/workspace.store';
import { DrawerService } from '../../shared/services/drawer.service';
import { PreflightCheckComponent } from './components/preflight-check.component';
import { TargetConfigComponent } from './drawers/target-config.component';

@Component({
  selector: 'app-export',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PreflightCheckComponent, DecimalPipe, UpperCasePipe, SlicePipe],
  template: `
    @if (!workspaceStore.hasOpenProject()) {
      <div class="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <div class="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <svg class="w-8 h-8 text-muted-foreground" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </div>
        <div>
          <h3 class="text-lg font-semibold text-foreground mb-1">No project open</h3>
          <p class="text-sm text-muted-foreground">Open a book project from the dashboard first.</p>
        </div>
        <button
          (click)="goToDashboard()"
          class="mt-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium
                 hover:bg-primary/90 transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    } @else {
      <div class="flex flex-col h-full">

        <div class="px-8 pt-8 pb-6 border-b border-border shrink-0">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h1 class="text-2xl font-bold font-serif text-foreground">Export</h1>
              <p class="text-sm text-muted-foreground mt-0.5">
                {{ workspaceStore.projectTitle() }}
              </p>
            </div>
            <button
              (click)="openTargetConfig()"
              class="flex items-center gap-2 px-3.5 py-1.5 bg-secondary text-secondary-foreground
                     border border-border rounded-md text-sm font-medium
                     hover:bg-secondary/80 transition-colors"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.07 4.93l-1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M6.34 6.34L4.93 4.93M21 12h-2M5 12H3M12 21v-2M12 5V3"/>
              </svg>
              Configure Target
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto">
          <div class="max-w-3xl px-8 py-6 space-y-6">

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div class="p-5 rounded-xl border border-border bg-card">
                <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Format</p>
                <div class="flex items-center gap-2">
                  <span class="text-2xl font-bold font-serif text-foreground uppercase">
                    {{ exportStore.selectedFormat() }}
                  </span>
                  <span class="px-2 py-0.5 text-xs rounded-full border border-border text-muted-foreground">
                    {{ exportStore.selectedTarget()?.pageSize }}
                  </span>
                </div>
                <p class="text-sm text-muted-foreground mt-1">{{ exportStore.selectedTarget()?.label }}</p>
              </div>

              <div class="p-5 rounded-xl border border-border bg-card">
                <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Book Stats</p>
                <p class="text-2xl font-bold font-serif text-foreground">
                  {{ workspaceStore.chapterCount() }}
                  <span class="text-sm font-normal text-muted-foreground ml-1">chapters</span>
                </p>
                <p class="text-sm text-muted-foreground mt-1">
                  {{ workspaceStore.totalWordCount() | number }} total words
                </p>
              </div>
            </div>

            <div class="rounded-xl border border-border bg-card overflow-hidden">
              <app-preflight-check />
            </div>

            @if (exportStore.isBuilding()) {
              <div class="rounded-xl border border-border bg-card p-5 space-y-3">
                <div class="flex items-center justify-between text-sm">
                  <span class="font-medium text-foreground capitalize">
                    {{ exportStore.buildStage() ?? 'Preparing' }}…
                  </span>
                  <span class="text-muted-foreground font-mono">{{ exportStore.buildProgress() }}%</span>
                </div>
                <div class="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    class="h-full rounded-full bg-primary transition-all duration-300"
                    [style.width.%]="exportStore.buildProgress()"
                  ></div>
                </div>
                <p class="text-xs text-muted-foreground">{{ exportStore.buildMessage() }}</p>
              </div>
            }

            @if (exportStore.lastResult(); as result) {
              <div
                [class]="'rounded-xl border p-5 ' +
                         (result.success ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-destructive/30 bg-destructive/5')"
              >
                @if (result.success) {
                  <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <svg class="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none"
                           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                    </div>
                    <div class="flex-1">
                      <p class="text-sm font-semibold text-emerald-600">Export completed!</p>
                      @if (result.outputPath) {
                        <p class="text-xs text-muted-foreground mt-0.5 font-mono break-all">{{ result.outputPath }}</p>
                      }
                      <button
                        (click)="exportStore.revealOutput()"
                        class="mt-2 text-xs text-primary hover:underline"
                      >
                        Reveal in Finder / Explorer →
                      </button>
                    </div>
                  </div>
                } @else {
                  <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                      <svg class="w-4 h-4 text-destructive" viewBox="0 0 24 24" fill="none"
                           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                      </svg>
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-destructive">Export failed</p>
                      <p class="text-xs text-muted-foreground mt-0.5">{{ result.error }}</p>
                    </div>
                  </div>
                }
              </div>
            }

            <div class="flex items-center gap-3">
              <button
                (click)="build()"
                [disabled]="exportStore.isBuilding() || exportStore.hasErrors()"
                class="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground
                       rounded-lg text-sm font-semibold
                       hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
              >
                @if (exportStore.isBuilding()) {
                  <div class="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground
                              rounded-full animate-spin"></div>
                  Building…
                } @else {
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Export {{ exportStore.selectedFormat() | uppercase }}
                }
              </button>

              @if (exportStore.hasErrors()) {
                <p class="text-xs text-destructive">Fix preflight errors before exporting.</p>
              }
            </div>

            @if ((workspaceStore.project()?.exportHistory?.length ?? 0) > 0) {
              <div>
                <h2 class="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                  Export History
                </h2>
                <div class="space-y-2">
                  @for (rec of workspaceStore.project()!.exportHistory; track rec.completedAt) {
                    <div class="flex items-center gap-4 px-4 py-3 rounded-lg bg-card border border-border">
                      <span class="text-xs font-mono font-semibold uppercase text-muted-foreground w-10 shrink-0">
                        {{ rec.format }}
                      </span>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm text-foreground truncate">{{ rec.outputPath }}</p>
                        <p class="text-xs text-muted-foreground">
                          {{ rec.target }} ·
                          {{ rec.fileSizeBytes | number }} bytes
                          @if (rec.pageCount) { · {{ rec.pageCount }} pages }
                        </p>
                      </div>
                      <span class="text-xs text-muted-foreground shrink-0">
                        {{ rec.completedAt | slice:0:10 }}
                      </span>
                    </div>
                  }
                </div>
              </div>
            }

          </div>
        </div>
      </div>
    }
  `,
})
export class ExportComponent implements OnInit {
  readonly exportStore = inject(ExportStore);
  readonly workspaceStore = inject(WorkspaceStore);
  private readonly drawer = inject(DrawerService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    if (this.workspaceStore.hasOpenProject()) {
      this.exportStore.runPreflight();
    }
  }

  openTargetConfig(): void {
    this.drawer.open({
      title: 'Export Target',
      component: TargetConfigComponent,
      width: 'half',
    });
  }

  async build(): Promise<void> {
    await this.exportStore.build();
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
