import { buildBook } from './engine.js';
import { BookProject, BuildOptions } from './types/book.types.js';
import fs from 'fs-extra';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const targetFilename = fileURLToPath(import.meta.url);
const targetDirname = path.dirname(targetFilename);

// Mock puppeteer for PDF generation
jest.mock('puppeteer', () => {
  return {
    launch: jest.fn().mockResolvedValue({
      newPage: jest.fn().mockResolvedValue({
        setContent: jest.fn().mockResolvedValue(undefined),
        evaluate: jest.fn().mockImplementation((fn: any) => {
          const fnStr = fn.toString();
          if (fnStr.includes('pagedjs_pages')) {
            return {
              entries: [{ id: 'ch-1', title: 'Chapter One', pageNumber: '1' }],
              compress: [],
              oddEndings: []
            };
          }
          if (fnStr.includes('.pagedjs_page')) {
            return 12; // Mock 12 page count
          }
          return undefined;
        }),
        addScriptTag: jest.fn().mockResolvedValue(undefined),
        waitForFunction: jest.fn().mockResolvedValue(true),
        pdf: jest.fn().mockImplementation(async (pdfOpts) => {
          if (pdfOpts && pdfOpts.path) {
            await fs.ensureDir(path.dirname(pdfOpts.path));
            await fs.writeFile(pdfOpts.path, '%PDF-1.4 mock pdf content');
          }
          return Buffer.from('%PDF-1.4 mock pdf content');
        }),
        close: jest.fn().mockResolvedValue(undefined),
      }),
      close: jest.fn().mockResolvedValue(undefined),
    }),
  };
});

// Mock fontkit for license validations
jest.mock('fontkit', () => {
  return {
    open: jest.fn().mockResolvedValue({
      os2: {
        fsType: {
          restrictedLicense: false,
        }
      }
    }),
  };
});

// Mock child_process for EPUBCheck
jest.mock('child_process', () => {
  return {
    exec: jest.fn().mockImplementation((cmd, callback) => {
      callback(null, { stdout: 'No errors or warnings detected', stderr: '' });
    }),
  };
});

describe('Engine Integration Pipeline', () => {
  const fixturesDir = path.join(targetDirname, '..', '..', 'integration-fixtures');
  const testOutputDir = path.join(targetDirname, '..', '..', 'test-output-integration');
  
  const pngFixturePath = path.join(fixturesDir, 'sample_asset.png');
  let consoleWarnSpy: jest.SpyInstance;

  async function createTestImage(filePath: string) {
    await fs.ensureDir(path.dirname(filePath));
    const basePng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    await sharp(basePng)
      .resize(100, 100)
      .png()
      .toFile(filePath);
  }

  beforeAll(async () => {
    sharp.cache(false);
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await fs.ensureDir(fixturesDir);
    await fs.ensureDir(testOutputDir);
    await createTestImage(pngFixturePath);
  });

  afterAll(async () => {
    consoleWarnSpy.mockRestore();
    await fs.remove(fixturesDir);
    await fs.remove(testOutputDir);
  });

  function getBaseProject(): BookProject {
    return {
      id: 'integration-book-id',
      meta: {
        title: 'Integration Test Book',
        author: 'Jane Doe',
        language: 'en',
        publisher: 'BookOS press',
        publicationDate: '2026-06-30'
      },
      config: {
        global: {
          pageSize: '6in 9in',
          baseFont: 'Georgia',
        },
        targets: {
          'pdf-trade': {
            pageSize: '6in 9in',
            margins: { top: '0.75in', bottom: '0.75in', inner: '0.75in', outer: '0.75in' },
            baseFont: 'Georgia',
            baseFontSize: '11pt',
            headingFont: 'Arial',
            baseLineHeight: 1.4,
            runningHeaders: true,
            suppressHeadersOnChapterOpen: true,
            dropCaps: true,
            hyphenation: false,
            chapterStartsOnRightPage: true,
            includeTOC: true,
            includeISBNBarcode: false,
            printBleed: false
          },
          'epub-standard': {
            pageSize: '6in 9in',
            margins: { top: '10px', bottom: '10px', inner: '10px', outer: '10px' },
            baseFont: 'Georgia',
            baseFontSize: '12pt',
            headingFont: 'Arial',
            baseLineHeight: 1.5,
            runningHeaders: false,
            suppressHeadersOnChapterOpen: false,
            dropCaps: false,
            hyphenation: false,
            chapterStartsOnRightPage: false,
            includeTOC: true,
            includeISBNBarcode: false,
            printBleed: false
          }
        },
        activeTheme: 'default'
      },
      frontMatterSections: [
        {
          id: 'intro-sect',
          title: 'Introduction',
          sortOrder: 1,
          contentMarkdown: '# Introduction\nThis is a frontmatter section.\n\nNested information.',
          frontMatter: { type: 'frontmatter' },
          lastModified: ''
        }
      ],
      chapters: [
        {
          id: 'ch1-sect',
          title: 'Chapter 1',
          sortOrder: 2,
          contentMarkdown: '# Chapter One\nThis is chapter content with a footnote [^1].\n\n[^1]: F1 details.',
          lastModified: ''
        },
        {
          id: 'ch2-sect',
          title: 'Chapter 2',
          sortOrder: 3,
          contentMarkdown: '# Chapter Two\nParagraph content.\n\n![Image Reference](sample_asset.png)',
          lastModified: ''
        }
      ],
      backMatterSections: [],
      assets: [
        {
          id: 'asset-img-1',
          filename: 'sample_asset.png',
          localPath: pngFixturePath,
          mimeType: 'image/png',
          sizeBytes: 120
        }
      ],
      exportHistory: [],
      createdAt: '',
      updatedAt: ''
    };
  }

  it('should run validateWorkspace step and abort if project is invalid', async () => {
    const invalidProject = getBaseProject();
    invalidProject.meta.title = ''; // Invalid title

    const progressCallback = jest.fn();
    const result = await buildBook({
      project: invalidProject,
      target: 'pdf-trade',
      outputDir: testOutputDir,
      onProgress: progressCallback
    });

    expect(result.success).toBe(false);
    expect(result.outputPath).toBe('');
    expect(result.validation.isValid).toBe(false);
    expect(result.validation.errors.length).toBeGreaterThan(0);
  });

  it('should successfully build a PDF book and trigger the progress callback with increasing values', async () => {
    const project = getBaseProject();
    const progressUpdates: { percent: number; message: string }[] = [];
    
    const result = await buildBook({
      project,
      target: 'pdf-trade',
      outputDir: testOutputDir,
      onProgress: (percent, message) => {
        progressUpdates.push({ percent, message });
      }
    });

    expect(result.success).toBe(true);
    expect(result.outputPath).toContain('.pdf');
    expect(result.format).toBe('pdf');
    expect(result.pageCount).toBe(12);

    // Verify output PDF file exists and starts with %PDF magic bytes
    expect(fs.existsSync(result.outputPath)).toBe(true);
    const pdfBuffer = await fs.readFile(result.outputPath);
    expect(pdfBuffer.toString('utf8', 0, 4)).toBe('%PDF');

    // Verify progress callback was triggered correctly at least 5 times
    expect(progressUpdates.length).toBeGreaterThanOrEqual(5);
    
    // Check that percentages are increasing
    for (let i = 1; i < progressUpdates.length; i++) {
      expect(progressUpdates[i]!.percent).toBeGreaterThanOrEqual(progressUpdates[i - 1]!.percent);
    }
  });

  it('should successfully build an EPUB book', async () => {
    const project = getBaseProject();
    const result = await buildBook({
      project,
      target: 'epub-standard',
      outputDir: testOutputDir,
    });

    expect(result.success).toBe(true);
    expect(result.outputPath).toContain('.epub');
    expect(result.format).toBe('epub');
    expect(fs.existsSync(result.outputPath)).toBe(true);
  });
});
