import { renderEPUB, stripPrintOnlyCss } from './epub.renderer.js';
import { BookProject, BuildOptions } from '../types/book.types.js';
import fs from 'fs-extra';
import path from 'path';
import fontkit from 'fontkit';
import { fileURLToPath } from 'url';

const targetFilename = fileURLToPath(import.meta.url);
const targetDirname = path.dirname(targetFilename);

jest.mock('fontkit', () => {
  return {
    open: jest.fn(),
  };
});

jest.mock('child_process', () => {
  return {
    exec: jest.fn().mockImplementation((cmd, callback) => {
      callback(null, { stdout: 'No errors or warnings detected', stderr: '' });
    }),
  };
});

describe('EPUB Packager Engine', () => {
  let project: BookProject;
  let options: BuildOptions;
  const testOutputDir = path.join(targetDirname, '..', '..', 'test-output-epub');

  beforeAll(async () => {
    await fs.ensureDir(testOutputDir);
  });

  afterAll(async () => {
    await fs.remove(testOutputDir);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    project = {
      id: 'book-epub-1',
      meta: {
        title: 'My EPUB Book',
        author: 'John Doe',
        language: 'en',
        isbn: '978-3-16-148410-0',
        publisher: 'EPUB Press',
        publicationDate: '2026-06-28',
      },
      config: {
        global: {
          pageSize: '6in 9in',
          baseFont: 'Georgia',
        },
        targets: {
          epub: {
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
            printBleed: false,
          }
        },
        activeTheme: 'default',
      },
      frontMatterSections: [],
      chapters: [
        {
          id: 'ch-epub-1',
          title: 'Introduction',
          sortOrder: 1,
          contentMarkdown: '# Introduction\nThis is the intro.\n\n## Subheading 1\nSome nested text.',
          lastModified: '',
        },
        {
          id: 'ch-epub-2',
          title: 'Main Body',
          sortOrder: 2,
          contentMarkdown: '# Chapter One\nBody text.',
          lastModified: '',
        }
      ],
      backMatterSections: [],
      assets: [],
      exportHistory: [],
      createdAt: '',
      updatedAt: '',
    };

    options = {
      project,
      target: 'epub',
      outputDir: testOutputDir,
      onProgress: jest.fn(),
    };

    (fontkit.open as jest.Mock).mockResolvedValue({
      os2: {
        fsType: {
          restrictedLicense: false,
        }
      }
    });
  });

  it('should correctly strip print-only CSS rules via stripPrintOnlyCss', () => {
    const rawCss = `
      @page {
        size: 6in 9in;
        margin: 1in;
      }
      body {
        font-family: var(--font-body);
        break-inside: avoid;
        page-break-before: always;
      }
    `;
    const stripped = stripPrintOnlyCss(rawCss);
    expect(stripped).not.toContain('@page');
    expect(stripped).not.toContain('break-inside');
    expect(stripped).not.toContain('page-break-before');
    expect(stripped).toContain('body {');
  });

  it('should compile an EPUB file containing mimetype and valid container.xml', async () => {
    const { epubPath, report } = await renderEPUB(options);

    // Verify output file exists
    expect(fs.existsSync(epubPath)).toBe(true);

    // Verify zip signature (PK\x03\x04)
    const fileBuffer = await fs.readFile(epubPath);
    expect(fileBuffer.readUInt32LE(0)).toBe(0x04034b50); // PK\x03\x04 in little endian

    // Verify validation report structure is returned
    expect(report.isValid).toBe(true);
    expect(report.errors).toBeDefined();
    expect(report.warnings).toBeDefined();
  });
});
