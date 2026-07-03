import { validateWorkspace, validateISBN13 } from './workspace-validator.js';
import { BookProject } from '../types/book.types.js';
import fs from 'fs-extra';
import sharp from 'sharp';
import fontkit from 'fontkit';

jest.mock('fs-extra', () => {
  return {
    ...jest.requireActual('fs-extra'),
    existsSync: jest.fn(),
    readJsonSync: jest.requireActual('fs-extra').readJsonSync,
  };
});

jest.mock('sharp', () => {
  return jest.fn().mockImplementation(() => ({
    metadata: jest.fn().mockResolvedValue({ density: 300, format: 'jpeg' }),
  }));
});

jest.mock('fontkit', () => {
  return {
    openSync: jest.fn().mockImplementation(() => ({
      licence: 'All rights reserved.',
      name: {
        records: {
          13: { en: 'All rights reserved.' }
        }
      },
      hasGlyphForCodePoint: jest.fn().mockReturnValue(true),
    })),
  };
});

describe('Workspace Validator', () => {
  let project: BookProject;

  beforeEach(() => {
    jest.clearAllMocks();

    project = {
      id: 'a1b2c3d4-e5f6-7a8b-9c0d-1234567890ab',
      meta: {
        title: 'My Book',
        author: 'John Doe',
        language: 'en',
        isbn: '978-3-16-148410-0', // Valid ISBN-13
      },
      config: {
        global: {
          pageSize: '6in 9in',
        },
        targets: {
          print: {
            pageSize: '6in 9in',
            margins: {
              top: '0.75in',
              bottom: '0.75in',
              inner: '0.75in',
              outer: '0.75in',
            },
            baseFont: 'Georgia',
            baseFontSize: '11pt',
            headingFont: 'Garamond',
            baseLineHeight: 1.4,
            runningHeaders: true,
            suppressHeadersOnChapterOpen: true,
            dropCaps: true,
            hyphenation: true,
            chapterStartsOnRightPage: true,
            includeTOC: true,
            includeISBNBarcode: false,
            printBleed: false,
          },
        },
        activeTheme: 'default',
      },
      frontMatterSections: [],
      chapters: [
        {
          id: 'ch-1',
          title: 'Chapter One',
          sortOrder: 1,
          contentMarkdown: '# Chapter One\nThis is the content with a special character like ☺.',
          lastModified: new Date().toISOString(),
        },
      ],
      backMatterSections: [],
      assets: [],
      exportHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
  });

  describe('ISBN Validation', () => {
    it('should validate correct ISBN-13 formats', () => {
      expect(validateISBN13('978-3-16-148410-0')).toBe(true);
      expect(validateISBN13('9783161484100')).toBe(true);
    });

    it('should flag incorrect ISBN-13 formats', () => {
      expect(validateISBN13('978-3-16-148410-1')).toBe(false); // bad checksum
      expect(validateISBN13('978316148410')).toBe(false); // too short
      expect(validateISBN13('97831614841000')).toBe(false); // too long
    });
  });

  describe('validateWorkspace', () => {
    it('should return isValid: true for a valid workspace', async () => {
      const report = await validateWorkspace(project, '/workspace');
      expect(report.isValid).toBe(true);
      expect(report.errors.length).toBe(0);
    });

    it('should catch missing required meta fields', async () => {
      project.meta.title = '';
      const report = await validateWorkspace(project, '/workspace');
      expect(report.isValid).toBe(false);
      expect(report.errors.some(e => e.code === 'MISSING_REQUIRED_FIELD' || e.code === 'SCHEMA_ERROR')).toBe(true);
    });

    it('should catch missing chapters', async () => {
      project.chapters = [];
      const report = await validateWorkspace(project, '/workspace');
      expect(report.isValid).toBe(false);
      expect(report.errors.some(e => e.code === 'MISSING_REQUIRED_FIELD')).toBe(true);
    });

    it('should flag invalid ISBN checksum', async () => {
      project.meta.isbn = '978-3-16-148410-1'; // Invalid checksum
      const report = await validateWorkspace(project, '/workspace');
      expect(report.warnings.some(w => w.code === 'INVALID_ISBN')).toBe(true);
    });

    it('should fail if missing required target config fields', async () => {
      delete (project.config.targets.print as any).pageSize;
      const report = await validateWorkspace(project, '/workspace');
      expect(report.isValid).toBe(false);
      expect(report.errors.some(e => e.code === 'INCOMPLETE_TARGET_PROFILE')).toBe(true);
    });

    it('should fail if a referenced asset is missing', async () => {
      project.assets.push({
        id: 'asset-1',
        filename: 'scene.jpg',
        localPath: 'assets/scene.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1000,
      });

      // Mock fs.existsSync to return false for the asset path but true for others (like the schema file)
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('scene.jpg')) return false;
        return true;
      });

      const report = await validateWorkspace(project, '/workspace');
      expect(report.isValid).toBe(false);
      expect(report.errors.some(e => e.code === 'MISSING_ASSET')).toBe(true);
    });

    it('should flag low-resolution images as warnings', async () => {
      project.assets.push({
        id: 'asset-1',
        filename: 'scene.jpg',
        localPath: 'assets/scene.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1000,
      });

      (sharp as unknown as jest.Mock).mockImplementation(() => ({
        metadata: jest.fn().mockResolvedValue({ density: 72, format: 'jpeg' }),
      }));

      const report = await validateWorkspace(project, '/workspace');
      expect(report.warnings.some(w => w.code === 'LOW_RESOLUTION_IMAGE')).toBe(true);
    });

    it('should check for restrictive font licenses', async () => {
      (fontkit.openSync as jest.Mock).mockImplementation(() => ({
        licence: 'Restricted - no redistribution allowed.',
        name: {
          records: {
            13: { en: 'Restricted - no redistribution allowed.' }
          }
        },
        hasGlyphForCodePoint: jest.fn().mockReturnValue(true),
      }));

      const report = await validateWorkspace(project, '/workspace');
      expect(report.isValid).toBe(false);
      expect(report.errors.some(e => e.code === 'FONT_LICENSE_VIOLATION')).toBe(true);
    });

    it('should flag missing glyphs for characters used in text', async () => {
      (fontkit.openSync as jest.Mock).mockImplementation(() => ({
        licence: 'Open font license.',
        name: {
          records: {
            13: { en: 'Open font license.' }
          }
        },
        hasGlyphForCodePoint: jest.fn().mockImplementation((codePoint: number) => {
          // Mock missing glyph for '☺' (Unicode U+263A, decimal 9786)
          if (codePoint === 9786) return false;
          return true;
        }),
      }));

      const report = await validateWorkspace(project, '/workspace');
      expect(report.warnings.some(w => w.code === 'MISSING_GLYPH')).toBe(true);
    });
  });
});
