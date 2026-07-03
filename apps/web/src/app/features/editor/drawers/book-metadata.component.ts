import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkspaceStore } from '../../../../store/workspace.store';
import { DrawerService } from '../../../../shared/services/drawer.service';

@Component({
  selector: 'app-book-metadata',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="p-6 space-y-6 max-w-lg mx-auto">
      <div>
        <h3 class="text-lg font-semibold text-foreground">Book Metadata</h3>
        <p class="text-xs text-muted-foreground">Configure the metadata parameters for output documents.</p>
      </div>

      <div class="space-y-4">
        <div class="space-y-1.5">
          <label class="text-xs font-semibold uppercase tracking-widest text-muted-foreground" for="author">Author</label>
          <input
            id="author"
            type="text"
            [(ngModel)]="author"
            class="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-semibold uppercase tracking-widest text-muted-foreground" for="publisher">Publisher</label>
          <input
            id="publisher"
            type="text"
            [(ngModel)]="publisher"
            class="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-semibold uppercase tracking-widest text-muted-foreground" for="isbn">ISBN</label>
          <input
            id="isbn"
            type="text"
            [(ngModel)]="isbn"
            class="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-semibold uppercase tracking-widest text-muted-foreground" for="desc">Description</label>
          <textarea
            id="desc"
            [(ngModel)]="description"
            rows="3"
            class="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          ></textarea>
        </div>
      </div>

      <div class="flex items-center gap-3 pt-2 border-t border-border">
        <button
          (click)="save()"
          class="px-5 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Save Metadata
        </button>
        <button
          (click)="drawer.close()"
          class="px-5 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  `
})
export class BookMetadataComponent implements OnInit {
  readonly drawer = inject(DrawerService);
  private readonly workspaceStore = inject(WorkspaceStore);

  author = signal('');
  publisher = signal('');
  isbn = signal('');
  description = signal('');

  ngOnInit(): void {
    const meta = this.workspaceStore.project()?.meta;
    if (meta) {
      this.author.set(meta.author ?? '');
      this.publisher.set(meta.publisher ?? '');
      this.isbn.set(meta.isbn ?? '');
      this.description.set(meta.description ?? '');
    }
  }

  save(): void {
    this.workspaceStore.updateMeta({
      author: this.author(),
      publisher: this.publisher(),
      isbn: this.isbn(),
      description: this.description()
    });
    this.drawer.close();
  }
}
