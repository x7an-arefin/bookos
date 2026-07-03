import { Routes } from '@angular/router';
import { AppShellComponent } from './shared/ui/layout/app-shell.component';
import { authGuard } from './core/guards/auth.guard';

/**
 * appRoutes — root router configuration.
 *
 * Architecture:
 *   - AppShellComponent wraps all feature routes (provides sidebar + top bar)
 *   - Every feature is lazy-loaded via loadChildren for code splitting
 *   - Inter-module navigation → router links in sidebar
 *   - Intra-module navigation → DrawerService.open() (full-screen left drawer)
 */
export const appRoutes: Routes = [
  // ── Public Auth Routes ──
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },

  // ── Protected Application Shell ──
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      // ── Dashboard (home) ─────────────────────────────────────────────────
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then(
            (m) => m.dashboardRoutes
          ),
      },

      // ── Editor ───────────────────────────────────────────────────────────
      // :id = workspace folder path (URL-encoded)
      {
        path: 'editor/:id',
        loadChildren: () =>
          import('./features/editor/editor.routes').then(
            (m) => m.editorRoutes
          ),
      },
      {
        // Also match /editor with no id → fallback to editor stub
        path: 'editor',
        loadChildren: () =>
          import('./features/editor/editor.routes').then(
            (m) => m.editorRoutes
          ),
      },

      // ── Export ───────────────────────────────────────────────────────────
      {
        path: 'export/:id',
        loadChildren: () =>
          import('./features/export/export.routes').then(
            (m) => m.exportRoutes
          ),
      },
      {
        path: 'export',
        loadChildren: () =>
          import('./features/export/export.routes').then(
            (m) => m.exportRoutes
          ),
      },

      // ── Assets ───────────────────────────────────────────────────────────
      {
        path: 'assets/:id',
        loadChildren: () =>
          import('./features/assets/assets.routes').then(
            (m) => m.assetsRoutes
          ),
      },
      {
        path: 'assets',
        loadChildren: () =>
          import('./features/assets/assets.routes').then(
            (m) => m.assetsRoutes
          ),
      },

      // ── Import ───────────────────────────────────────────────────────────
      {
        path: 'import',
        loadChildren: () =>
          import('./features/import/import.routes').then(
            (m) => m.importRoutes
          ),
      },

      // ── Settings ─────────────────────────────────────────────────────────
      {
        path: 'settings',
        loadChildren: () =>
          import('./features/settings/settings.routes').then(
            (m) => m.settingsRoutes
          ),
      },

      // ── Default redirect ─────────────────────────────────────────────────
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // ── Public Shared Book View (Beta Readers) ──
  {
    path: 'shared/:token',
    loadComponent: () =>
      import('./features/shared/shared-book-view.component').then(
        (m) => m.SharedBookViewComponent
      ),
  },

  // Wildcard — redirect everything unknown to dashboard
  { path: '**', redirectTo: '/dashboard' },
];
