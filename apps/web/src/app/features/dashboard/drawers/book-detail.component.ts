import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { WorkspaceStore } from '../../../store/workspace.store';
import { DrawerService } from '../../../shared/services/drawer.service';

/**
 * BookDetailComponent — detail panel for an open book project.
 *
 * Opens inside the full-screen left drawer via DrawerService.
 * Shows book metadata, chapter list, and action buttons.
 *
 * Actions:
 *   "Open Editor" → closes drawer + navigates to /editor/:path
 *   "Export"      → closes drawer + navigates to /export/:path
 */
@Component({
  selector: 'app-book-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  template: `
    <div class="p-8 max-w-2xl mx-auto">

      @if (workspaceStore.hasOpenProject()) {
        <!-- Hero section -->
        <div class="flex items-start gap-6 mb-8">

          <!-- Book cover placeholder -->
          <div class="w-24 h-32 rounded-md shrink-0 flex items-center justify-center
                      bg-gradient-to-br from-primary/20 to-accent/20
                      border border-border shadow-md">
            <svg class="w-10 h-10 text-muted-foreground" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
            </svg>
          </div>

          <div class="flex-1 min-w-0">
            <!-- Genre -->
            @if (workspaceStore.project()?.meta?.genre) {
              <span class="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
                {{ workspaceStore.project()?.meta?.genre }}
              </span>
            }
            <h2 class="text-2xl font-semibold font-serif text-foreground mt-1 mb-0.5">
              {{ workspaceStore.project()?.meta?.title ?? 'Untitled' }}
            </h2>
            @if (workspaceStore.project()?.meta?.subtitle) {
              <p class="text-sm text-muted-foreground mb-1">
                {{ workspaceStore.project()?.meta?.subtitle }}
              </p>
            }
            @if (workspaceStore.project()?.meta?.author) {
              <p class="text-sm font-medium text-foreground/80">
                by {{ workspaceStore.project()?.meta?.author }}
              </p>
            }

            <!-- Stats -->
            <div class="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span>{{ workspaceStore.chapterCount() }} chapters</span>
              <span>{{ workspaceStore.totalWordCount() | number }} words</span>
            </div>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="flex items-center gap-3 mb-8">
          <button
            (click)="openInEditor()"
            class="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground
                   rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Open Editor
          </button>

          <button
            (click)="openExport()"
            class="flex items-center gap-2 px-5 py-2.5 bg-secondary text-secondary-foreground
                   border border-border rounded-md text-sm font-medium
                   hover:bg-secondary/80 transition-colors"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export Book
          </button>
        </div>

        <!-- Chapter list -->
        <div>
          <h3 class="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Chapters ({{ workspaceStore.chapterCount() }})
          </h3>

          @if (workspaceStore.chapterCount() === 0) {
            <p class="text-sm text-muted-foreground">No chapters yet. Open in the editor to start writing.</p>
          } @else {
            <div class="space-y-1">
              @for (chapter of workspaceStore.project()?.chapters ?? []; track chapter.id; let i = $index) {
                <div class="flex items-center gap-3 px-3 py-2.5 rounded-md
                            bg-card border border-border hover:border-primary/30
                            transition-colors">
                  <span class="text-xs font-mono text-muted-foreground w-5 shrink-0">
                    {{ i + 1 }}
                  </span>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-foreground truncate">
                      {{ chapter.title }}
                    </p>
                  </div>
                  <span class="text-xs text-muted-foreground shrink-0">
                    {{ getWordCount(chapter) | number }} w
                  </span>
                </div>
              }
            </div>
          }
        </div>

      } @else {
        <div class="flex flex-col items-center justify-center py-20 text-center">
          <p class="text-muted-foreground text-sm">No project is open.</p>
        </div>
      }
    </div>
  `,
})
export class BookDetailComponent {
  readonly workspaceStore = inject(WorkspaceStore);
  private readonly drawer = inject(DrawerService);
  private readonly router = inject(Router);

  openInEditor(): void {
    const path = this.workspaceStore.folderPath();
    this.drawer.close();
    if (path) {
      this.router.navigate(['/editor', encodeURIComponent(path)]);
    }
  }

  openExport(): void {
    const path = this.workspaceStore.folderPath();
    this.drawer.close();
    if (path) {
      this.router.navigate(['/export', encodeURIComponent(path)]);
    }
  }

  getWordCount(chapter: any): number {
    return (chapter.contentMarkdown?.split(/\s+/).filter((w: string) => w.length > 0).length) ?? 0;
  }
}
