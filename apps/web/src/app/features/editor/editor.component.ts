import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { EditorStore } from './editor.store';
import { WorkspaceStore } from '../../store/workspace.store';
import { TiptapEditorComponent } from './tiptap-editor.component';
import { ChapterSidebarComponent } from './chapter-sidebar.component';
import { PreviewPaneComponent } from './preview-pane.component';
import { DrawerService } from '../../shared/services/drawer.service';
import { VersionHistoryComponent } from './drawers/version-history.component';
import { CollaboratorsComponent } from './drawers/collaborators.component';
import { ElectronService } from '../../core/services/electron.service';

@Component({
  selector: 'app-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TiptapEditorComponent, ChapterSidebarComponent, PreviewPaneComponent],
  template: `
    @if (!workspaceStore.hasOpenProject()) {
      <div class="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <div class="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <svg class="w-8 h-8 text-muted-foreground" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
          </svg>
        </div>
        <div>
          <h3 class="text-lg font-semibold text-foreground mb-1">No project open</h3>
          <p class="text-sm text-muted-foreground">Go back to the dashboard to open a book project.</p>
        </div>
        <button
          (click)="goToDashboard()"
          class="mt-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium
                 hover:bg-primary/90 transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    } @else {
      <div class="flex h-full overflow-hidden">

        <app-chapter-sidebar class="shrink-0" />

        <div class="flex-1 flex flex-col overflow-hidden min-w-0">

          <div class="flex items-center gap-2 px-4 py-2 border-b border-border shrink-0 bg-background">

            @if (editorStore.activeChapter()) {
              <span class="text-sm font-medium text-foreground truncate flex-1">
                {{ editorStore.activeChapter()?.title }}
              </span>
            } @else {
              <span class="text-sm text-muted-foreground flex-1">Select a chapter</span>
            }

            <div class="flex items-center gap-1 ml-auto shrink-0">

              <button
                (click)="editorStore.togglePreview()"
                [class.bg-muted]="editorStore.previewVisible()"
                [class.text-foreground]="editorStore.previewVisible()"
                class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground
                       hover:bg-muted hover:text-foreground transition-colors"
                title="Toggle preview"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                Preview
              </button>

              <button
                (click)="editorStore.toggleFocusMode()"
                [class.bg-muted]="editorStore.focusMode()"
                [class.text-foreground]="editorStore.focusMode()"
                class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground
                       hover:bg-muted hover:text-foreground transition-colors"
                title="Focus mode"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M8 21H5a2 2 0 0 0-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/>
                </svg>
                Focus
              </button>

              <button
                (click)="openVersionHistory()"
                class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground
                       hover:bg-muted hover:text-foreground transition-colors"
                title="Version history"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                History
              </button>

              @if (!electron.isElectron()) {
                <button
                  (click)="openCollaborators()"
                  class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground
                         hover:bg-muted hover:text-foreground transition-colors"
                  title="Collaborators"
                >
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  Collaborators
                </button>

                <button
                  (click)="toggleCollaboration()"
                  [class]="editorStore.isCollabActive() ? 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors bg-emerald-500/10 text-emerald-500' : 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors text-muted-foreground hover:bg-muted hover:text-foreground'"
                  title="Toggle real-time collaboration session"
                >
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <circle cx="12" cy="12" r="4"/>
                  </svg>
                  Collaborate
                  @if (editorStore.isCollabActive()) {
                    <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-emerald-500 text-white animate-pulse">
                      Live ({{ editorStore.collabUsersCount() }})
                    </span>
                  }
                </button>
              }

              <button
                (click)="workspaceStore.saveProject()"
                [disabled]="!workspaceStore.isDirty()"
                class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs
                       bg-primary text-primary-foreground
                       hover:bg-primary/90 disabled:opacity-40 transition-colors"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
                Save
              </button>
            </div>
          </div>

          <div class="flex-1 flex overflow-hidden">
            @if (editorStore.activeChapter() !== null) {
              <app-tiptap-editor
                class="flex-1 overflow-hidden"
                [initialContent]="editorStore.activeChapter()?.contentMarkdown ?? ''"
                [focusMode]="editorStore.focusMode()"
                [yDoc]="editorStore.yDoc()"
                [yProvider]="editorStore.yProvider()"
                (contentChanged)="onContentChanged($event)"
              />
            } @else {
              <div class="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Select a chapter from the sidebar to start editing.
              </div>
            }

            @if (editorStore.previewVisible()) {
              <div class="w-[420px] shrink-0">
                <app-preview-pane />
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class EditorComponent implements OnInit {
  readonly editorStore = inject(EditorStore);
  readonly workspaceStore = inject(WorkspaceStore);
  readonly electron = inject(ElectronService);
  private readonly router = inject(Router);
  private readonly drawer = inject(DrawerService);

  ngOnInit(): void {
    if (this.workspaceStore.hasOpenProject()) {
      this.editorStore.activateFirstChapter();
    }
  }

  onContentChanged(html: string): void {
    this.editorStore.updateContent(html);
  }

  openVersionHistory(): void {
    this.drawer.open({
      title: 'Version History',
      component: VersionHistoryComponent,
      width: 'half',
    });
  }

  openCollaborators(): void {
    this.drawer.open({
      title: 'Collaborators',
      component: CollaboratorsComponent,
      width: 'half',
    });
  }

  toggleCollaboration(): void {
    const bookId = this.workspaceStore.project()?.id;
    if (!bookId) return;

    if (this.editorStore.isCollabActive()) {
      this.editorStore.stopCollaboration();
    } else {
      this.editorStore.startCollaboration(bookId);
    }
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
