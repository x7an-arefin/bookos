import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { EditorStore } from './editor.store';

@Component({
  selector: 'app-preview-pane',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: contents; }

    .preview-body :global(h1) { font-size: 2rem; font-weight: 700; font-family: var(--font-serif); margin: 1.5rem 0 0.75rem; }
    .preview-body :global(h2) { font-size: 1.5rem; font-weight: 600; font-family: var(--font-serif); margin: 1.25rem 0 0.5rem; }
    .preview-body :global(h3) { font-size: 1.2rem; font-weight: 600; margin: 1rem 0 0.5rem; }
    .preview-body :global(p)  { margin: 0 0 1rem; line-height: 1.85; }
    .preview-body :global(blockquote) {
      border-left: 3px solid var(--color-primary);
      padding: 0.25rem 0 0.25rem 1rem;
      margin: 1rem 0;
      color: var(--color-muted-foreground);
      font-style: italic;
    }
    .preview-body :global(code) {
      font-family: var(--font-mono);
      font-size: 0.875em;
      background: var(--color-muted);
      border-radius: 3px;
      padding: 0.1em 0.35em;
    }
    .preview-body :global(pre) {
      background: var(--color-muted);
      border-radius: 6px;
      padding: 1rem;
      overflow-x: auto;
      margin: 1rem 0;
    }
    .preview-body :global(ul), .preview-body :global(ol) { padding-left: 1.5rem; margin: 0.5rem 0 1rem; }
    .preview-body :global(li) { margin-bottom: 0.25rem; line-height: 1.7; }
    .preview-body :global(hr) { border: none; border-top: 1px solid var(--color-border); margin: 2rem 0; }
    .preview-body :global(a) { color: var(--color-primary); text-decoration: underline; }
    .preview-body :global(img) { max-width: 100%; border-radius: 6px; }
    .preview-body :global(table) { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    .preview-body :global(th), .preview-body :global(td) {
      border: 1px solid var(--color-border);
      padding: 0.5rem 0.75rem;
      text-align: left;
    }
    .preview-body :global(th) { background: var(--color-muted); font-weight: 600; }
  `],
  template: `
    <div class="flex flex-col h-full border-l border-border bg-background">
      <div class="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
        <span class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Preview</span>
        <div class="flex items-center gap-1">
          @for (size of sizes; track size.label) {
            <button
              (click)="activeSize.set(size.value)"
              [class.bg-muted]="activeSize() === size.value"
              [class.text-foreground]="activeSize() === size.value"
              class="px-2 py-1 rounded text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              {{ size.label }}
            </button>
          }
        </div>
      </div>

      <div class="flex-1 overflow-y-auto flex justify-center py-8 px-4 bg-muted/30">
        <div
          class="bg-background shadow-md rounded-sm"
          [style.width]="previewWidth()"
          [style.padding]="'3rem 4rem'"
          [style.min-height]="'100%'"
        >
          @if (editorStore.activeChapter()) {
            <h1 class="text-2xl font-bold font-serif text-foreground mb-6 pb-4 border-b border-border">
              {{ editorStore.activeChapter()?.title }}
            </h1>
          }
          <div
            class="preview-body text-foreground"
            style="font-size: 0.9375rem; line-height: 1.85;"
            [innerHTML]="safeHtml()"
          ></div>
          @if (!editorStore.activeChapter()) {
            <p class="text-muted-foreground text-sm">Select a chapter to preview.</p>
          }
        </div>
      </div>
    </div>
  `,
})
export class PreviewPaneComponent {
  readonly editorStore = inject(EditorStore);
  private readonly sanitizer = inject(DomSanitizer);

  readonly activeSize = signal<'A4' | '6x9' | 'full'>('6x9');

  readonly sizes = [
    { label: '6×9', value: '6x9' as const },
    { label: 'A4',  value: 'A4'  as const },
    { label: 'Full', value: 'full' as const },
  ];

  readonly previewWidth = computed(() => {
    const s = this.activeSize();
    if (s === '6x9') return '432px';
    if (s === 'A4') return '595px';
    return '100%';
  });

  readonly rawHtml = computed(() => {
    const ch = this.editorStore.activeChapter();
    if (!ch?.contentMarkdown) return '';
    return ch.contentMarkdown;
  });

  readonly safeHtml = computed<SafeHtml>(() => {
    return this.sanitizer.bypassSecurityTrustHtml(this.rawHtml());
  });
}
