import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthStore } from '../../store/auth.store';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-muted/40 p-4">
      <div class="w-full max-w-md relative">
        <!-- Background decorative ambient blur -->
        <div class="absolute -top-12 -left-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-12 -right-12 w-48 h-48 bg-secondary/15 rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative bg-card/60 backdrop-blur-md border border-border/80 rounded-2xl shadow-xl overflow-hidden p-8">
          <!-- Logo & Brand Header -->
          <div class="flex flex-col items-center mb-8">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-primary/80 flex items-center justify-center shadow-md mb-3">
              <svg class="w-6 h-6 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
                <path d="M6 6h10"/>
                <path d="M6 10h10"/>
              </svg>
            </div>
            <h2 class="text-2xl font-bold font-serif tracking-tight text-foreground">Sign In to BookOS</h2>
            <p class="text-xs text-muted-foreground mt-1">Access your books and start writing</p>
          </div>

          <!-- Alert for error messaging -->
          @if (authStore.getError()) {
            <div class="mb-6 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2.5 text-xs text-destructive">
              <svg class="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{{ authStore.getError() }}</span>
            </div>
          }

          <!-- Form -->
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-5">
            <!-- Email Field -->
            <div>
              <label for="email" class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Email Address</label>
              <div class="relative">
                <input
                  id="email"
                  type="email"
                  formControlName="email"
                  class="w-full bg-muted/60 border border-border/80 rounded-lg py-2.5 pl-3.5 pr-10 text-sm focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/20 transition-all"
                  placeholder="name@domain.com"
                  autocomplete="email"
                />
                @if (loginForm.get('email')?.touched && loginForm.get('email')?.invalid) {
                  <span class="absolute right-3 top-1/2 -translate-y-1/2 text-destructive">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  </span>
                }
              </div>
            </div>

            <!-- Password Field -->
            <div>
              <div class="flex justify-between items-center mb-1.5">
                <label for="password" class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</label>
                <a routerLink="/auth/reset-password" class="text-xs text-primary hover:underline font-medium">Forgot?</a>
              </div>
              <div class="relative">
                <input
                  id="password"
                  type="password"
                  formControlName="password"
                  class="w-full bg-muted/60 border border-border/80 rounded-lg py-2.5 pl-3.5 pr-10 text-sm focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/20 transition-all"
                  placeholder="••••••••••"
                  autocomplete="current-password"
                />
                @if (loginForm.get('password')?.touched && loginForm.get('password')?.invalid) {
                  <span class="absolute right-3 top-1/2 -translate-y-1/2 text-destructive">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  </span>
                }
              </div>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              [disabled]="loginForm.invalid || authStore.getIsLoading()"
              class="w-full relative flex items-center justify-center bg-primary hover:bg-primary/95 text-primary-foreground font-medium py-2.5 px-4 rounded-lg shadow-sm focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
            >
              @if (authStore.getIsLoading()) {
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-foreground" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Signing In...
              } @else {
                Sign In
              }
            </button>
          </form>

          <!-- Footer Switch Link -->
          <div class="mt-8 text-center text-xs text-muted-foreground">
            Don't have an account?
            <a routerLink="/auth/register" class="text-primary hover:underline font-semibold ml-1">Create free account</a>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  readonly authStore = inject(AuthStore);

  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(10)]],
  });

  async onSubmit() {
    if (this.loginForm.invalid) return;
    const { email, password } = this.loginForm.value;
    try {
      await this.authStore.login(email!, password!);
      this.router.navigate(['/dashboard']);
    } catch (err) {
      // Handled by signal store error field
    }
  }
}
