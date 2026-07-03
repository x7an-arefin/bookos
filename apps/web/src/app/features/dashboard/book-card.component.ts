import { ChangeDetectionStrategy, Component, EventEmitter } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import type { BookProject } from '@press/core';

@Component({
  selector: 'app-book-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  inputs: ['project'],
  outputs: ['cardClicked', 'openEditor'],
  styles: [`
    :host { display: contents; }

    .book-spine {
      width: 6px;
      border-radius: 4px 0 0 4px;
      flex-shrink: 0;
      background: linear-gradient(
        180deg,
        oklch(0.60 0.22 240) 0%,
        oklch(0.75 0.15 45) 100%
      );
    }
  `],
  template: `
    <div
      class="group relative flex rounded-lg border border-border bg-card
             hover:border-primary/40 hover:shadow-md hover:shadow-primary/5
             transition-all duration-200 cursor-pointer overflow-hidden"
      (click)="cardClicked.emit(project)"
    >
      <div class="book-spine"></div>

      <div class="flex-1 p-4 min-w-0">
        @if (project.meta.genre) {
          <span class="inline-block text-[10px] font-semibold tracking-wider uppercase
                       text-muted-foreground mb-2">
            {{ project.meta.genre }}
          </span>
        }

        <h3 class="font-semibold text-foreground font-serif text-base leading-snug
                   group-hover:text-primary transition-colors truncate mb-0.5">
          {{ project.meta.title ?? 'Untitled Book' }}
        </h3>

        @if (project.meta.subtitle) {
          <p class="text-sm text-muted-foreground truncate mb-2">
            {{ project.meta.subtitle }}
          </p>
        }

        <div class="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
          <span class="flex items-center gap-1">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
            </svg>
            {{ chapterCount() }} ch
          </span>

          @if (wordCount() > 0) {
            <span class="flex items-center gap-1">
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18M3 12h18M3 18h12"/>
              </svg>
              {{ wordCount() | number }} words
            </span>
          }

          @if (project.meta.author) {
            <span class="ml-auto truncate max-w-[120px]">{{ project.meta.author }}</span>
          }
        </div>
      </div>

      <div class="flex flex-col justify-center px-3 opacity-0 group-hover:opacity-100
                  transition-opacity duration-200 shrink-0">
        <button
          class="p-1.5 rounded-md text-muted-foreground hover:text-primary
                 hover:bg-primary/10 transition-colors"
          title="Open in editor"
          (click)="openEditor.emit(project); $event.stopPropagation()"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </button>
      </div>
    </div>
  `,
})
export class BookCardComponent {
  project!: BookProject;

  readonly cardClicked = new EventEmitter<BookProject>();
  readonly openEditor = new EventEmitter<BookProject>();

  chapterCount(): number {
    return this.project?.chapters?.length ?? 0;
  }

  wordCount(): number {
    const chapters = this.project?.chapters ?? [];
    return chapters.reduce((acc, ch) => {
      const words = (ch as any).contentMarkdown
        ?.split(/\s+/)
        .filter((w: string) => w.length > 0).length ?? 0;
      return acc + words;
    }, 0);
  }
}
