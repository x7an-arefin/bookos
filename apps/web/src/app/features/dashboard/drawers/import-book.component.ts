import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { WorkspaceStore } from '../../../store/workspace.store';
import { DrawerService } from '../../../shared/services/drawer.service';

@Component({
  selector: 'app-import-book',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6 space-y-6 max-w-lg mx-auto">
      <div>
        <h3 class="text-lg font-semibold text-foreground">Import Book</h3>
        <p class="text-xs text-muted-foreground">Import an existing ePub, Markdown file or Word Document.</p>
      </div>

      <div class="space-y-4">
        <div class="border-2 border-dashed border-border rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3">
          <div class="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
            <svg class="w-6 h-6 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-foreground">Choose a file to import</p>
            <p class="text-xs text-muted-foreground mt-1">Supports .epub, .md, .docx</p>
          </div>
          <button (click)="selectFile()" class="mt-2 px-4 py-2 bg-secondary border border-border text-foreground rounded-md text-sm font-medium hover:bg-secondary/80 transition-colors">
            Select File
          </button>
        </div>

        @if (selectedFileName()) {
          <div class="p-3 bg-muted rounded-md flex items-center justify-between text-sm">
            <span class="truncate font-medium">{{ selectedFileName() }}</span>
            <button (click)="clearSelection()" class="text-xs text-destructive hover:underline">Remove</button>
          </div>
        }

        @if (error()) {
          <div class="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
            {{ error() }}
          </div>
        }
      </div>

      <div class="flex items-center gap-3 pt-2 border-t border-border">
        <button
          (click)="import()"
          [disabled]="!selectedFileName() || isLoading()"
          class="px-5 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          @if (isLoading()) {
            Importing...
          } @else {
            Import
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
export class ImportBookComponent {
  readonly drawer = inject(DrawerService);
  private readonly workspaceStore = inject(WorkspaceStore);

  selectedFileName = signal<string | null>(null);
  error = signal<string | null>(null);
  isLoading = signal(false);

  selectFile(): void {
    this.selectedFileName.set('sample-manuscript.epub');
  }

  clearSelection(): void {
    this.selectedFileName.set(null);
  }

  async import(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.drawer.close();
    } catch (err) {
      this.error.set('Import failed. Please verify format.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
