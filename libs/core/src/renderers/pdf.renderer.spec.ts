import { renderPDF, buildHtmlScaffold, generateTocPage } from './pdf.renderer.js';
import { BookProject, BuildOptions } from '../types/book.types.js';
import puppeteer from 'puppeteer';
import fs from 'fs-extra';
import bwipjs from 'bwip-js';

jest.mock('puppeteer');
jest.mock('bwip-js');

jest.mock('fs-extra', () => {
  return {
    ...jest.requireActual('fs-extra'),
    existsSync: jest.fn().mockReturnValue(true),
    readFileSync: jest.fn().mockReturnValue('console.log("mock pagedjs polyfill");')
  };
});

describe('PDF Generation Engine', () => {
  let project: BookProject;
  let options: BuildOptions;
  let mockPage: any;
  let mockBrowser: any;

  beforeEach(() => {
    jest.clearAllMocks();

    project = {
      id: 'book-1',
      meta: {
        title: 'Mock Book Title',
        author: 'Jane Doe',
        language: 'en',
        isbn: '978-3-16-148410-0'
      },
      config: {
        global: {
          pageSize: '6in 9in',
          baseFont: 'Georgia'
        },
        targets: {
          print: {
            pageSize: '6in 9in',
            margins: {
              top: '0.75in',
              bottom: '0.75in',
              inner: '0.875in',
              outer: '0.625in'
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
            includeISBNBarcode: true,
            printBleed: false
          }
        },
        activeTheme: 'default'
      },
      frontMatterSections: [
        {
          id: 'fm-1',
          title: 'Title Page',
          sortOrder: 1,
          contentMarkdown: '# Title Page\nBy Jane Doe\nBarcode: {{ISBN_BARCODE}}',
          lastModified: ''
        }
      ],
      chapters: [
        {
          id: 'ch-1',
          title: 'Chapter One',
          sortOrder: 2,
          contentMarkdown: '# Chapter One\nThis is chapter content.',
          lastModified: ''
        }
      ],
      backMatterSections: [],
      assets: [],
      exportHistory: [],
      createdAt: '',
      updatedAt: ''
    };

    options = {
      project,
      target: 'print',
      outputDir: '/mock/output',
      onProgress: jest.fn()
    };

    mockPage = {
      setContent: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn().mockImplementation((fn: any) => {
        const fnStr = fn.toString();
        if (fnStr.includes('pagedjs_pages')) {
          return {
            entries: [
              { id: 'ch-1', title: 'Chapter One', pageNumber: '1' }
            ],
            compress: [],
            oddEndings: []
          };
        }
        if (fnStr.includes('.pagedjs_page')) {
          return 24; // Mock page count of 24
        }
        return undefined;
      }),
      addScriptTag: jest.fn().mockResolvedValue(undefined),
      waitForFunction: jest.fn().mockResolvedValue(true),
      pdf: jest.fn().mockResolvedValue(undefined)
    };

    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined)
    };

    (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);
    (bwipjs.toSVG as jest.Mock).mockResolvedValue('<svg>MockBarcode</svg>');
  });

  it('should build a valid HTML scaffold wrap', () => {
    const css = 'body { color: red; }';
    const body = '<div>Content</div>';
    const scaffold = buildHtmlScaffold(project, css, body, project.config.targets.print);
    expect(scaffold).toContain('<?xml version="1.0" encoding="utf-8"?>');
    expect(scaffold).toContain('<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">');
    expect(scaffold).toContain('body { color: red; }');
    expect(scaffold).toContain('<div>Content</div>');
  });

  it('should successfully mock render a PDF and count pages', async () => {
    const result = await renderPDF(options);

    // Verify progress tracking
    expect(options.onProgress).toHaveBeenCalledWith(5, expect.any(String));
    expect(options.onProgress).toHaveBeenCalledWith(100, expect.any(String));

    // Verify barcode generation is triggered
    expect(bwipjs.toSVG).toHaveBeenCalled();

    // Verify puppeteer execution
    expect(puppeteer.launch).toHaveBeenCalled();
    expect(mockBrowser.newPage).toHaveBeenCalled();
    expect(mockPage.setContent).toHaveBeenCalled();
    expect(mockPage.addScriptTag).toHaveBeenCalledWith({
      content: 'console.log("mock pagedjs polyfill");'
    });
    expect(mockPage.waitForFunction).toHaveBeenCalled();
    expect(mockPage.pdf).toHaveBeenCalledWith({
      path: expect.stringContaining('book-1-print.pdf'),
      printBackground: true,
      preferCSSPageSize: true
    });
    expect(mockBrowser.close).toHaveBeenCalled();

    // Verify returned schema output
    expect(result.pdfPath).toContain('book-1-print.pdf');
    expect(result.pageCount).toBe(24);
  });

  it('should generate a valid TOC page', () => {
    const entries = [
      { id: 'ch-1', title: 'Chapter One', pageNumber: '1' },
      { id: 'ch-2', title: 'Chapter Two', pageNumber: '3' }
    ];
    const tocHtml = generateTocPage(entries, project);
    expect(tocHtml).toContain('Table of Contents');
    expect(tocHtml).toContain('Chapter One');
    expect(tocHtml).toContain('Chapter Two');
    expect(tocHtml).toContain('1');
    expect(tocHtml).toContain('3');
  });

  it('should support projects with zero chapters without throwing', async () => {
    project.chapters = [];
    const result = await renderPDF(options);
    expect(result.pdfPath).toContain('book-1-print.pdf');
    expect(result.pageCount).toBe(24);
  });
});
