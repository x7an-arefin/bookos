import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { EditorStore } from './editor.store';
import { DrawerService } from '../../shared/services/drawer.service';
import { ChapterSettingsComponent } from './drawers/chapter-settings.component';
import type { Chapter } from '@press/core';

@Component({
  selector: 'app-chapter-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  styles: [`
    :host { display: contents; }
  `],
  template: `
    <aside class="w-64 shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border h-full overflow-hidden">

      <div class="flex items-center justify-between px-4 py-3 border-b border-sidebar-border shrink-0">
        <span class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Chapters</span>
        <button
          (click)="addChapter()"
          class="flex items-center justify-center w-6 h-6 rounded text-muted-foreground
                 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          title="Add chapter"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto py-1">

        @if (editorStore.allChapters().length === 0) {
          <div class="px-4 py-8 text-center">
            <p class="text-xs text-muted-foreground">No chapters yet.</p>
            <button
              (click)="addChapter()"
              class="mt-2 text-xs text-primary hover:underline"
            >Add first chapter</button>
          </div>
        }

        @for (chapter of editorStore.allChapters(); track chapter.id; let i = $index) {
          <div
            class="group flex items-start gap-2 px-3 py-2.5 mx-1 rounded-md cursor-pointer
                   transition-colors"
            [class.bg-sidebar-accent]="editorStore.activeChapterId() === chapter.id"
            [class.text-sidebar-accent-foreground]="editorStore.activeChapterId() === chapter.id"
            [class.text-sidebar-foreground]="editorStore.activeChapterId() !== chapter.id"
            (click)="editorStore.activateChapter(chapter.id)"
          >
            <span class="text-[10px] font-mono text-muted-foreground mt-0.5 w-4 shrink-0 text-right">
              {{ i + 1 }}
            </span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate leading-snug">
                {{ chapter.title }}
              </p>
              <p class="text-[10px] text-muted-foreground mt-0.5">
                {{ wordCount(chapter) | number }} words
              </p>
            </div>
            <button
              (click)="openSettings(chapter); $event.stopPropagation()"
              class="opacity-0 group-hover:opacity-100 flex items-center justify-center
                     w-5 h-5 mt-0.5 shrink-0 rounded text-muted-foreground
                     hover:text-foreground transition-all"
              title="Chapter settings"
            >
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
              </svg>
            </button>
          </div>
        }
      </div>

      <div class="shrink-0 px-4 py-3 border-t border-sidebar-border">
        <div class="text-xs text-muted-foreground space-y-0.5">
          <div class="flex justify-between">
            <span>Total chapters</span>
            <span>{{ editorStore.allChapters().length }}</span>
          </div>
          <div class="flex justify-between">
            <span>Total words</span>
            <span>{{ totalWordCount() | number }}</span>
          </div>
        </div>
      </div>
    </aside>
  `,
})
export class ChapterSidebarComponent {
  readonly editorStore = inject(EditorStore);
  private readonly drawer = inject(DrawerService);

  readonly totalWordCount = () => {
    return this.editorStore.allChapters().reduce((acc: number, ch: Chapter) => {
      return acc + this.wordCount(ch);
    }, 0);
  };

  wordCount(chapter: Chapter): number {
    return (chapter.contentMarkdown?.split(/\s+/).filter((w) => w.length > 0).length) ?? 0;
  }

  addChapter(): void {
    this.drawer.open({
      title: 'New Chapter',
      component: ChapterSettingsComponent,
      width: 'half',
      inputs: { mode: 'create' },
    });
  }

  openSettings(chapter: Chapter): void {
    this.drawer.open({
      title: 'Chapter Settings',
      component: ChapterSettingsComponent,
      width: 'half',
      inputs: { chapter, mode: 'edit' },
    });
  }
}
