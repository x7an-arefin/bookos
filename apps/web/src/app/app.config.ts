import {
  ApplicationConfig,
  provideExperimentalZonelessChangeDetection,
  Injector,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { appRoutes } from './app.routes';
import {
  WORKSPACE_REPOSITORY,
  BUILD_REPOSITORY,
  ASSET_REPOSITORY,
} from './core/tokens/repository.tokens';
import { ElectronWorkspaceRepository } from './core/repositories/electron-workspace.repository';
import { ElectronBuildRepository } from './core/repositories/electron-build.repository';
import { ElectronAssetRepository } from './core/repositories/electron-asset.repository';
import { CloudflareWorkspaceRepository } from './core/repositories/cloudflare-workspace.repository';
import { CloudflareBuildRepository } from './core/repositories/cloudflare-build.repository';
import { CloudflareAssetRepository } from './core/repositories/cloudflare-asset.repository';
import { ElectronService } from './core/services/electron.service';

export const appConfig: ApplicationConfig = {
  providers: [
    // ── Performance: Zoneless change detection ────────────────────────────────
    provideExperimentalZonelessChangeDetection(),

    // ── Routing ───────────────────────────────────────────────────────────────
    provideRouter(
      appRoutes,
      withComponentInputBinding(),   // Route params as @Input() signals
      withViewTransitions(),         // Smooth page transitions
    ),

    // ── HTTP (for Phase 4 Cloudflare integration) ─────────────────────────────
    provideHttpClient(withInterceptors([authInterceptor])),

    // ── DAL Implementations ────────────────────────────────────────────────────
    ElectronWorkspaceRepository,
    CloudflareWorkspaceRepository,
    ElectronBuildRepository,
    CloudflareBuildRepository,
    ElectronAssetRepository,
    CloudflareAssetRepository,

    // ── Data Access Layer: Dynamic Switch Factory ─────────────────────────────
    {
      provide: WORKSPACE_REPOSITORY,
      useFactory: (electron: ElectronService, injector: Injector) => {
        return electron.isElectron()
          ? injector.get(ElectronWorkspaceRepository)
          : injector.get(CloudflareWorkspaceRepository);
      },
      deps: [ElectronService, Injector],
    },
    {
      provide: BUILD_REPOSITORY,
      useFactory: (electron: ElectronService, injector: Injector) => {
        return electron.isElectron()
          ? injector.get(ElectronBuildRepository)
          : injector.get(CloudflareBuildRepository);
      },
      deps: [ElectronService, Injector],
    },
    {
      provide: ASSET_REPOSITORY,
      useFactory: (electron: ElectronService, injector: Injector) => {
        return electron.isElectron()
          ? injector.get(ElectronAssetRepository)
          : injector.get(CloudflareAssetRepository);
      },
      deps: [ElectronService, Injector],
    },
  ],
};

