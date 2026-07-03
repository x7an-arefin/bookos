import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DrawerService } from '../../../shared/services/drawer.service';
import { WorkspaceStore } from '../../../store/workspace.store';
import { VersionHistoryStore } from '../stores/version-history.store';
import type { Chapter } from '@press/core';

@Component({
  selector: 'app-version-history',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, DecimalPipe, FormsModule],
  template: `
    <div class="h-full flex flex-col bg-background text-foreground">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
        <div>
          <h3 class="text-lg font-bold font-serif text-foreground">Version History</h3>
          <p class="text-xs text-muted-foreground">Preview, compare and restore snapshots of your book.</p>
        </div>
        <button (click)="drawer.close()" class="text-muted-foreground hover:text-foreground">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Create Snapshot Inline Form -->
      <div class="px-6 py-3 border-b border-border bg-muted/30 flex items-center gap-3 shrink-0">
        @if (showCreateForm()) {
          <input
            type="text"
            [(ngModel)]="newSnapshotLabel"
            placeholder="e.g. Completed Act 1 draft"
            class="flex-1 bg-background border border-border/80 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-primary"
            (keyup.enter)="onCreateSnapshot()"
          />
          <button (click)="onCreateSnapshot()" [disabled]="!newSnapshotLabel.trim()" class="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors">
            Save
          </button>
          <button (click)="showCreateForm.set(false)" class="text-xs text-muted-foreground hover:text-foreground">
            Cancel
          </button>
        } @else {
          <span class="text-xs text-muted-foreground flex-1">Create a new snapshot to checkpoint your current progress.</span>
          <button (click)="showCreateForm.set(true)" class="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 text-xs font-semibold rounded-lg transition-colors">
            Create Snapshot
          </button>
        }
      </div>

      <!-- Split Pane Body -->
      <div class="flex-1 flex overflow-hidden">
        
        <!-- Left: Snapshots List (1/3 width) -->
        <div class="w-1/3 border-r border-border flex flex-col overflow-hidden bg-muted/10">
          <div class="flex-1 overflow-y-auto p-3 space-y-2">
            @if (historyStore.isLoading()) {
              <p class="text-xs text-muted-foreground p-3">Loading history...</p>
            } @else {
              @for (snapshot of historyStore.snapshots(); track snapshot.id) {
                <button
                  (click)="onSelectSnapshot(snapshot.id)"
                  [class]="'w-full text-left p-3.5 border rounded-xl transition-all flex flex-col gap-1.5 bg-card/60 hover:bg-card hover:shadow-sm ' + (historyStore.selectedSnapshotId() === snapshot.id ? 'border-primary' : 'border-border/60')"
                >
                  <div class="flex items-start justify-between gap-2 w-full">
                    <span class="text-xs font-bold text-foreground truncate flex-1">
                      {{ snapshot.label || 'Auto-save' }}
                    </span>
                    <span
                      [class]="'text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded shrink-0 ' + (!snapshot.isAuto ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')"
                    >
                      {{ snapshot.isAuto ? 'Auto' : 'Manual' }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between text-[10px] text-muted-foreground w-full">
                    <span>{{ snapshot.createdAt | date:'short' }}</span>
                    <span>{{ snapshot.wordCount | number }} w</span>
                  </div>
                </button>
              } @empty {
                <p class="text-xs text-muted-foreground p-3 text-center">No snapshots available.</p>
              }
            }
          </div>
        </div>

        <!-- Right: Preview & Restore (2/3 width) -->
        <div class="w-2/3 flex flex-col overflow-hidden bg-background">
          @if (historyStore.isLoadingPreview()) {
            <div class="flex-1 flex flex-col items-center justify-center p-8 gap-3">
              <svg class="animate-spin h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <span class="text-xs text-muted-foreground">Loading preview...</span>
            </div>
          } @else if (historyStore.previewProject()) {
            <!-- Preview Pane Content -->
            <div class="flex-1 flex flex-col overflow-hidden">
              <!-- Top Preview Control Bar -->
              <div class="px-6 py-4 border-b border-border bg-muted/10 flex items-center justify-between shrink-0">
                <div>
                  <h4 class="text-xs font-bold text-foreground">Previewing Snapshot Content</h4>
                  <p class="text-[10px] text-muted-foreground">You are reviewing a read-only checkpoint version.</p>
                </div>
                <button (click)="onRestoreSnapshot()" class="px-4 py-1.5 bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5">
                  Restore this Version
                </button>
              </div>

              <!-- Preview Scroll Area -->
              <div class="flex-1 overflow-y-auto p-6 space-y-6">
                <!-- Chapters Summary -->
                <div class="space-y-3">
                  @for (chapter of allPreviewChapters(); track chapter.id) {
                    <div class="p-4 bg-muted/30 border border-border/80 rounded-xl space-y-2">
                      <div class="flex items-center justify-between border-b border-border/40 pb-2">
                        <h4 class="text-xs font-bold text-foreground">{{ chapter.title }}</h4>
                        <span class="text-[10px] text-muted-foreground">{{ getWordCount(chapter) }} words</span>
                      </div>
                      <div class="text-xs text-foreground/80 leading-relaxed font-serif whitespace-pre-wrap line-clamp-6">
                        {{ chapter.contentMarkdown || 'Empty chapter content.' }}
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>
          } @else {
            <!-- Empty State -->
            <div class="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <svg class="w-12 h-12 text-muted-foreground/40 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <p class="text-sm font-medium">Select a snapshot to preview</p>
              <p class="text-xs mt-1">Review the contents of any previous revision before deciding to restore it.</p>
            </div>
          }
        </div>

      </div>
    </div>
  `,
  styles: [`
    :host { height: 100%; display: block; }
  `],
})
export class VersionHistoryComponent implements OnInit {
  readonly drawer = inject(DrawerService);
  readonly workspaceStore = inject(WorkspaceStore);
  readonly historyStore = inject(VersionHistoryStore);

  readonly showCreateForm = signal(false);
  newSnapshotLabel = '';

  ngOnInit() {
    const bookId = this.workspaceStore.project()?.id;
    if (bookId) {
      this.historyStore.loadSnapshots(bookId);
    }
  }

  onSelectSnapshot(snapshotId: string) {
    this.historyStore.selectSnapshot(snapshotId);
  }

  async onCreateSnapshot() {
    if (!this.newSnapshotLabel.trim()) return;
    await this.historyStore.createSnapshot(this.newSnapshotLabel);
    this.newSnapshotLabel = '';
    this.showCreateForm.set(false);
  }

  async onRestoreSnapshot() {
    const active = this.historyStore.selectedSnapshotId();
    if (!active) return;
    if (confirm('Are you sure you want to restore this version? Your current live changes will be archived in an automatic backup.')) {
      await this.historyStore.restoreSnapshot(active);
      this.drawer.close();
    }
  }

  allPreviewChapters(): Chapter[] {
    const p = this.historyStore.previewProject();
    if (!p) return [];
    return [
      ...(p.frontMatterSections || []),
      ...(p.chapters || []),
      ...(p.backMatterSections || []),
    ].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  getWordCount(chapter: any): number {
    return (chapter.contentMarkdown?.split(/\s+/).filter((w: string) => w.length > 0).length) ?? 0;
  }
}
