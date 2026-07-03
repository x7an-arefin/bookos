import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthStore } from '../../store/auth.store';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-muted/40 p-4">
      <div class="w-full max-w-md relative">
        <div class="absolute -top-12 -left-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-12 -right-12 w-48 h-48 bg-secondary/15 rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative bg-card/60 backdrop-blur-md border border-border/80 rounded-2xl shadow-xl p-8">
          <!-- Logo & Brand Header -->
          <div class="flex flex-col items-center mb-8">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-primary/80 flex items-center justify-center shadow-md mb-3">
              <svg class="w-6 h-6 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
                <path d="M6 6h10"/>
                <path d="M6 10h10"/>
              </svg>
            </div>
            <h2 class="text-2xl font-bold font-serif tracking-tight text-foreground">Reset Password</h2>
            <p class="text-xs text-muted-foreground mt-1">We'll send you instructions to reset your password</p>
          </div>

          @if (isSubmitted()) {
            <div class="text-center py-4 space-y-4">
              <div class="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m22 2-7 20-4-9-9-4Z"/>
                  <path d="M22 2 11 13"/>
                </svg>
              </div>
              <div class="space-y-1">
                <h3 class="text-sm font-semibold text-foreground">Check your inbox</h3>
                <p class="text-xs text-muted-foreground">If an account exists for that email, we've sent instructions to reset the password.</p>
              </div>
              <div class="pt-4">
                <a routerLink="/auth/login" class="text-xs font-semibold text-primary hover:underline">Back to Sign In</a>
              </div>
            </div>
          } @else {
            @if (authStore.getError()) {
              <div class="mb-6 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2.5 text-xs text-destructive">
                <svg class="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{{ authStore.getError() }}</span>
              </div>
            }

            <form [formGroup]="resetForm" (ngSubmit)="onSubmit()" class="space-y-5">
              <div>
                <label for="email" class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Email Address</label>
                <div class="relative">
                  <input
                    id="email"
                    type="email"
                    formControlName="email"
                    class="w-full bg-muted/60 border border-border/80 rounded-lg py-2.5 px-3.5 text-sm focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/20 transition-all"
                    placeholder="name@domain.com"
                    autocomplete="email"
                  />
                </div>
              </div>

              <button
                type="submit"
                [disabled]="resetForm.invalid || authStore.getIsLoading()"
                class="w-full relative flex items-center justify-center bg-primary hover:bg-primary/95 text-primary-foreground font-medium py-2.5 px-4 rounded-lg shadow-sm focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                @if (authStore.getIsLoading()) {
                  <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-foreground" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Sending Instructions...
                } @else {
                  Send Reset Link
                }
              </button>
            </form>

            <div class="mt-8 text-center text-xs text-muted-foreground">
              Remembered your password?
              <a routerLink="/auth/login" class="text-primary hover:underline font-semibold ml-1">Sign In</a>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  readonly authStore = inject(AuthStore);
  readonly isSubmitted = signal(false);

  readonly resetForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async onSubmit() {
    if (this.resetForm.invalid) return;
    const { email } = this.resetForm.value;
    try {
      await this.authStore.requestPasswordReset(email!);
      this.isSubmitted.set(true);
    } catch (err) {
      // Error handled by store
    }
  }
}
