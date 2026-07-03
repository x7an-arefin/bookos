import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkspaceStore } from '../../../store/workspace.store';
import { DrawerService } from '../../../shared/services/drawer.service';

@Component({
  selector: 'app-rename-book',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="p-6 space-y-6 max-w-lg mx-auto">
      <div>
        <h3 class="text-lg font-semibold text-foreground">Rename Book</h3>
        <p class="text-xs text-muted-foreground">Change the title of your book project.</p>
      </div>

      <div class="space-y-4">
        <div class="space-y-1.5">
          <label class="text-xs font-semibold uppercase tracking-widest text-muted-foreground" for="new-title">New Title</label>
          <input
            id="new-title"
            type="text"
            [(ngModel)]="newTitle"
            placeholder="New title name"
            class="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>

        @if (error()) {
          <div class="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
            {{ error() }}
          </div>
        }
      </div>

      <div class="flex items-center gap-3 pt-2 border-t border-border">
        <button
          (click)="save()"
          [disabled]="!newTitle().trim() || isLoading()"
          class="px-5 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          @if (isLoading()) {
            Saving...
          } @else {
            Save Changes
          }
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
export class RenameBookComponent implements OnInit {
  readonly drawer = inject(DrawerService);
  private readonly workspaceStore = inject(WorkspaceStore);

  readonly currentTitle = input<string>('');

  newTitle = signal('');
  error = signal<string | null>(null);
  isLoading = signal(false);

  ngOnInit(): void {
    this.newTitle.set(this.currentTitle());
  }

  async save(): Promise<void> {
    const nextTitle = this.newTitle().trim();
    if (!nextTitle) {
      this.error.set('Title cannot be empty');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    try {
      this.workspaceStore.updateMeta({ title: nextTitle });
      await this.workspaceStore.saveProject();
      this.drawer.close();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to rename project');
    } finally {
      this.isLoading.set(false);
    }
  }
}
