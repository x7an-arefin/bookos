import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ENVIRONMENT } from '../../core/tokens/environment.token';

interface DbBook {
  id: string;
  title: string;
  author: string;
}

interface DbChapter {
  id: string;
  title: string;
  contentMarkdown: string;
  sortOrder: number;
}

interface DbComment {
  id: string;
  chapterId: string;
  parentId: string | null;
  authorId: string;
  authorEmail: string;
  text: string;
  rangeStart: number;
  rangeEnd: number;
  isResolved: number;
  createdAt: number;
}

@Component({
  selector: 'app-shared-book-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DatePipe],
  styles: [`
    :host { display: block; height: 100vh; width: 100vw; }
    
    .preview-body ::ng-deep h1 { font-size: 2rem; font-weight: 700; font-family: Georgia, serif; margin: 1.5rem 0 0.75rem; }
    .preview-body ::ng-deep h2 { font-size: 1.5rem; font-weight: 600; font-family: Georgia, serif; margin: 1.25rem 0 0.5rem; }
    .preview-body ::ng-deep p { margin: 0 0 1.25rem; line-height: 1.85; }
    .preview-body ::ng-deep blockquote {
      border-left: 3px solid var(--color-primary, #3b82f6);
      padding: 0.25rem 0 0.25rem 1rem;
      margin: 1rem 0;
      color: #6b7280;
      font-style: italic;
    }
  `],
  template: `
    <div class="h-screen w-screen flex flex-col bg-background text-foreground font-sans overflow-hidden">
      <!-- Top Header Bar -->
      <header class="h-14 px-6 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-md shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">B</div>
          <div>
            <h1 class="text-sm font-bold text-foreground line-clamp-1">{{ book()?.title || 'Shared Book Draft' }}</h1>
            <p class="text-[10px] text-muted-foreground">by {{ book()?.author || 'Author' }} • Beta Reader View</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <select 
            [ngModel]="activeChapter()?.id" 
            (ngModelChange)="onSelectChapter($event)"
            class="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
          >
            @for (ch of chapters(); track ch.id) {
              <option [value]="ch.id">{{ ch.title }}</option>
            }
          </select>
        </div>
      </header>

      <!-- Main View Split Panel -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Left Panel: Read-only Preview Content -->
        <div class="flex-1 overflow-y-auto flex justify-center py-10 px-6 bg-muted/20 relative" #previewContainer>
          <div 
            class="bg-card border border-border/60 shadow-lg rounded-xl p-8 max-w-2xl w-full min-h-[80vh] relative flex flex-col"
            (mouseup)="onTextSelected($event)"
          >
            @if (activeChapter()) {
              <h2 class="text-3xl font-bold font-serif text-foreground mb-6 pb-4 border-b border-border">
                {{ activeChapter()?.title }}
              </h2>
              
              <div 
                class="preview-body text-foreground leading-relaxed text-sm font-serif select-text flex-1"
                [innerHTML]="safeContent()"
              ></div>
            } @else {
              <div class="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                No chapter selected
              </div>
            }
            
            <!-- Floating Tooltip -->
            @if (showTooltip() && selectionCoords()) {
              <button
                (click)="openCommentModal()"
                [style.top.px]="selectionCoords()?.top"
                [style.left.px]="selectionCoords()?.left"
                class="absolute bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl hover:bg-primary/95 transition-transform flex items-center gap-1.5 z-50"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                Comment
              </button>
            }
          </div>
        </div>

        <!-- Right Panel: Comments Sidebar -->
        <div class="w-80 border-l border-border bg-card/30 backdrop-blur-md flex flex-col overflow-hidden shrink-0">
          <div class="p-4 border-b border-border/80 flex items-center justify-between shrink-0">
            <h3 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Comments</h3>
            <span class="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
              {{ comments().length }}
            </span>
          </div>

          <div class="flex-1 overflow-y-auto p-4 space-y-4">
            @for (c of comments(); track c.id) {
              <div class="border border-border/60 rounded-xl p-4 bg-card/60 shadow-sm flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-foreground">
                    {{ getCommenterName(c) }}
                  </span>
                  <span class="text-[9px] text-muted-foreground">
                    {{ c.createdAt | date:'short' }}
                  </span>
                </div>
                
                <p class="text-xs text-foreground leading-relaxed">
                  {{ getCommentText(c) }}
                </p>
              </div>
            } @empty {
              <div class="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground gap-2">
                <svg class="w-8 h-8 text-muted-foreground/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <p class="text-xs font-semibold">No comments yet</p>
                <p class="text-[10px] text-muted-foreground/80">Select text in the document or click the button below to leave feedback.</p>
              </div>
            }
          </div>

          <!-- Add Comment Button at bottom -->
          <div class="p-4 border-t border-border bg-card/50 shrink-0">
            <button
              (click)="openCommentModal()"
              class="w-full py-2 bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Add Comment
            </button>
          </div>
        </div>
      </div>

      <!-- Guest Comment Modal Dialog -->
      @if (isModalOpen()) {
        <div class="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div class="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl p-6 flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-bold text-foreground">Leave a Comment</h4>
              <button (click)="closeCommentModal()" class="text-muted-foreground hover:text-foreground">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            @if (selectedText()) {
              <div class="bg-muted/40 p-3 rounded-lg border-l-2 border-primary text-xs font-serif text-muted-foreground italic line-clamp-3">
                "{{ selectedText() }}"
              </div>
            }

            <div class="space-y-3">
              <div>
                <label class="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Your Name (Guest)</label>
                <input
                  type="text"
                  [(ngModel)]="guestName"
                  placeholder="e.g. John Doe"
                  class="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              
              <div>
                <label class="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Comment</label>
                <textarea
                  [(ngModel)]="commentBody"
                  placeholder="Write your feedback..."
                  rows="4"
                  class="w-full bg-background border border-border rounded-lg p-3 text-xs text-foreground focus:outline-none focus:border-primary resize-none"
                ></textarea>
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-2">
              <button
                (click)="closeCommentModal()"
                class="px-4 py-2 border border-border rounded-lg text-xs font-semibold hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                (click)="submitComment()"
                [disabled]="!guestName.trim() || !commentBody.trim()"
                class="px-4 py-2 bg-primary hover:bg-primary/95 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground rounded-lg text-xs font-semibold transition-colors"
              >
                Post Comment
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class SharedBookViewComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly env = inject(ENVIRONMENT);

  readonly book = signal<DbBook | null>(null);
  readonly chapters = signal<DbChapter[]>([]);
  readonly activeChapter = signal<DbChapter | null>(null);
  readonly comments = signal<DbComment[]>([]);

  // UI state
  readonly showTooltip = signal<boolean>(false);
  readonly selectionCoords = signal<{ top: number; left: number } | null>(null);
  readonly isModalOpen = signal<boolean>(false);

  // Form bindings
  guestName = '';
  commentBody = '';
  selectedText = signal<string>('');
  rangeStart = signal<number>(0);
  rangeEnd = signal<number>(0);

  token = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (this.token) {
      this.loadSharedBook();
    }
  }

  loadSharedBook(): void {
    const url = `${this.env.apiBaseUrl}/api/collab/accept/${this.token}`;
    this.http.get<{ book: DbBook; chapters: DbChapter[]; permission: string }>(url).subscribe({
      next: (res) => {
        this.book.set(res.book);
        this.chapters.set(res.chapters);
        if (res.chapters.length > 0) {
          this.onSelectChapter(res.chapters[0].id);
        }
      },
      error: (err) => {
        console.error('Failed to load shared book:', err);
      },
    });
  }

  onSelectChapter(chapterId: string): void {
    const ch = this.chapters().find((c) => c.id === chapterId);
    if (ch) {
      this.activeChapter.set(ch);
      this.showTooltip.set(false);
      this.selectionCoords.set(null);
      this.loadComments(ch.id);
    }
  }

  loadComments(chapterId: string): void {
    const url = `${this.env.apiBaseUrl}/api/books/${this.book()?.id}/chapters/${chapterId}/comments`;
    this.http.get<DbComment[]>(url).subscribe({
      next: (res) => {
        this.comments.set(res);
      },
      error: (err) => {
        console.error('Failed to load comments:', err);
      },
    });
  }

  safeContent = computed<SafeHtml>(() => {
    const markdown = this.activeChapter()?.contentMarkdown || '';
    return this.sanitizer.bypassSecurityTrustHtml(markdown);
  });

  onTextSelected(event: MouseEvent): void {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().trim()) {
      this.selectedText.set(selection.toString());
      
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      
      this.selectionCoords.set({
        top: rect.top - containerRect.top - 40,
        left: rect.left - containerRect.left + (rect.width / 2) - 40,
      });
      
      const preSelectionRange = range.cloneRange();
      preSelectionRange.selectNodeContents(event.currentTarget as HTMLElement);
      preSelectionRange.setEnd(range.startContainer, range.startOffset);
      
      this.rangeStart.set(preSelectionRange.toString().length);
      this.rangeEnd.set(this.rangeStart() + range.toString().length);
      this.showTooltip.set(true);
    } else {
      this.showTooltip.set(false);
      this.selectionCoords.set(null);
    }
  }

  openCommentModal(): void {
    this.isModalOpen.set(true);
  }

  closeCommentModal(): void {
    this.isModalOpen.set(false);
    this.commentBody = '';
    this.selectedText.set('');
    this.showTooltip.set(false);
    this.selectionCoords.set(null);
  }

  submitComment(): void {
    const ch = this.activeChapter();
    const bk = this.book();
    if (!ch || !bk) return;

    const url = `${this.env.apiBaseUrl}/api/books/${bk.id}/chapters/${ch.id}/comments`;
    const payload = {
      text: this.commentBody,
      rangeStart: this.rangeStart(),
      rangeEnd: this.rangeEnd(),
      guestName: this.guestName,
    };

    this.http.post<DbComment>(url, payload).subscribe({
      next: (comment) => {
        this.comments.update((list) => [...list, comment]);
        this.closeCommentModal();
      },
      error: (err) => {
        console.error('Failed to post comment:', err);
      },
    });
  }

  getCommenterName(comment: DbComment): string {
    const match = comment.text.match(/^\[Guest:\s*([^\]]+)\]\s*(.*)$/);
    return match ? match[1] : (comment.authorEmail || 'Guest');
  }

  getCommentText(comment: DbComment): string {
    const match = comment.text.match(/^\[Guest:\s*([^\]]+)\]\s*(.*)$/);
    return match ? match[2] : comment.text;
  }
}
