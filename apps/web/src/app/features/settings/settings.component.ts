import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthStore } from '../../store/auth.store';
import { ThemeService } from '../../core/services/theme.service';
import { ElectronService } from '../../core/services/electron.service';
import { SettingsStore } from './settings.store';

@Component({
  selector: 'app-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DatePipe],
  template: `
    <div class="h-full flex flex-col bg-background">
      <!-- Header -->
      <div class="px-8 pt-8 pb-6 border-b border-border shrink-0">
        <h1 class="text-2xl font-bold font-serif text-foreground">Settings</h1>
        <p class="text-xs text-muted-foreground mt-1">Manage your account, preferences, cloud sync and security settings.</p>
      </div>

      <!-- Scrollable Settings Sections -->
      <div class="flex-1 overflow-y-auto px-8 py-8 max-w-4xl w-full space-y-6">
        
        <!-- SECTION 1: Account Settings -->
        <div class="bg-card/40 border border-border/80 rounded-xl overflow-hidden shadow-sm">
          <button (click)="toggleSection('account')" class="w-full flex items-center justify-between p-5 text-left border-b border-border/60 hover:bg-muted/30 transition-colors">
            <div>
              <h3 class="text-sm font-bold text-foreground">Account Profile</h3>
              <p class="text-[11px] text-muted-foreground">Manage your identity, email, and subscription level.</p>
            </div>
            <svg class="w-4 h-4 text-muted-foreground transition-transform" [class.rotate-180]="sections.account()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>
          
          @if (sections.account()) {
            <div class="p-6 space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Email Address</label>
                  <input type="text" readonly [value]="authStore.email() || 'Local Client Mode (No Email)'" class="w-full bg-muted border border-border/80 rounded-lg py-2 px-3 text-sm text-foreground/80 focus:outline-none" />
                </div>
                <div>
                  <label class="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Account Tier</label>
                  <div class="flex items-center gap-2">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize bg-primary/10 text-primary border border-primary/20">
                      {{ authStore.plan() }}
                    </span>
                    @if (authStore.plan() === 'free' && !electron.isElectron()) {
                      <button class="text-xs text-primary hover:underline font-semibold">Upgrade to Premium</button>
                    }
                  </div>
                </div>
              </div>
              
              <div class="pt-4 border-t border-border/40 flex justify-between items-center">
                <div>
                  <h4 class="text-xs font-semibold text-foreground">Sign Out</h4>
                  <p class="text-[10px] text-muted-foreground">Safely log out of your current session on this device.</p>
                </div>
                <button (click)="onSignOut()" class="px-3.5 py-1.5 bg-destructive hover:bg-destructive/95 text-destructive-foreground text-xs font-semibold rounded-lg transition-colors">
                  Sign Out
                </button>
              </div>
            </div>
          }
        </div>

        <!-- SECTION 2: Cloud Sync Configuration -->
        @if (!electron.isElectron()) {
          <div class="bg-card/40 border border-border/80 rounded-xl overflow-hidden shadow-sm">
            <button (click)="toggleSection('sync')" class="w-full flex items-center justify-between p-5 text-left border-b border-border/60 hover:bg-muted/30 transition-colors">
              <div>
                <h3 class="text-sm font-bold text-foreground">Cloud Sync & Backup</h3>
                <p class="text-[11px] text-muted-foreground">Configure bidirectional backups and offline cache recovery.</p>
              </div>
              <svg class="w-4 h-4 text-muted-foreground transition-transform" [class.rotate-180]="sections.sync()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>
            
            @if (sections.sync()) {
              <div class="p-6 space-y-6">
                <div class="flex items-center justify-between">
                  <div class="space-y-1">
                    <h4 class="text-xs font-semibold text-foreground flex items-center gap-2">
                      Sync Status:
                      <span class="inline-flex items-center gap-1 text-[11px] font-semibold" [class]="getSyncClass()">
                        <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {{ settingsStore.syncStatus() }}
                      </span>
                    </h4>
                    <p class="text-[10px] text-muted-foreground">
                      Last synchronized: 
                      @if (settingsStore.lastSyncedAt()) {
                        {{ settingsStore.lastSyncedAt() | date:'mediumTime' }}
                      } @else {
                        Never (session offline)
                      }
                    </p>
                  </div>
                  <button (click)="settingsStore.syncNow()" class="px-4 py-1.5 bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5">
                    @if (settingsStore.syncStatus() === 'syncing') {
                      <svg class="animate-spin h-3.5 w-3.5 text-primary-foreground" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Syncing...
                    } @else {
                      Sync Now
                    }
                  </button>
                </div>

                <div class="pt-4 border-t border-border/40 flex justify-between items-center">
                  <div>
                    <h4 class="text-xs font-semibold text-foreground">Disconnect Sync</h4>
                    <p class="text-[10px] text-muted-foreground">Log out from cloud and return to offline browser mode.</p>
                  </div>
                  <button (click)="onDisconnectSync()" class="px-3 py-1.5 bg-muted border border-border/80 hover:bg-muted/80 text-foreground text-xs font-semibold rounded-lg transition-colors">
                    Disconnect
                  </button>
                </div>
              </div>
            }
          </div>
        }

        <!-- SECTION 3: Security & Session Management -->
        @if (!electron.isElectron()) {
          <div class="bg-card/40 border border-border/80 rounded-xl overflow-hidden shadow-sm">
            <button (click)="toggleSection('security')" class="w-full flex items-center justify-between p-5 text-left border-b border-border/60 hover:bg-muted/30 transition-colors">
              <div>
                <h3 class="text-sm font-bold text-foreground">Security & Sessions</h3>
                <p class="text-[11px] text-muted-foreground">Change your password and manage active browser sessions.</p>
              </div>
              <svg class="w-4 h-4 text-muted-foreground transition-transform" [class.rotate-180]="sections.security()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>
            
            @if (sections.security()) {
              <div class="p-6 space-y-6">
                <!-- Change Password Form -->
                <form [formGroup]="passwordForm" (ngSubmit)="onChangePassword()" class="space-y-4 max-w-md">
                  <h4 class="text-xs font-bold text-foreground uppercase tracking-wide">Change Password</h4>
                  
                  @if (passwordSuccess()) {
                    <p class="text-xs text-emerald-500 font-medium">Password successfully updated!</p>
                  }
                  @if (passwordError()) {
                    <p class="text-xs text-destructive font-medium">{{ passwordError() }}</p>
                  }

                  <div>
                    <label class="block text-[10px] font-semibold text-muted-foreground mb-1">New Password</label>
                    <input type="password" formControlName="newPassword" class="w-full bg-muted/60 border border-border/80 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:border-primary/80 transition-all" />
                  </div>
                  <div>
                    <label class="block text-[10px] font-semibold text-muted-foreground mb-1">Confirm New Password</label>
                    <input type="password" formControlName="confirmPassword" class="w-full bg-muted/60 border border-border/80 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:border-primary/80 transition-all" />
                    @if (passwordForm.errors?.['mismatch'] && passwordForm.get('confirmPassword')?.touched) {
                      <p class="text-[10px] text-destructive mt-1">Passwords do not match.</p>
                    }
                  </div>
                  <button type="submit" [disabled]="passwordForm.invalid" class="px-3.5 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors">
                    Update Password
                  </button>
                </form>

                <!-- Active Sessions -->
                <div class="pt-6 border-t border-border/40">
                  <h4 class="text-xs font-bold text-foreground uppercase tracking-wide mb-3">Active Device Sessions</h4>
                  @if (settingsStore.isLoadingSessions()) {
                    <p class="text-xs text-muted-foreground">Loading active sessions...</p>
                  } @else {
                    <div class="space-y-2">
                      @for (session of settingsStore.activeSessions(); track session.jti) {
                        <div class="flex items-center justify-between p-3 bg-muted/40 border border-border/50 rounded-lg">
                          <div>
                            <p class="text-xs font-semibold text-foreground">{{ session.deviceHint || 'Unknown Browser' }}</p>
                            <p class="text-[9px] text-muted-foreground">Created: {{ session.createdAt | date:'short' }}</p>
                          </div>
                          @if (session.jti !== authStore.jwt()?.split('.')?.[1]) {
                            <button (click)="settingsStore.revokeSession(session.jti)" class="text-[10px] text-destructive hover:underline font-semibold">
                              Revoke
                            </button>
                          } @else {
                            <span class="text-[9px] text-emerald-500 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">Current</span>
                          }
                        </div>
                      } @empty {
                        <p class="text-xs text-muted-foreground">No active sessions found.</p>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }

        <!-- SECTION 4: Appearance & Editor Settings -->
        <div class="bg-card/40 border border-border/80 rounded-xl overflow-hidden shadow-sm">
          <button (click)="toggleSection('appearance')" class="w-full flex items-center justify-between p-5 text-left border-b border-border/60 hover:bg-muted/30 transition-colors">
            <div>
              <h3 class="text-sm font-bold text-foreground">Appearance & Editor Preferences</h3>
              <p class="text-[11px] text-muted-foreground">Set dark/light themes, editor fonts, and daily writing targets.</p>
            </div>
            <svg class="w-4 h-4 text-muted-foreground transition-transform" [class.rotate-180]="sections.appearance()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>
          
          @if (sections.appearance()) {
            <div class="p-6 space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Theme Toggle -->
                <div class="flex flex-col gap-1.5">
                  <span class="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Color Mode</span>
                  <button (click)="toggleTheme()" class="w-fit flex items-center gap-2 px-4 py-2 border border-border bg-card hover:bg-muted/50 rounded-lg text-sm text-foreground transition-all">
                    @if (themeService.isDark()) {
                      <svg class="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>
                      Light Mode
                    } @else {
                      <svg class="w-4 h-4 text-indigo-500" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
                      Dark Mode
                    }
                  </button>
                </div>

                <!-- Daily writing goal -->
                <div>
                  <label for="wordGoal" class="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Daily Word Goal</label>
                  <input
                    id="wordGoal"
                    type="number"
                    [value]="dailyWordGoal()"
                    (change)="updateWordGoal($event)"
                    class="w-full max-w-[150px] bg-muted/60 border border-border/80 rounded-lg py-1.5 px-3 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <!-- Font size dropdown -->
                <div>
                  <label for="fontSize" class="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Editor Font Size</label>
                  <select
                    id="fontSize"
                    [value]="editorFontSize()"
                    (change)="updateFontSize($event)"
                    class="w-full max-w-[200px] bg-muted border border-border/80 rounded-lg py-1.5 px-3 text-sm text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="small">Small (12px)</option>
                    <option value="medium">Medium (14px)</option>
                    <option value="large">Large (16px)</option>
                  </select>
                </div>
              </div>
            </div>
          }
        </div>

      </div>
    </div>
  `,
})
export class SettingsComponent implements OnInit {
  readonly authStore = inject(AuthStore);
  readonly themeService = inject(ThemeService);
  readonly electron = inject(ElectronService);
  readonly settingsStore = inject(SettingsStore);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  // Accordion state
  readonly sections = {
    account: signal(true),
    sync: signal(false),
    security: signal(false),
    appearance: signal(false),
  };

  readonly dailyWordGoal = signal(500);
  readonly editorFontSize = signal('medium');
  readonly passwordSuccess = signal(false);
  readonly passwordError = signal<string | null>(null);

  readonly passwordForm = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(10), this.passwordStrengthValidator]],
    confirmPassword: ['', [Validators.required]],
  }, { validators: this.passwordMatchValidator });

  ngOnInit() {
    this.dailyWordGoal.set(Number(localStorage.getItem('bookos-word-goal') || '500'));
    this.editorFontSize.set(localStorage.getItem('bookos-font-size') || 'medium');
    this.settingsStore.loadSessions();
  }

  toggleSection(section: 'account' | 'sync' | 'security' | 'appearance') {
    this.sections[section].update((v) => !v);
  }

  toggleTheme() {
    this.themeService.toggle();
  }

  updateWordGoal(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    localStorage.setItem('bookos-word-goal', val);
    this.dailyWordGoal.set(Number(val));
  }

  updateFontSize(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    localStorage.setItem('bookos-font-size', val);
    this.editorFontSize.set(val);
  }

  passwordStrengthValidator(control: AbstractControl) {
    const value = control.value || '';
    const hasNumber = /\d/.test(value);
    return hasNumber ? null : { strength: true };
  }

  passwordMatchValidator(group: AbstractControl) {
    const password = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { mismatch: true };
  }

  async onChangePassword() {
    if (this.passwordForm.invalid) return;
    this.passwordSuccess.set(false);
    this.passwordError.set(null);
    try {
      await this.authStore.patchMe({ password: this.passwordForm.value.newPassword! });
      this.passwordSuccess.set(true);
      this.passwordForm.reset();
    } catch (err: any) {
      this.passwordError.set(err?.error?.error || 'Failed to update password');
    }
  }

  async onSignOut() {
    await this.authStore.logout();
    this.router.navigate(['/auth/login']);
  }

  async onDisconnectSync() {
    await this.authStore.logout();
    this.router.navigate(['/auth/login']);
  }

  getSyncClass() {
    switch (this.settingsStore.syncStatus()) {
      case 'synced':
        return 'text-emerald-500';
      case 'syncing':
        return 'text-amber-500 animate-pulse';
      case 'conflict':
        return 'text-destructive';
      case 'offline':
        return 'text-muted-foreground';
      default:
        return 'text-foreground/80';
    }
  }
}
