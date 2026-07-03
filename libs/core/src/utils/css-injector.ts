import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { BookProject } from '../types/book.types.js';

// Resolve directory name in ESM
const targetFilename = fileURLToPath(import.meta.url);
const targetDirname = path.dirname(targetFilename);

export function getTargetCss(targetName: string, project: BookProject, workspaceDir?: string): string {
  // 1. Resolve target config by merging global defaults with target-specific overrides
  const globalConfig = project.config?.global || {};
  const targetOverride = project.config?.targets?.[targetName] || {};
  
  const targetConfig = {
    ...globalConfig,
    ...targetOverride,
    margins: {
      ...(globalConfig.margins || {}),
      ...(targetOverride.margins || {})
    }
  };

  // 2. Build :root dynamic design token overrides
  let rootVars = ':root {\n';
  if (targetConfig.baseFont) {
    rootVars += `  --font-body: '${targetConfig.baseFont}', serif;\n`;
  }
  if (targetConfig.headingFont) {
    rootVars += `  --font-heading: '${targetConfig.headingFont}', sans-serif;\n`;
  }
  if (targetConfig.baseFontSize) {
    rootVars += `  --font-size-base: ${targetConfig.baseFontSize};\n`;
  }
  if (targetConfig.baseLineHeight) {
    rootVars += `  --line-height-base: ${targetConfig.baseLineHeight};\n`;
  }
  if (targetConfig.margins) {
    if (targetConfig.margins.top) rootVars += `  --margin-top: ${targetConfig.margins.top};\n`;
    if (targetConfig.margins.bottom) rootVars += `  --margin-bottom: ${targetConfig.margins.bottom};\n`;
    if (targetConfig.margins.inner) rootVars += `  --margin-inner: ${targetConfig.margins.inner};\n`;
    if (targetConfig.margins.outer) rootVars += `  --margin-outer: ${targetConfig.margins.outer};\n`;
  }
  // Inject author name so CSS margin boxes can access it dynamically
  if (project.meta?.author) {
    rootVars += `  --author-name: "${project.meta.author}";\n`;
  }
  rootVars += '}\n\n';

  // 3. Select target stylesheet file
  let themeFile = 'print-trade.css';
  const name = targetName.toLowerCase();
  if (name.includes('a4')) {
    themeFile = 'print-a4.css';
  } else if (name.includes('kindle') || name.includes('mobi')) {
    themeFile = 'kindle.css';
  } else if (name.includes('epub')) {
    themeFile = 'epub-standard.css';
  } else if (name.includes('preview')) {
    themeFile = 'preview.css';
  } else if (name.includes('trade')) {
    themeFile = 'print-trade.css';
  }

  // 4. Read stylesheet files from the themes directory
  const themesDir = path.join(targetDirname, '..', 'themes');
  const baseCssPath = path.join(themesDir, 'base.css');
  const targetCssPath = path.join(themesDir, themeFile);

  let baseCss = '';
  let targetCss = '';

  try {
    if (fs.existsSync(baseCssPath)) {
      baseCss = fs.readFileSync(baseCssPath, 'utf8');
    }
  } catch (err) {
    console.warn(`Failed to read base.css: ${err}`);
  }

  try {
    if (fs.existsSync(targetCssPath)) {
      targetCss = fs.readFileSync(targetCssPath, 'utf8');
    }
  } catch (err) {
    console.warn(`Failed to read ${themeFile}: ${err}`);
  }

  // 5. Read optional custom.css from workspace
  let customCss = '';
  if (workspaceDir) {
    const customCssPath = path.join(workspaceDir, 'custom.css');
    try {
      if (fs.existsSync(customCssPath)) {
        customCss = fs.readFileSync(customCssPath, 'utf8');
      }
    } catch (err) {
      console.warn(`Failed to read custom.css: ${err}`);
    }
  }

  // 6. Combine styles: Root Overrides + Base Styles + Target specific Styles + Custom Styles
  const combinedCss = [
    rootVars,
    baseCss,
    targetCss,
    customCss
  ].filter(Boolean).join('\n');

  return combinedCss;
}
