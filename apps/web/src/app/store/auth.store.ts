import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { HttpClient } from '@angular/common/http';
import { ENVIRONMENT } from '../core/tokens/environment.token';
import { ElectronService } from '../core/services/electron.service';
import { IndexedDbService } from '../shared/services/indexed-db.service';

export type PlanTier = 'free' | 'author' | 'pro';

export interface AuthState {
  userId: string | null;
  email: string | null;
  displayName: string | null;
  plan: PlanTier;
  jwt: string | null;
  refreshTokenVal: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  userId: null,
  email: null,
  displayName: null,
  plan: 'free',
  jwt: null,
  refreshTokenVal: null,
  isLoading: false,
  error: null,
};

export const AuthStore = signalStore(
  { providedIn: 'root' },

  withState<AuthState>(initialState),

  withComputed(({ userId, plan, error, isLoading, jwt }) => ({
    isAuthenticated: computed(() => !!userId()),
    isPremium: computed(() => plan() !== 'free'),
    isProPlan: computed(() => plan() === 'pro'),
    isAuthorPlan: computed(() => plan() === 'author' || plan() === 'pro'),
    getJwt: computed(() => jwt()),
    getError: computed(() => error()),
    getIsLoading: computed(() => isLoading()),
  })),

  withMethods((store) => {
    const http = inject(HttpClient);
    const env = inject(ENVIRONMENT);
    const electron = inject(ElectronService);
    const db = inject(IndexedDbService);

    return {
      seedLocalUser(): void {
        patchState(store, {
          userId: 'local-user',
          email: null,
          displayName: 'Local Author',
          plan: 'free',
          jwt: null,
          refreshTokenVal: null,
          error: null,
        });
      },

      setAuthState(state: Partial<AuthState>): void {
        patchState(store, state);
      },

      async login(email: string, password: string): Promise<void> {
        patchState(store, { isLoading: true, error: null });

        if (electron.isElectron()) {
          // Short-circuit for Electron
          this.seedLocalUser();
          return;
        }

        try {
          const url = `${env.apiBaseUrl}/api/auth/login`;
          const res = await http.post<{ access_token: string; refresh_token: string; user: { id: string; email: string; plan: PlanTier } }>(url, { email, password }).toPromise();
          if (res) {
            patchState(store, {
              userId: res.user.id,
              email: res.user.email,
              displayName: res.user.email.split('@')[0],
              plan: res.user.plan,
              jwt: res.access_token,
              refreshTokenVal: res.refresh_token,
              isLoading: false,
            });
            // Store tokens in IndexedDB auth store
            await db.set('auth', 'tokens', { access_token: res.access_token, refresh_token: res.refresh_token });
          }
        } catch (err: any) {
          const errorMsg = err?.error?.error || 'Login failed. Please try again.';
          patchState(store, { error: errorMsg, isLoading: false });
          throw err;
        }
      },

      async register(email: string, password: string): Promise<void> {
        patchState(store, { isLoading: true, error: null });

        try {
          const url = `${env.apiBaseUrl}/api/auth/register`;
          const res = await http.post<{ access_token: string; refresh_token: string; user: { id: string; email: string; plan: PlanTier } }>(url, { email, password }).toPromise();
          if (res) {
            patchState(store, {
              userId: res.user.id,
              email: res.user.email,
              displayName: res.user.email.split('@')[0],
              plan: res.user.plan,
              jwt: res.access_token,
              refreshTokenVal: res.refresh_token,
              isLoading: false,
            });
            await db.set('auth', 'tokens', { access_token: res.access_token, refresh_token: res.refresh_token });
          }
        } catch (err: any) {
          const errorMsg = err?.error?.error || 'Registration failed. Please try again.';
          patchState(store, { error: errorMsg, isLoading: false });
          throw err;
        }
      },

      async logout(): Promise<void> {
        const jwt = store.jwt();
        patchState(store, initialState);

        if (!electron.isElectron() && jwt) {
          try {
            const url = `${env.apiBaseUrl}/api/auth/logout`;
            await http.post(url, {}, { headers: { Authorization: `Bearer ${jwt}` } }).toPromise();
          } catch (err) {
            console.error('Logout request failed on server:', err);
          }
        }
        await db.delete('auth', 'tokens');
      },

      async requestPasswordReset(email: string): Promise<void> {
        patchState(store, { isLoading: true, error: null });
        try {
          const url = `${env.apiBaseUrl}/api/auth/forgot-password`;
          await http.post(url, { email }).toPromise();
          patchState(store, { isLoading: false });
        } catch (err: any) {
          const errorMsg = err?.error?.error || 'Failed to request password reset.';
          patchState(store, { error: errorMsg, isLoading: false });
          throw err;
        }
      },

      async patchMe(body: { password?: string }): Promise<void> {
        patchState(store, { isLoading: true, error: null });
        try {
          const url = `${env.apiBaseUrl}/api/auth/me`;
          await http.patch(url, body).toPromise();
          patchState(store, { isLoading: false });
        } catch (err: any) {
          const errorMsg = err?.error?.error || 'Failed to update account information.';
          patchState(store, { error: errorMsg, isLoading: false });
          throw err;
        }
      },

      async restoreSession(): Promise<void> {
        if (electron.isElectron()) {
          this.seedLocalUser();
          return;
        }

        try {
          const tokens = await db.get<{ access_token: string; refresh_token: string }>('auth', 'tokens');
          if (!tokens) {
            return;
          }

          // Use the access token to fetch user profile
          const url = `${env.apiBaseUrl}/api/auth/me`;
          const res = await http.get<{ id: string; email: string; plan: PlanTier }>(url, {
            headers: { Authorization: `Bearer ${tokens.access_token}` }
          }).toPromise();

          if (res) {
            patchState(store, {
              userId: res.id,
              email: res.email,
              displayName: res.email.split('@')[0],
              plan: res.plan,
              jwt: tokens.access_token,
              refreshTokenVal: tokens.refresh_token,
            });
          }
        } catch (err) {
          // If 401 or network failure, we try to refresh the token
          console.warn('Failed to restore session, attempting refresh:', err);
          try {
            await this.refreshToken();
          } catch (refreshErr) {
            console.error('Session restore and refresh both failed:', refreshErr);
            await db.delete('auth', 'tokens');
          }
        }
      },

      async refreshToken(): Promise<string> {
        const tokens = await db.get<{ access_token: string; refresh_token: string }>('auth', 'tokens');
        if (!tokens || !tokens.refresh_token) {
          throw new Error('No refresh token available');
        }

        const url = `${env.apiBaseUrl}/api/auth/refresh`;
        const res = await http.post<{ access_token: string; refresh_token: string }>(url, {
          refresh_token: tokens.refresh_token,
        }).toPromise();

        if (res) {
          patchState(store, {
            jwt: res.access_token,
            refreshTokenVal: res.refresh_token,
          });
          await db.set('auth', 'tokens', { access_token: res.access_token, refresh_token: res.refresh_token });
          return res.access_token;
        }
        throw new Error('Refresh response empty');
      },
    };
  })
);
