import { InjectionToken } from '@angular/core';
import type { WorkspaceRepository } from '../repositories/workspace.repository';
import type { BuildRepository } from '../repositories/build.repository';
import type { AssetRepository } from '../repositories/asset.repository';

/**
 * DI tokens for the Data Access Layer.
 *
 * These tokens are the DAL/UI boundary seam.
 * In Electron mode → ElectronXxxRepository implementations (registered in app.config.ts)
 * In browser mode  → CloudflareXxxRepository implementations (Phase 4)
 *
 * NO component or store should ever import an implementation class directly.
 * Always inject via these tokens.
 */
export const WORKSPACE_REPOSITORY = new InjectionToken<WorkspaceRepository>(
  'WorkspaceRepository'
);

export const BUILD_REPOSITORY = new InjectionToken<BuildRepository>(
  'BuildRepository'
);

export const ASSET_REPOSITORY = new InjectionToken<AssetRepository>(
  'AssetRepository'
);
