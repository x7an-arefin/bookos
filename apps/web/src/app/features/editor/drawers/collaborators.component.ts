import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DrawerService } from '../../../shared/services/drawer.service';
import { WorkspaceStore } from '../../../store/workspace.store';
import { ENVIRONMENT } from '../../../core/tokens/environment.token';

interface CollabSession {
  id: string;
  invitedEmail: string;
  permission: 'editor' | 'reviewer' | 'viewer';
  acceptedAt: number | null;
  expiresAt: number;
  createdAt: number;
}

@Component({
  selector: 'app-collaborators',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, FormsModule, ReactiveFormsModule],
  template: `
    <div class="h-full flex flex-col bg-background text-foreground">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
        <div>
          <h3 class="text-lg font-bold font-serif text-foreground">Collaborators</h3>
          <p class="text-xs text-muted-foreground">Manage who can write, edit, review, or view this book project.</p>
        </div>
        <button (click)="drawer.close()" class="text-muted-foreground hover:text-foreground">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Main Content Scroll Area -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6">
        
        <!-- Invite Form -->
        <div class="bg-card/40 border border-border/80 rounded-xl p-5 shadow-sm space-y-4">
          <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Invite Collaborator</h4>
          
          @if (inviteSuccess()) {
            <p class="text-xs text-emerald-500 font-medium">Invitation successfully sent!</p>
          }
          @if (inviteError()) {
            <p class="text-xs text-destructive font-medium">{{ inviteError() }}</p>
          }

          <form [formGroup]="inviteForm" (ngSubmit)="onSendInvite()" class="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div class="md:col-span-1.5">
              <label class="block text-[10px] font-semibold text-muted-foreground mb-1">Email Address</label>
              <input type="email" formControlName="email" placeholder="collaborator@domain.com" class="w-full bg-muted/60 border border-border/80 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-primary transition-all" />
            </div>
            <div>
              <label class="block text-[10px] font-semibold text-muted-foreground mb-1">Permission Role</label>
              <select formControlName="permission" class="w-full bg-muted border border-border/80 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-primary">
                <option value="editor">Editor (Can write)</option>
                <option value="reviewer">Reviewer (Can comment)</option>
                <option value="viewer">Viewer (Read-only)</option>
              </select>
            </div>
            <button type="submit" [disabled]="inviteForm.invalid || isSending()" class="w-full py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50 transition-colors">
              @if (isSending()) { Sending... } @else { Send Invite }
            </button>
          </form>
        </div>

        <!-- Active Collaborators -->
        <div class="space-y-3">
          <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Collaborators</h4>
          <div class="space-y-2">
            <!-- Owner row -->
            <div class="flex items-center justify-between p-3.5 bg-muted/20 border border-border/60 rounded-xl">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                  OW
                </div>
                <div>
                  <p class="text-xs font-semibold text-foreground">Project Owner</p>
                  <p class="text-[10px] text-muted-foreground">Authoritative creator</p>
                </div>
              </div>
              <span class="text-[9px] font-semibold uppercase px-2 py-0.5 rounded bg-primary/15 text-primary">Owner</span>
            </div>

            <!-- Mapped active list -->
            @for (collab of activeCollabs(); track collab.id) {
              <div class="flex items-center justify-between p-3.5 bg-card border border-border rounded-xl">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs uppercase text-muted-foreground">
                    {{ collab.invitedEmail.slice(0, 2) }}
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-foreground">{{ collab.invitedEmail }}</p>
                    <p class="text-[10px] text-muted-foreground">Accepted: {{ collab.acceptedAt | date:'shortDate' }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-[9px] font-semibold uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">{{ collab.permission }}</span>
                  <button (click)="onRevokeAccess(collab.id)" class="text-[10px] text-destructive hover:underline font-semibold">Remove</button>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Pending Invitations -->
        @if (pendingCollabs().length > 0) {
          <div class="space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pending Invitations</h4>
            <div class="space-y-2">
              @for (invite of pendingCollabs(); track invite.id) {
                <div class="flex items-center justify-between p-3.5 bg-card border border-border/80 rounded-xl">
                  <div>
                    <p class="text-xs font-semibold text-foreground">{{ invite.invitedEmail }}</p>
                    <p class="text-[10px] text-muted-foreground">Expires: {{ invite.expiresAt | date:'mediumDate' }}</p>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-[9px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-500">Pending</span>
                    <button (click)="onRevokeAccess(invite.id)" class="text-[10px] text-destructive hover:underline font-semibold">Cancel</button>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Share Book Link Section -->
        <div class="bg-card/40 border border-border/80 rounded-xl p-5 shadow-sm space-y-3">
          <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Share Public Preview</h4>
          <p class="text-[10px] text-muted-foreground">Copy this reader link to share draft versions with beta readers.</p>
          <div class="flex items-center gap-2">
            <input type="text" readonly [value]="getShareLink()" class="flex-1 bg-muted border border-border/80 rounded-lg py-1.5 px-3 text-xs focus:outline-none" />
            <button (click)="onCopyLink()" class="px-3.5 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg shadow-sm hover:bg-primary/95 transition-colors">
              {{ copyText() }}
            </button>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    :host { height: 100%; display: block; }
  `],
})
export class CollaboratorsComponent implements OnInit {
  readonly drawer = inject(DrawerService);
  readonly workspaceStore = inject(WorkspaceStore);
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT);
  private readonly fb = inject(FormBuilder);

  readonly allCollabs = signal<CollabSession[]>([]);
  readonly activeCollabs = signal<CollabSession[]>([]);
  readonly pendingCollabs = signal<CollabSession[]>([]);

  readonly isSending = signal(false);
  readonly inviteSuccess = signal(false);
  readonly inviteError = signal<string | null>(null);
  readonly copyText = signal('Copy');

  readonly inviteForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    permission: ['reviewer', [Validators.required]],
  });

  ngOnInit() {
    this.loadCollaborators();
  }

  async loadCollaborators() {
    const bookId = this.workspaceStore.project()?.id;
    if (!bookId) return;

    try {
      const url = `${this.env.apiBaseUrl}/api/books/${bookId}/collab`;
      const res = await this.http.get<CollabSession[]>(url).toPromise();
      if (res) {
        this.allCollabs.set(res);
        this.activeCollabs.set(res.filter((c) => c.acceptedAt !== null));
        this.pendingCollabs.set(res.filter((c) => c.acceptedAt === null));
      }
    } catch (err) {
      console.error('Failed to load collaborators:', err);
    }
  }

  async onSendInvite() {
    if (this.inviteForm.invalid) return;
    this.isSending.set(true);
    this.inviteSuccess.set(false);
    this.inviteError.set(null);

    const bookId = this.workspaceStore.project()?.id;
    if (!bookId) return;

    const { email, permission } = this.inviteForm.value;

    try {
      const url = `${this.env.apiBaseUrl}/api/books/${bookId}/collab/invite`;
      await this.http.post(url, { email, permission }).toPromise();
      this.inviteSuccess.set(true);
      this.inviteForm.reset({ email: '', permission: 'reviewer' });
      await this.loadCollaborators();
    } catch (err: any) {
      this.inviteError.set(err?.error?.error || 'Failed to send invite.');
    } finally {
      this.isSending.set(false);
    }
  }

  async onRevokeAccess(sessionId: string) {
    const bookId = this.workspaceStore.project()?.id;
    if (!bookId) return;

    if (confirm('Are you sure you want to revoke this collaborator access?')) {
      try {
        const url = `${this.env.apiBaseUrl}/api/books/${bookId}/collab/${sessionId}`;
        await this.http.delete(url).toPromise();
        await this.loadCollaborators();
      } catch (err) {
        console.error('Failed to revoke access:', err);
      }
    }
  }

  getShareLink(): string {
    const bookId = this.workspaceStore.project()?.id;
    return `${window.location.origin}/shared/preview/${bookId}`;
  }

  onCopyLink() {
    navigator.clipboard.writeText(this.getShareLink());
    this.copyText.set('Copied!');
    setTimeout(() => this.copyText.set('Copy'), 2000);
  }
}
