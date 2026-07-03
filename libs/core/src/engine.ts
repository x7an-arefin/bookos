import path from 'path';
import { BuildOptions, BuildResult, ValidationReport } from './types/book.types.js';
import { validateWorkspace } from './validators/workspace-validator.js';
import { optimizeAllAssets } from './optimizers/image.optimizer.js';
import { renderPDF } from './renderers/pdf.renderer.js';
import { renderEPUB } from './renderers/epub.renderer.js';

export async function buildBook(options: BuildOptions): Promise<BuildResult> {
  const startTime = Date.now();
  const { project, target, outputDir, onProgress } = options;

  // 1. Validation Step (Weight: 5%)
  onProgress?.(0, 'Validating workspace and settings...');
  const firstAsset = project.assets.find(a => a.localPath);
  let workspaceDir = options.workspaceDir || outputDir;
  if (!options.workspaceDir && firstAsset && firstAsset.localPath) {
    const baseDir = path.dirname(outputDir);
    const absPath = path.isAbsolute(firstAsset.localPath) ? firstAsset.localPath : path.resolve(baseDir, firstAsset.localPath);
    const parts = absPath.replace(/\\/g, '/').split('/');
    const assetDirIndex = parts.findIndex(p => p === 'images' || p === 'fonts' || p === 'assets');
    if (assetDirIndex > -1) {
      workspaceDir = parts.slice(0, assetDirIndex).join('/');
    } else {
      workspaceDir = path.dirname(absPath);
    }
  }

  // Convert all asset localPaths to absolute paths relative to workspaceDir to ensure smooth compilation in renderers/optimizers
  for (const asset of project.assets) {
    if (asset.localPath && !path.isAbsolute(asset.localPath)) {
      asset.localPath = path.resolve(workspaceDir, asset.localPath).replace(/\\/g, '/');
    }
  }

  const validationReport = await validateWorkspace(project, workspaceDir);
  if (!validationReport.isValid) {
    onProgress?.(5, 'Workspace validation failed. Build aborted.');
    return {
      success: false,
      outputPath: '',
      format: target.toLowerCase().includes('epub') ? 'epub' : 'pdf',
      validation: validationReport,
      duration: Date.now() - startTime,
    };
  }
  onProgress?.(5, 'Workspace validation passed.');

  // 2. Asset Optimization Step (Weight: 20%)
  onProgress?.(5, 'Optimizing book assets and images...');
  const optimizedProject = await optimizeAllAssets(project, outputDir, (pct, msg) => {
    const normalizedPct = 5 + Math.round(pct * 0.20);
    onProgress?.(normalizedPct, msg);
  });
  onProgress?.(25, 'Asset optimization completed.');

  // 3. Format Dispatching & Rendering (Weight: 75% for Markdown process, compile and validation)
  const format = target.toLowerCase().includes('epub') ? 'epub' : 'pdf';
  let outputPath = '';
  let pageCount: number | undefined;
  
  // Merge validator results with renderer validation
  const finalReport: ValidationReport = { ...validationReport };

  if (format === 'pdf') {
    onProgress?.(25, 'Compiling and rendering PDF document...');
    const result = await renderPDF({
      project: optimizedProject,
      target,
      outputDir,
      onProgress: (pct, msg) => {
        const normalizedPct = 25 + Math.round(pct * 0.70);
        onProgress?.(normalizedPct, msg);
      }
    });
    outputPath = result.pdfPath;
    pageCount = result.pageCount;
  } else {
    onProgress?.(25, 'Packaging EPUB container...');
    const result = await renderEPUB({
      project: optimizedProject,
      target,
      outputDir,
      onProgress: (pct, msg) => {
        const normalizedPct = 25 + Math.round(pct * 0.70);
        onProgress?.(normalizedPct, msg);
      }
    });
    outputPath = result.epubPath;
    
    // Merge EPUBCheck errors/warnings
    if (result.report) {
      finalReport.errors.push(...result.report.errors);
      finalReport.warnings.push(...result.report.warnings);
      finalReport.info.push(...result.report.info);
      if (!result.report.isValid) {
        finalReport.isValid = false;
      }
    }
  }

  const duration = Date.now() - startTime;
  onProgress?.(100, `Book built successfully in ${duration}ms!`);

  return {
    success: finalReport.isValid,
    outputPath,
    format,
    pageCount,
    validation: finalReport,
    duration
  };
}
export type { BuildResult };
