import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthStore } from '../../store/auth.store';
import { ElectronService } from '../services/electron.service';

export const authGuard: CanActivateFn = async () => {
  const authStore = inject(AuthStore);
  const electron = inject(ElectronService);
  const router = inject(Router);

  if (electron.isElectron()) {
    return true;
  }

  // If not authenticated, try to restore session first (e.g. on page refresh)
  if (!authStore.isAuthenticated()) {
    await authStore.restoreSession();
  }

  if (authStore.isAuthenticated()) {
    return true;
  }

  router.navigate(['/auth/login']);
  return false;
};
