import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DrawerService } from '../../../shared/services/drawer.service';
import { WorkspaceStore } from '../../../store/workspace.store';

export interface ConflictedChapter {
  id: string;
  title: string;
  clientContent: string;
  serverContent: string;
  clientLastModified: number;
  serverLastModified: number;
}

interface Resolution {
  chapterId: string;
  type: 'local' | 'server' | 'merged';
  mergedContent?: string;
}

@Component({
  selector: 'app-conflict-resolution',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, DecimalPipe, FormsModule],
  template: `
    <div class="h-full flex flex-col bg-background text-foreground">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
        <div>
          <h3 class="text-lg font-bold font-serif text-destructive">Sync Conflict Detected</h3>
          <p class="text-xs text-muted-foreground">The server has a newer version of the following chapters. Please resolve each conflict.</p>
        </div>
      </div>

      <!-- Conflicts List -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6">
        @for (conflict of conflicts(); track conflict.id; let idx = $index) {
          <div class="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
            <div class="bg-muted/40 px-5 py-3 border-b border-border/60 flex items-center justify-between">
              <h4 class="text-xs font-bold text-foreground">{{ conflict.title }}</h4>
              <span class="text-[10px] text-muted-foreground">Conflict {{ idx + 1 }} of {{ conflicts().length }}</span>
            </div>

            <!-- Side-by-side Comparison -->
            <div class="grid grid-cols-1 md:grid-cols-2 border-b border-border/60">
              
              <!-- Left: Local Changes -->
              <div
                class="p-5 border-r border-border/40 space-y-3"
                [style.background-color]="resolutions()[conflict.id]?.type === 'local' ? 'rgba(16, 185, 129, 0.05)' : ''"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Your Local Changes
                  </span>
                  <span class="text-[10px] text-muted-foreground">{{ getWordCount(conflict.clientContent) | number }} words</span>
                </div>
                <div class="text-[10px] text-muted-foreground">Last modified: {{ conflict.clientLastModified | date:'medium' }}</div>
                <div class="bg-muted/40 p-3 rounded-lg text-xs font-mono h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {{ conflict.clientContent || '(No content)' }}
                </div>
                <button
                  (click)="selectResolution(conflict.id, 'local')"
                  class="w-full py-1.5 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-500 text-xs font-semibold rounded-lg border border-emerald-500/20 transition-all"
                  [class.bg-emerald-500]="resolutions()[conflict.id]?.type === 'local'"
                  [class.text-white]="resolutions()[conflict.id]?.type === 'local'"
                >
                  Keep Local
                </button>
              </div>

              <!-- Right: Server Changes -->
              <div
                class="p-5 space-y-3"
                [style.background-color]="resolutions()[conflict.id]?.type === 'server' ? 'rgba(59, 130, 246, 0.05)' : ''"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    Server Changes
                  </span>
                  <span class="text-[10px] text-muted-foreground">{{ getWordCount(conflict.serverContent) | number }} words</span>
                </div>
                <div class="text-[10px] text-muted-foreground">Last modified: {{ conflict.serverLastModified | date:'medium' }}</div>
                <div class="bg-muted/40 p-3 rounded-lg text-xs font-mono h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {{ conflict.serverContent || '(No content)' }}
                </div>
                <button
                  (click)="selectResolution(conflict.id, 'server')"
                  class="w-full py-1.5 bg-blue-500/10 hover:bg-blue-500/15 text-blue-500 text-xs font-semibold rounded-lg border border-blue-500/20 transition-all"
                  [class.bg-blue-500]="resolutions()[conflict.id]?.type === 'server'"
                  [class.text-white]="resolutions()[conflict.id]?.type === 'server'"
                >
                  Keep Server
                </button>
              </div>

            </div>

            <!-- Manual Merge Box -->
            <div class="p-4 bg-muted/20">
              @if (resolutions()[conflict.id]?.type === 'merged') {
                <div class="space-y-3">
                  <label class="block text-[10px] font-bold text-foreground uppercase tracking-wide">Manual Merge Result</label>
                  <textarea
                    [(ngModel)]="resolutions()[conflict.id].mergedContent"
                    class="w-full bg-background border border-border/80 rounded-lg p-3 text-xs font-mono h-32 focus:outline-none focus:border-primary"
                    placeholder="Merge the changes manually here..."
                  ></textarea>
                </div>
              } @else {
                <button (click)="startManualMerge(conflict)" class="text-xs text-primary hover:underline font-semibold flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                  </svg>
                  Merge Manually
                </button>
              }
            </div>

          </div>
        }
      </div>

      <!-- Action Footer -->
      <div class="px-6 py-4 border-t border-border bg-muted/10 flex items-center justify-between shrink-0">
        <button (click)="onCancel()" class="px-4 py-2 border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold rounded-lg transition-colors">
          Cancel Sync
        </button>
        <button
          (click)="onResolveAndSync()"
          [disabled]="!allResolved()"
          class="px-5 py-2 bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
        >
          Resolve and Sync
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { height: 100%; display: block; }
  `],
})
export class ConflictResolutionComponent {
  readonly drawer = inject(DrawerService);
  readonly workspaceStore = inject(WorkspaceStore);

  // Input properties
  readonly conflicts = input.required<ConflictedChapter[]>();

  // Resolution map
  readonly resolutions = signal<Record<string, Resolution>>({});

  selectResolution(chapterId: string, type: 'local' | 'server') {
    this.resolutions.update((res) => ({
      ...res,
      [chapterId]: { chapterId, type },
    }));
  }

  startManualMerge(conflict: ConflictedChapter) {
    // Populate manual merge with local changes as a starting point
    this.resolutions.update((res) => ({
      ...res,
      [conflict.id]: {
        chapterId: conflict.id,
        type: 'merged',
        mergedContent: conflict.clientContent,
      },
    }));
  }

  allResolved(): boolean {
    const list = this.conflicts();
    const map = this.resolutions();
    return list.every((c) => map[c.id] !== undefined);
  }

  getWordCount(text: string): number {
    return (text?.split(/\s+/).filter((w) => w.length > 0).length) ?? 0;
  }

  onCancel() {
    this.drawer.close();
  }

  async onResolveAndSync() {
    if (!this.allResolved()) return;

    const project = this.workspaceStore.project();
    if (!project) return;

    // Mutate the local workspace project structure with the chosen resolutions
    const map = this.resolutions();
    const updateChapter = (ch: any) => {
      const res = map[ch.id];
      if (!res) return ch;

      let content = ch.contentMarkdown;
      let timestamp = new Date(ch.lastModified).getTime();

      if (res.type === 'server') {
        const conflict = this.conflicts().find((c) => c.id === ch.id);
        content = conflict?.serverContent || '';
        timestamp = conflict?.serverLastModified || Date.now();
      } else if (res.type === 'merged') {
        content = res.mergedContent || '';
        timestamp = Date.now(); // Newly merged content gets fresh client timestamp
      } else if (res.type === 'local') {
        // Keep local content as is, but increment its timestamp so it forces overwrite on next sync push
        timestamp = Date.now() + 1000;
      }

      return {
        ...ch,
        contentMarkdown: content,
        lastModified: new Date(timestamp).toISOString(),
      };
    };

    const updated = {
      ...project,
      frontMatterSections: (project.frontMatterSections || []).map(updateChapter),
      chapters: (project.chapters || []).map(updateChapter),
      backMatterSections: (project.backMatterSections || []).map(updateChapter),
    };

    // Update the workspace store with the resolved content
    this.workspaceStore.setProject(updated);
    await this.workspaceStore.saveProject();
    this.drawer.close();
  }
}
