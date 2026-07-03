import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  input,
  output,
  signal,
  inject,
} from '@angular/core';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { Doc } from 'yjs';
import { AuthStore } from '../../store/auth.store';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Typography from '@tiptap/extension-typography';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';

@Component({
  selector: 'app-tiptap-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: contents; }

    .tiptap-wrap :global(.ProseMirror) {
      outline: none;
      min-height: 100%;
      padding: 0;
      caret-color: var(--color-primary);
    }

    .tiptap-wrap :global(.ProseMirror p.is-editor-empty:first-child::before) {
      content: attr(data-placeholder);
      float: left;
      color: var(--color-muted-foreground);
      pointer-events: none;
      height: 0;
    }

    .tiptap-wrap :global(h1) { font-size: 1.875rem; font-weight: 700; font-family: var(--font-serif); margin: 1.5rem 0 0.75rem; line-height: 1.2; }
    .tiptap-wrap :global(h2) { font-size: 1.5rem; font-weight: 600; font-family: var(--font-serif); margin: 1.25rem 0 0.5rem; line-height: 1.25; }
    .tiptap-wrap :global(h3) { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.5rem; }
    .tiptap-wrap :global(p) { margin: 0 0 1rem; line-height: 1.8; }
    .tiptap-wrap :global(blockquote) {
      border-left: 3px solid var(--color-primary);
      padding: 0.25rem 0 0.25rem 1rem;
      margin: 1rem 0;
      color: var(--color-muted-foreground);
      font-style: italic;
    }
    .tiptap-wrap :global(code) {
      font-family: var(--font-mono);
      font-size: 0.875em;
      background: var(--color-muted);
      border-radius: 3px;
      padding: 0.1em 0.35em;
    }
    .tiptap-wrap :global(pre) {
      background: var(--color-muted);
      border-radius: 6px;
      padding: 1rem 1.25rem;
      overflow-x: auto;
      margin: 1rem 0;
    }
    .tiptap-wrap :global(pre code) { background: none; padding: 0; }
    .tiptap-wrap :global(ul), .tiptap-wrap :global(ol) { padding-left: 1.5rem; margin: 0.5rem 0 1rem; }
    .tiptap-wrap :global(li) { margin-bottom: 0.25rem; line-height: 1.7; }
    .tiptap-wrap :global(hr) { border: none; border-top: 1px solid var(--color-border); margin: 2rem 0; }
    .tiptap-wrap :global(a) { color: var(--color-primary); text-decoration: underline; }
    .tiptap-wrap :global(img) { max-width: 100%; border-radius: 6px; margin: 0.5rem 0; }
    .tiptap-wrap :global(table) { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    .tiptap-wrap :global(th), .tiptap-wrap :global(td) {
      border: 1px solid var(--color-border);
      padding: 0.5rem 0.75rem;
      text-align: left;
    }
    .tiptap-wrap :global(th) { background: var(--color-muted); font-weight: 600; }
  `],
  template: `
    <div class="tiptap-wrap flex flex-col h-full">

      <!-- Toolbar -->
      @if (!focusMode()) {
        <div class="flex items-center gap-0.5 px-4 py-2 border-b border-border shrink-0
                    bg-background overflow-x-auto">

          @for (group of toolbarGroups; track group.label) {
            @if (!$first) {
              <div class="w-px h-4 bg-border mx-1 shrink-0"></div>
            }
            @for (btn of group.buttons; track btn.label) {
              <button
                type="button"
                [title]="btn.label"
                (click)="btn.action()"
                [class.bg-muted]="btn.isActive?.()"
                [class.text-foreground]="btn.isActive?.()"
                class="flex items-center justify-center w-7 h-7 rounded text-muted-foreground
                       hover:bg-muted hover:text-foreground transition-colors shrink-0"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path [attr.d]="btn.icon" />
                </svg>
              </button>
            }
          }

          <div class="ml-auto flex items-center gap-2 shrink-0 pl-2">
            <span class="text-xs text-muted-foreground font-mono tabular-nums">
              {{ wordCount() }} words
            </span>
          </div>
        </div>
      }

      <!-- Editor surface -->
      <div
        #editorEl
        class="flex-1 overflow-y-auto px-12 py-10 text-foreground"
        style="font-size: 1rem; line-height: 1.8;"
      ></div>
    </div>
  `,
})
export class TiptapEditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('editorEl') private editorEl!: ElementRef<HTMLDivElement>;

  readonly initialContent = input<string>('');
  readonly focusMode = input<boolean>(false);
  readonly yDoc = input<Doc | null>(null);
  readonly yProvider = input<any | null>(null);

  readonly contentChanged = output<string>();

  readonly wordCount = signal(0);

  private editor: Editor | null = null;
  private suppressEmit = false;
  private readonly authStore = inject(AuthStore);

  constructor() {
    effect(() => {
      const content = this.initialContent();
      // If we are in collaboration mode, Yjs handles the content syncing,
      // so we only setContent if we are not in collab mode.
      if (this.editor && !this.editor.isFocused && !this.yDoc()) {
        this.suppressEmit = true;
        this.editor.commands.setContent(content ?? '', false);
        this.suppressEmit = false;
      }
    });
  }

  ngAfterViewInit(): void {
    const extensions: any[] = [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: 'Start writing…' }),
      CharacterCount,
      Image,
      Link.configure({ openOnClick: false }),
      Typography,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ];

    const doc = this.yDoc();
    const provider = this.yProvider();

    if (doc) {
      extensions.push(
        Collaboration.configure({
          document: doc,
        })
      );

      if (provider) {
        const email = this.authStore.email() || 'Anonymous';
        const name = this.authStore.displayName() || email.split('@')[0];
        const color = '#' + Math.floor(Math.random() * 16777215).toString(16);

        extensions.push(
          CollaborationCursor.configure({
            provider,
            user: {
              name,
              color,
            },
          })
        );
      }
    }

    this.editor = new Editor({
      element: this.editorEl.nativeElement,
      extensions,
      content: doc ? undefined : (this.initialContent() ?? ''),
      onUpdate: ({ editor }) => {
        if (this.suppressEmit) return;
        this.wordCount.set(editor.storage['characterCount'].words());
        this.contentChanged.emit(editor.getHTML());
      },
      onFocus: () => {},
      onBlur: () => {},
    });

    this.wordCount.set(
      this.editor.storage['characterCount']?.words() ?? 0
    );
  }

  get toolbarGroups() {
    const e = this.editor;
    if (!e) return [];
    return [
      {
        label: 'history',
        buttons: [
          { label: 'Undo', icon: 'M9 14 4 9l5-5', action: () => e.chain().focus().undo().run(), isActive: undefined },
          { label: 'Redo', icon: 'M15 14l5-5-5-5', action: () => e.chain().focus().redo().run(), isActive: undefined },
        ],
      },
      {
        label: 'headings',
        buttons: [
          { label: 'H1', icon: 'M4 12h8M4 6v12M12 6v12M17 10h4M19 6v12', action: () => e.chain().focus().toggleHeading({ level: 1 }).run(), isActive: () => e.isActive('heading', { level: 1 }) },
          { label: 'H2', icon: 'M4 12h8M4 6v12M12 6v12M17 10h4M19 6v12', action: () => e.chain().focus().toggleHeading({ level: 2 }).run(), isActive: () => e.isActive('heading', { level: 2 }) },
          { label: 'H3', icon: 'M4 12h8M4 6v12M12 6v12M17 10h4M19 6v12', action: () => e.chain().focus().toggleHeading({ level: 3 }).run(), isActive: () => e.isActive('heading', { level: 3 }) },
        ],
      },
      {
        label: 'format',
        buttons: [
          { label: 'Bold', icon: 'M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z', action: () => e.chain().focus().toggleBold().run(), isActive: () => e.isActive('bold') },
          { label: 'Italic', icon: 'M19 4h-9M14 20H5M15 4 9 20', action: () => e.chain().focus().toggleItalic().run(), isActive: () => e.isActive('italic') },
          { label: 'Strike', icon: 'M16 4H9a3 3 0 0 0-2.83 4M14 12a4 4 0 0 1 0 8H6M4 12h16', action: () => e.chain().focus().toggleStrike().run(), isActive: () => e.isActive('strike') },
          { label: 'Code', icon: 'M16 18 22 12 16 6M8 6 2 12 8 18', action: () => e.chain().focus().toggleCode().run(), isActive: () => e.isActive('code') },
        ],
      },
      {
        label: 'blocks',
        buttons: [
          { label: 'Quote', icon: 'M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zM15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z', action: () => e.chain().focus().toggleBlockquote().run(), isActive: () => e.isActive('blockquote') },
          { label: 'Bullet List', icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', action: () => e.chain().focus().toggleBulletList().run(), isActive: () => e.isActive('bulletList') },
          { label: 'Ordered List', icon: 'M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1', action: () => e.chain().focus().toggleOrderedList().run(), isActive: () => e.isActive('orderedList') },
          { label: 'Code Block', icon: 'M10 20 4 12l6-8M14 4l6 8-6 8M14 12h.01', action: () => e.chain().focus().toggleCodeBlock().run(), isActive: () => e.isActive('codeBlock') },
          { label: 'Divider', icon: 'M3 12h18', action: () => e.chain().focus().setHorizontalRule().run(), isActive: undefined },
        ],
      },
    ];
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
    this.editor = null;
  }
}
