import path from 'path';
import fs from 'fs-extra';
import Ajv from 'ajv';
import fontkit from 'fontkit';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { BookProject, ValidationReport, ValidationItem } from '../types/book.types.js';

// Resolve directory name in ESM
const targetFilename = fileURLToPath(import.meta.url);
const targetDirname = path.dirname(targetFilename);
const schemaPath = path.join(targetDirname, '..', 'types', 'book-json.schema.json');
const schema = fs.readJsonSync(schemaPath);

const ajv = new Ajv({ allErrors: true, useDefaults: true });
const validateSchema = ajv.compile(schema);

export function validateISBN13(isbn: string): boolean {
  const clean = isbn.replace(/[- ]/g, '');
  if (clean.length !== 13 || !/^\d{13}$/.test(clean)) {
    return false;
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(clean[i]!, 10);
    sum += (i % 2 === 0) ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(clean[12]!, 10);
}

function globSearch(dir: string, cleanName: string): string[] {
  const results: string[] = [];
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        results.push(...globSearch(fullPath, cleanName));
      } else {
        const ext = path.extname(file).toLowerCase();
        if ((ext === '.ttf' || ext === '.otf') && file.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().includes(cleanName)) {
          results.push(fullPath);
        }
      }
    }
  } catch (e) {
    // Ignore read errors
  }
  return results;
}

function findFontFile(fontName: string): string | null {
  if (fs.existsSync(fontName)) {
    return fontName;
  }
  
  const cleanName = fontName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const searchDirs: string[] = [];
  
  if (process.platform === 'win32') {
    searchDirs.push('C:\\Windows\\Fonts');
  } else if (process.platform === 'darwin') {
    searchDirs.push('/Library/Fonts', '/System/Library/Fonts', path.join(process.env.HOME || '', 'Library/Fonts'));
  } else {
    searchDirs.push('/usr/share/fonts', '/usr/local/share/fonts', path.join(process.env.HOME || '', '.fonts'));
  }
  
  for (const dir of searchDirs) {
    if (fs.existsSync(dir)) {
      const files = globSearch(dir, cleanName);
      if (files.length > 0) {
        return files[0]!;
      }
    }
  }
  
  return null;
}

export async function validateWorkspace(project: BookProject, workspaceDir: string = process.cwd()): Promise<ValidationReport> {
  const errors: ValidationItem[] = [];
  const warnings: ValidationItem[] = [];
  const info: ValidationItem[] = [];

  // 1. AJV Schema Validation
  const isSchemaValid = validateSchema(project);
  if (!isSchemaValid && validateSchema.errors) {
    for (const err of validateSchema.errors) {
      errors.push({
        severity: 'error',
        code: 'SCHEMA_ERROR',
        message: `Schema validation failed at metadata: ${err.instancePath || 'root'} ${err.message}`,
      });
    }
  }

  // 2. Completeness / required fields
  if (!project.meta.title) {
    errors.push({
      severity: 'error',
      code: 'MISSING_REQUIRED_FIELD',
      message: 'Book meta is missing required field: title.',
    });
  }
  if (!project.meta.author) {
    errors.push({
      severity: 'error',
      code: 'MISSING_REQUIRED_FIELD',
      message: 'Book meta is missing required field: author.',
    });
  }
  
  const allChapters = [...project.frontMatterSections, ...project.chapters, ...project.backMatterSections];
  if (project.chapters.length === 0) {
    errors.push({
      severity: 'error',
      code: 'MISSING_REQUIRED_FIELD',
      message: 'A book must contain at least one content chapter in the chapters array.',
    });
  }

  // 3. ISBN checksum check
  if (project.meta.isbn) {
    if (!validateISBN13(project.meta.isbn)) {
      warnings.push({
        severity: 'warning',
        code: 'INVALID_ISBN',
        message: `The provided ISBN-13 "${project.meta.isbn}" is invalid (checksum failed).`,
      });
    }
  }

  // 4. Targets completeness
  const config = project.config;
  if (!config.targets || Object.keys(config.targets).length === 0) {
    errors.push({
      severity: 'error',
      code: 'INCOMPLETE_TARGET_PROFILE',
      message: 'At least one build target profile must be defined in config.targets.',
    });
  } else {
    for (const [targetName, target] of Object.entries(config.targets)) {
      if (!target.pageSize) {
        errors.push({
          severity: 'error',
          code: 'INCOMPLETE_TARGET_PROFILE',
          message: `Target config "${targetName}" is missing required field: pageSize.`,
        });
      }
      if (!target.margins || !target.margins.top || !target.margins.bottom || !target.margins.inner || !target.margins.outer) {
        errors.push({
          severity: 'error',
          code: 'INCOMPLETE_TARGET_PROFILE',
          message: `Target config "${targetName}" is missing completed margin configuration (top, bottom, inner, outer).`,
        });
      }
      if (!target.baseFont) {
        errors.push({
          severity: 'error',
          code: 'INCOMPLETE_TARGET_PROFILE',
          message: `Target config "${targetName}" is missing required field: baseFont.`,
        });
      }
    }
  }

  // 5. Filename ordering check & Markdown link check
  for (const chapter of allChapters) {
    const filename = (chapter as any).localPath ? path.basename((chapter as any).localPath) : ((chapter as any).filename || '');
    if (filename && !/^\d+[-_]/.test(filename)) {
      info.push({
        severity: 'info',
        code: 'UNORDERED_FILENAME',
        message: `Chapter file "${filename}" does not use a numeric ordering prefix (e.g. "01-chapter.md").`,
        chapterId: chapter.id,
      });
    }

    // Scan Markdown for relative image path references
    const markdown = chapter.contentMarkdown || '';
    const imageRegex = /!\[.*?\]\((.*?)\)/g;
    let match;
    while ((match = imageRegex.exec(markdown)) !== null) {
      const imgPath = match[1];
      if (imgPath && !/^https?:\/\//.test(imgPath)) {
        const resolvedPath = path.isAbsolute(imgPath) ? imgPath : path.resolve(workspaceDir, imgPath);
        if (!fs.existsSync(resolvedPath)) {
          errors.push({
            severity: 'error',
            code: 'MISSING_ASSET',
            message: `Image asset "${imgPath}" referenced in chapter "${chapter.title}" cannot be resolved on disk.`,
            chapterId: chapter.id,
          });
        }
      }
    }
  }

  // 6. Registered assets existence & resolution DPI checks
  for (const asset of project.assets) {
    const resolved = path.isAbsolute(asset.localPath) ? asset.localPath : path.resolve(workspaceDir, asset.localPath);
    if (!fs.existsSync(resolved)) {
      errors.push({
        severity: 'error',
        code: 'MISSING_ASSET',
        message: `Asset file "${asset.filename}" at path "${asset.localPath}" does not exist.`,
        assetId: asset.id,
      });
    } else if (asset.mimeType.startsWith('image/')) {
      try {
        const meta = await sharp(resolved).metadata();
        const density = meta.density || null;
        if (density && density < 150) {
          warnings.push({
            severity: 'warning',
            code: 'LOW_RESOLUTION_IMAGE',
            message: `Image asset "${asset.filename}" has low resolution (${density} DPI). Recommended is at least 300 DPI for print.`,
            assetId: asset.id,
          });
        }
      } catch (err: any) {
        warnings.push({
          severity: 'warning',
          code: 'IMAGE_READ_ERROR',
          message: `Failed to read metadata for image asset "${asset.filename}": ${err.message}`,
          assetId: asset.id,
        });
      }
    }
  }

  // 7. Font Glyphs and License inspections
  const charSet = new Set<string>();
  for (const chapter of allChapters) {
    for (const char of chapter.contentMarkdown || '') {
      charSet.add(char);
    }
  }

  if (config.targets) {
    const checkedFonts = new Set<string>();
    for (const [targetName, target] of Object.entries(config.targets)) {
      const fontsToCheck = [target.baseFont, target.headingFont].filter(Boolean) as string[];
      for (const fontName of fontsToCheck) {
        if (checkedFonts.has(fontName)) continue;
        checkedFonts.add(fontName);
        
        const fontPath = findFontFile(fontName);
        if (!fontPath) {
          info.push({
            severity: 'info',
            code: 'FONT_NOT_INSPECTED',
            message: `Font "${fontName}" specified in target "${targetName}" is a system font and its file could not be located on disk. Glyph coverage and license checks were skipped.`,
          });
          continue;
        }
        
        try {
          const font = fontkit.openSync(fontPath);
          
          // License checks
          const licence = font.licence || (font.name.records[13] ? font.name.records[13].en : '') || '';
          const licenceLower = licence.toLowerCase();
          if (licenceLower.includes('not for embedding') || licenceLower.includes('no redistribution') || licenceLower.includes('restricted')) {
            errors.push({
              severity: 'error',
              code: 'FONT_LICENSE_VIOLATION',
              message: `Font "${fontName}" at "${fontPath}" has a restrictive license preventing embedding: "${licence.substring(0, 100)}..."`,
            });
          }
          
          // Glyph coverage checks
          const missingChars: string[] = [];
          for (const char of charSet) {
            if (/[\s\r\n\t]/.test(char)) continue; // ignore whitespace
            
            const codePoint = char.codePointAt(0);
            if (codePoint !== undefined) {
              if (!font.hasGlyphForCodePoint(codePoint)) {
                missingChars.push(char);
              }
            }
          }
          
          if (missingChars.length > 0) {
            const charList = missingChars.slice(0, 20).join(' ');
            const count = missingChars.length;
            warnings.push({
              severity: 'warning',
              code: 'MISSING_GLYPH',
              message: `Font "${fontName}" is missing glyphs for ${count} characters used in the text: ${charList}${count > 20 ? ' ...' : ''}`,
            });
          }
        } catch (err: any) {
          warnings.push({
            severity: 'warning',
            code: 'FONT_READ_ERROR',
            message: `Failed to open or inspect font file for "${fontName}" at "${fontPath}": ${err.message}`,
          });
        }
      }
    }
  }

  const isValid = errors.length === 0;
  return {
    errors,
    warnings,
    info,
    isValid,
  };
}
