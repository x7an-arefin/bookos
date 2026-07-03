import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkspaceStore } from '../../../store/workspace.store';
import { DrawerService } from '../../../shared/services/drawer.service';
import type { Chapter } from '@press/core';

@Component({
  selector: 'app-chapter-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="p-6 max-w-lg mx-auto">
      <div class="space-y-5">

        <div class="space-y-1.5">
          <label class="text-sm font-medium text-foreground" for="ch-title">
            Chapter Title <span class="text-destructive">*</span>
          </label>
          <input
            id="ch-title"
            type="text"
            [(ngModel)]="title"
            placeholder="Chapter One"
            class="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm
                   placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium text-foreground" for="ch-type">Chapter Type</label>
          <select
            id="ch-type"
            [(ngModel)]="chapterType"
            class="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm
                   focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          >
            <option value="normal">Normal</option>
            <option value="part-opener">Part Opener</option>
            <option value="frontmatter">Front Matter</option>
            <option value="backmatter">Back Matter</option>
          </select>
        </div>

        <div class="flex items-center gap-2">
          <input
            id="ch-drop-cap"
            type="checkbox"
            [(ngModel)]="dropCap"
            class="w-4 h-4 rounded border-border accent-primary"
          />
          <label class="text-sm font-medium text-foreground" for="ch-drop-cap">
            Drop cap on first paragraph
          </label>
        </div>

        @if (error()) {
          <div class="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
            {{ error() }}
          </div>
        }

        <div class="flex items-center gap-3 pt-4 border-t border-border">
          <button
            (click)="save()"
            [disabled]="!title().trim()"
            class="px-5 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium
                   hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {{ mode() === 'create' ? 'Add Chapter' : 'Save Changes' }}
          </button>
          @if (mode() === 'edit') {
            <button
              (click)="deleteChapter()"
              class="px-5 py-2 bg-destructive/10 text-destructive border border-destructive/20
                     rounded-md text-sm font-medium hover:bg-destructive/20 transition-colors"
            >
              Delete
            </button>
          }
          <button
            (click)="drawer.close()"
            class="px-5 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ChapterSettingsComponent implements OnInit {
  readonly chapter = input<Chapter | null>(null);
  readonly mode = input<'create' | 'edit'>('create');

  readonly drawer = inject(DrawerService);
  private readonly workspaceStore = inject(WorkspaceStore);

  title = signal('');
  chapterType = signal<string>('normal');
  dropCap = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const ch = this.chapter();
    if (ch && this.mode() === 'edit') {
      this.title.set(ch.title ?? '');
      this.chapterType.set(ch.frontMatter?.type ?? 'normal');
      this.dropCap.set(ch.frontMatter?.dropCap ?? false);
    }
  }

  save(): void {
    const titleVal = this.title().trim();
    if (!titleVal) { this.error.set('Title is required.'); return; }

    if (this.mode() === 'create') {
      const project = this.workspaceStore.project();
      if (!project) return;
      const newChapter: Chapter = {
        id: crypto.randomUUID(),
        title: titleVal,
        sortOrder: (project.chapters?.length ?? 0) + 1,
        contentMarkdown: '',
        lastModified: new Date().toISOString(),
        frontMatter: {
          type: this.chapterType() as any,
          dropCap: this.dropCap(),
        },
      };
      this.workspaceStore.addChapter(newChapter);
      this.workspaceStore.updateMeta({ updatedAt: new Date().toISOString() });
    } else {
      const ch = this.chapter();
      if (!ch) return;
      const updated: Chapter = {
        ...ch,
        title: titleVal,
        lastModified: new Date().toISOString(),
        frontMatter: {
          ...ch.frontMatter,
          type: this.chapterType() as any,
          dropCap: this.dropCap(),
        },
      };
      this.workspaceStore.updateChapter(updated);
    }

    this.drawer.close();
  }

  deleteChapter(): void {
    const ch = this.chapter();
    if (ch) {
      this.workspaceStore.deleteChapter(ch.id);
    }
    this.drawer.close();
  }
}
