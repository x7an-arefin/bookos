import { getTargetCss } from './css-injector.js';
import { BookProject } from '../types/book.types.js';
import fs from 'fs-extra';

describe('CSS Injector', () => {
  let project: BookProject;

  beforeEach(() => {
    project = {
      id: 'proj-1',
      meta: {
        title: 'Book Title',
        author: 'Jane Doe',
        language: 'en',
      },
      config: {
        global: {
          pageSize: '6in 9in',
          baseFont: 'Georgia',
        },
        targets: {
          'print-trade': {
            pageSize: '6in 9in',
            margins: {
              top: '0.75in',
              bottom: '0.75in',
              inner: '0.875in',
              outer: '0.625in',
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
          'kindle': {
            pageSize: 'A5',
            margins: {
              top: '0.5in',
              bottom: '0.5in',
              inner: '0.5in',
              outer: '0.5in',
            },
            baseFont: 'Bookerly',
            baseFontSize: '10pt',
            headingFont: 'Arial',
            baseLineHeight: 1.3,
            runningHeaders: false,
            suppressHeadersOnChapterOpen: true,
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
      chapters: [],
      backMatterSections: [],
      assets: [],
      exportHistory: [],
      createdAt: '',
      updatedAt: '',
    };
  });

  it('should return a CSS stylesheet containing @page for print targets', () => {
    const css = getTargetCss('print-trade', project);
    expect(css).toContain('@page');
    expect(css).toContain('size: 6in 9in;');
  });

  it('should return a CSS stylesheet NOT containing @page for kindle target', () => {
    const css = getTargetCss('kindle', project);
    expect(css).not.toContain('@page {');
    expect(css).toContain('Bookerly');
  });

  it('should correctly inject :root overrides from config', () => {
    const css = getTargetCss('print-trade', project);
    expect(css).toContain('--font-body: \'Georgia\', serif;');
    expect(css).toContain('--font-heading: \'Garamond\', sans-serif;');
    expect(css).toContain('--font-size-base: 11pt;');
    expect(css).toContain('--line-height-base: 1.4;');
    expect(css).toContain('--margin-top: 0.75in;');
    expect(css).toContain('--author-name: "Jane Doe";');
  });

  it('should append custom.css content when workspaceDir is provided and file exists', () => {
    const originalExistsSync = fs.existsSync;
    const originalReadFileSync = fs.readFileSync;

    const mockExistsSync = jest.spyOn(fs, 'existsSync').mockImplementation((p: any) => {
      if (p.toString().endsWith('custom.css')) return true;
      return originalExistsSync(p);
    });
    
    const mockReadFileSync = jest.spyOn(fs, 'readFileSync').mockImplementation((p: any, encoding: any) => {
      if (p.toString().endsWith('custom.css')) return '.my-custom-style { color: red; }';
      return originalReadFileSync(p, encoding);
    });

    const css = getTargetCss('print-trade', project, '/dummy-workspace');
    expect(css).toContain('.my-custom-style { color: red; }');

    mockExistsSync.mockRestore();
    mockReadFileSync.mockRestore();
  });
});
