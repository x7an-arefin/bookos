import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkspaceStore } from '../../../store/workspace.store';
import { DrawerService } from '../../../shared/services/drawer.service';

/**
 * CreateBookFormComponent — new book creation form.
 *
 * Opens inside the full-screen left drawer (DrawerService).
 * On submit → creates a new BookProject via WorkspaceStore, then closes.
 *
 * Drawer Rule: This component is ONLY ever opened via DrawerService.open().
 */
@Component({
  selector: 'app-create-book-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="p-8 max-w-2xl mx-auto">

      <div class="mb-8">
        <h2 class="text-2xl font-semibold font-serif text-foreground mb-1">Create a New Book</h2>
        <p class="text-sm text-muted-foreground">Fill in the details below to start your new book project.</p>
      </div>

      <!-- Form -->
      <div class="space-y-6">

        <!-- Title -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground" for="book-title">
            Book Title <span class="text-destructive">*</span>
          </label>
          <input
            id="book-title"
            type="text"
            [(ngModel)]="title"
            placeholder="The Great Novel"
            class="w-full px-3 py-2 rounded-md bg-input border border-border
                   text-foreground text-sm placeholder:text-muted-foreground
                   focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring
                   transition-colors"
          />
        </div>

        <!-- Subtitle -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground" for="book-subtitle">Subtitle</label>
          <input
            id="book-subtitle"
            type="text"
            [(ngModel)]="subtitle"
            placeholder="Optional subtitle"
            class="w-full px-3 py-2 rounded-md bg-input border border-border
                   text-foreground text-sm placeholder:text-muted-foreground
                   focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring
                   transition-colors"
          />
        </div>

        <!-- Author -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground" for="book-author">Author Name</label>
          <input
            id="book-author"
            type="text"
            [(ngModel)]="author"
            placeholder="Your name"
            class="w-full px-3 py-2 rounded-md bg-input border border-border
                   text-foreground text-sm placeholder:text-muted-foreground
                   focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring
                   transition-colors"
          />
        </div>

        <!-- Genre -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground" for="book-genre">Genre</label>
          <select
            id="book-genre"
            [(ngModel)]="genre"
            class="w-full px-3 py-2 rounded-md bg-input border border-border
                   text-foreground text-sm
                   focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring
                   transition-colors"
          >
            <option value="">Select genre…</option>
            <option value="Fiction">Fiction</option>
            <option value="Non-Fiction">Non-Fiction</option>
            <option value="Fantasy">Fantasy</option>
            <option value="Science Fiction">Science Fiction</option>
            <option value="Mystery">Mystery</option>
            <option value="Thriller">Thriller</option>
            <option value="Romance">Romance</option>
            <option value="Biography">Biography</option>
            <option value="Self-Help">Self-Help</option>
            <option value="Technical">Technical</option>
            <option value="Academic">Academic</option>
            <option value="Poetry">Poetry</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <!-- Language -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground" for="book-language">Language</label>
          <select
            id="book-language"
            [(ngModel)]="language"
            class="w-full px-3 py-2 rounded-md bg-input border border-border
                   text-foreground text-sm
                   focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring
                   transition-colors"
          >
            <option value="en">English</option>
            <option value="ar">Arabic</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="es">Spanish</option>
            <option value="zh">Chinese</option>
            <option value="ja">Japanese</option>
            <option value="bn">Bengali</option>
          </select>
        </div>

        <!-- Error -->
        @if (error()) {
          <div class="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
            {{ error() }}
          </div>
        }

        <!-- Actions -->
        <div class="flex items-center gap-3 pt-4 border-t border-border">
          <button
            (click)="submit()"
            [disabled]="!title().trim() || isSubmitting()"
            class="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground
                   rounded-md text-sm font-medium hover:bg-primary/90
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors"
          >
            @if (isSubmitting()) {
              <div class="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground
                          rounded-full animate-spin"></div>
            }
            Create Book
          </button>
          <button
            (click)="drawer.close()"
            class="px-5 py-2.5 rounded-md text-sm font-medium text-muted-foreground
                   hover:bg-muted hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  `,
})
export class CreateBookFormComponent {
  readonly drawer = inject(DrawerService);
  private readonly workspaceStore = inject(WorkspaceStore);

  title = signal('');
  subtitle = signal('');
  author = signal('');
  genre = signal('');
  language = signal('en');
  error = signal<string | null>(null);
  isSubmitting = signal(false);

  async submit(): Promise<void> {
    const titleVal = this.title().trim();
    if (!titleVal) {
      this.error.set('Title is required.');
      return;
    }

    this.isSubmitting.set(true);
    this.error.set(null);

    try {
      // In Phase 4 this will call workspaceStore.createProject(...)
      // For now: open folder picker so user selects where to save the new book
      await this.workspaceStore.openProject();
      this.drawer.close();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to create book');
      this.isSubmitting.set(false);
    }
  }
}
