import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspaceStore } from '../../store/workspace.store';
import { DashboardStore } from './dashboard.store';
import { DrawerService } from '../../shared/services/drawer.service';
import { CreateBookFormComponent } from './drawers/create-book-form.component';
import { BookDetailComponent } from './drawers/book-detail.component';

/**
 * DashboardComponent — the library home screen.
 *
 * Shows:
 *   - Welcome header with quick actions (New Book, Open Folder)
 *   - If a project is open: hero card + chapter list (via BookDetail drawer)
 *   - If no project: empty state with call-to-action
 *
 * Drawer Rule (intra-module):
 *   - "New Book" → CreateBookFormComponent in full-screen drawer
 *   - Book card click → BookDetailComponent in full-screen drawer
 *   - "Open Folder" → WorkspaceStore.openProject() → then opens BookDetail
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, FormsModule],
  template: `
    <div class="flex flex-col h-full">

      <!-- ── Page Header ─────────────────────────────────────────────────────── -->
      <div class="px-8 pt-8 pb-6 border-b border-border shrink-0">
        <div class="flex items-center justify-between gap-4">

          <div>
            <h1 class="text-2xl font-bold font-serif text-foreground">Your Library</h1>
            <p class="text-sm text-muted-foreground mt-0.5">
              Manage your book projects and start writing.
            </p>
          </div>

          <!-- Quick Actions -->
          <div class="flex items-center gap-2 shrink-0">

            <!-- Search (only when project open) -->
            @if (workspaceStore.hasOpenProject()) {
              <div class="relative">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"
                     viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search…"
                  [ngModel]="dashboardStore.searchQuery()"
                  (ngModelChange)="dashboardStore.setSearchQuery($event)"
                  class="pl-8 pr-3 py-1.5 w-44 bg-muted border border-border rounded-md
                         text-sm text-foreground placeholder:text-muted-foreground
                         focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring
                         transition-colors"
                />
              </div>
            }

            <!-- Open Folder -->
            <button
              (click)="openProject()"
              [disabled]="workspaceStore.isLoading()"
              class="flex items-center gap-2 px-3.5 py-1.5 bg-secondary text-secondary-foreground
                     border border-border rounded-md text-sm font-medium
                     hover:bg-secondary/80 disabled:opacity-50 transition-colors"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 19a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2 2h4a2 2 0 0 1 2 2v1"/>
                <path d="M21 15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4z"/>
              </svg>
              Open Folder
            </button>

            <!-- New Book -->
            <button
              (click)="newBook()"
              class="flex items-center gap-2 px-3.5 py-1.5 bg-primary text-primary-foreground
                     rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              New Book
            </button>
          </div>
        </div>
      </div>

      <!-- ── Content ─────────────────────────────────────────────────────────── -->
      <div class="flex-1 overflow-y-auto px-8 py-6">

        <!-- Loading state -->
        @if (workspaceStore.isLoading()) {
          <div class="flex flex-col items-center justify-center py-20 gap-4">
            <div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p class="text-sm text-muted-foreground">Loading project…</p>
          </div>
        }

        <!-- Error state -->
        @else if (workspaceStore.error()) {
          <div class="max-w-lg mx-auto mt-8 p-4 bg-destructive/10 border border-destructive/30
                      rounded-lg text-sm text-destructive flex items-start gap-3">
            <svg class="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <p class="font-medium">Failed to load project</p>
              <p class="mt-0.5 text-destructive/80">{{ workspaceStore.error() }}</p>
            </div>
          </div>
        }

        <!-- Open project — hero card -->
        @else if (workspaceStore.hasOpenProject()) {
          <div class="max-w-3xl">

            <!-- Hero: current project -->
            <section class="mb-8">
              <h2 class="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Current Project
              </h2>

              <div
                class="relative rounded-xl border border-border bg-card
                       hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5
                       transition-all duration-200 cursor-pointer overflow-hidden"
                (click)="openBookDetail()"
              >
                <!-- Gradient top accent bar -->
                <div class="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary/40"></div>

                <div class="p-6 flex items-start gap-6">
                  <!-- Book icon -->
                  <div class="w-16 h-20 rounded-md shrink-0 flex items-center justify-center
                              bg-gradient-to-br from-primary/20 to-accent/20 border border-border">
                    <svg class="w-7 h-7 text-muted-foreground" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
                    </svg>
                  </div>

                  <div class="flex-1 min-w-0">
                    @if (workspaceStore.project()?.meta?.genre) {
                      <span class="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
                        {{ workspaceStore.project()?.meta?.genre }}
                      </span>
                    }
                    <h3 class="text-xl font-bold font-serif text-foreground mt-0.5 mb-1">
                      {{ workspaceStore.projectTitle() }}
                    </h3>
                    @if (workspaceStore.project()?.meta?.author) {
                      <p class="text-sm text-muted-foreground mb-3">
                        by {{ workspaceStore.project()?.meta?.author }}
                      </p>
                    }

                    <!-- Stats -->
                    <div class="flex items-center gap-5 text-sm text-muted-foreground">
                      <span class="flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
                        </svg>
                        {{ workspaceStore.chapterCount() }} chapters
                      </span>
                      <span class="flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M3 6h18M3 12h18M3 18h12"/>
                        </svg>
                        {{ workspaceStore.totalWordCount() | number }} words
                      </span>
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="flex flex-col gap-2 shrink-0">
                    <button
                      (click)="openEditor(); $event.stopPropagation()"
                      class="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground
                             rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m9 18 6-6-6-6"/>
                      </svg>
                      Open Editor
                    </button>
                    <button
                      (click)="openBookDetail(); $event.stopPropagation()"
                      class="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground
                             border border-border rounded-md text-sm font-medium
                             hover:bg-secondary/80 transition-colors"
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <!-- Chapter preview -->
            @if (workspaceStore.chapterCount() > 0) {
              <section>
                <h2 class="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                  Chapters
                </h2>
                <div class="space-y-1.5">
                  @for (ch of workspaceStore.project()?.chapters ?? []; track ch.id; let i = $index) {
                    <div class="flex items-center gap-3 px-4 py-3 rounded-md bg-card border border-border
                                hover:border-primary/30 hover:bg-card/80 transition-colors cursor-pointer">
                      <span class="text-xs font-mono text-muted-foreground w-6 shrink-0 text-right">
                        {{ i + 1 }}
                      </span>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-foreground truncate">
                          {{ ch.title }}
                        </p>
                      </div>
                      <span class="text-xs text-muted-foreground shrink-0">
                        {{ getWordCount(ch) | number }} words
                      </span>
                    </div>
                  }
                </div>
              </section>
            }

          </div>
        }

        <!-- Empty state — no project open -->
        @else {
          <div class="flex flex-col items-center justify-center py-28 text-center max-w-md mx-auto">

            <!-- Icon -->
            <div class="relative mb-6">
              <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20
                          border border-border flex items-center justify-center shadow-lg">
                <svg class="w-10 h-10 text-muted-foreground" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
                </svg>
              </div>
              <!-- decorative ring -->
              <div class="absolute inset-0 rounded-2xl ring-1 ring-primary/20 scale-110 pointer-events-none"></div>
            </div>

            <h3 class="text-xl font-semibold font-serif text-foreground mb-2">
              Start your story
            </h3>
            <p class="text-sm text-muted-foreground leading-relaxed mb-8">
              Open an existing BookOS project folder, or create a new book
              to begin writing, editing, and publishing.
            </p>

            <div class="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
              <button
                (click)="newBook()"
                class="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground
                       rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors
                       w-full sm:w-auto justify-center"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                New Book
              </button>
              <button
                (click)="openProject()"
                [disabled]="workspaceStore.isLoading()"
                class="flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground
                       border border-border rounded-lg text-sm font-medium
                       hover:bg-secondary/80 transition-colors
                       w-full sm:w-auto justify-center disabled:opacity-50"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 19a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2 2h4a2 2 0 0 1 2 2v1"/>
                  <path d="M21 15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4z"/>
                </svg>
                Open Folder
              </button>
            </div>

            <!-- Tips -->
            <div class="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
              @for (tip of tips; track tip.title) {
                <div class="p-4 rounded-lg bg-card border border-border">
                  <div class="w-8 h-8 rounded-md bg-muted flex items-center justify-center mb-3">
                    <svg class="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path [attr.d]="tip.icon" />
                    </svg>
                  </div>
                  <h4 class="text-sm font-medium text-foreground mb-1">{{ tip.title }}</h4>
                  <p class="text-xs text-muted-foreground leading-relaxed">{{ tip.description }}</p>
                </div>
              }
            </div>
          </div>
        }

      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  readonly workspaceStore = inject(WorkspaceStore);
  readonly dashboardStore = inject(DashboardStore);
  private readonly drawer = inject(DrawerService);
  private readonly router = inject(Router);

  readonly tips = [
    {
      title: 'Write in Markdown',
      icon: 'M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z M14 2v6h6',
      description: 'Use rich Markdown with footnotes, headings, images, and tables.',
    },
    {
      title: 'Export to PDF & EPUB',
      icon: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
      description: 'One-click export to professionally typeset PDF and EPUB formats.',
    },
    {
      title: 'Multi-chapter Structure',
      icon: 'M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20',
      description: 'Organise your writing into chapters, reorder them by drag & drop.',
    },
  ];

  ngOnInit(): void {
    this.dashboardStore.loadRecentPaths();
  }

  async openProject(): Promise<void> {
    await this.workspaceStore.openProject();
    if (this.workspaceStore.hasOpenProject()) {
      this.openBookDetail();
    }
  }

  newBook(): void {
    this.drawer.open({
      title: 'New Book',
      component: CreateBookFormComponent,
      width: 'full',
    });
  }

  openBookDetail(): void {
    this.drawer.open({
      title: this.workspaceStore.projectTitle() ?? 'Book Details',
      component: BookDetailComponent,
      width: 'two-thirds',
    });
  }

  openEditor(): void {
    const path = this.workspaceStore.folderPath();
    if (path) {
      this.router.navigate(['/editor', encodeURIComponent(path)]);
    }
  }

  getWordCount(chapter: any): number {
    return (chapter.contentMarkdown?.split(/\s+/).filter((w: string) => w.length > 0).length) ?? 0;
  }
}
