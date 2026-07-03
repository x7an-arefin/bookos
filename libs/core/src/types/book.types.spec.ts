import { BookProject, BookMeta, BookConfig, Chapter, BookAsset } from './book.types.js';

describe('BookOS Types Specification', () => {
  it('should compile and validate structural assignment', () => {
    const meta: BookMeta = {
      title: 'Test Title',
      author: 'Test Author',
      language: 'en',
    };

    const config: BookConfig = {
      global: {
        pageSize: '6in 9in',
      },
      targets: {
        print: {
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
      },
      activeTheme: 'default',
    };

    const chapter: Chapter = {
      id: 'd3b07384-d113-4ec2-a5d7-e00f98e727bc',
      title: 'Chapter 1',
      sortOrder: 1,
      contentMarkdown: '# Chapter 1\nContent',
      lastModified: new Date().toISOString(),
    };

    const asset: BookAsset = {
      id: 'c1d2e3f4-a5b6-cd7e-8f90-1234567890ab',
      filename: 'image.jpg',
      localPath: '/path/to/image.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
    };

    const project: BookProject = {
      id: 'a1b2c3d4-e5f6-7a8b-9c0d-1234567890ab',
      meta,
      config,
      frontMatterSections: [],
      chapters: [chapter],
      backMatterSections: [],
      assets: [asset],
      exportHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(project.meta.title).toBe('Test Title');
    expect(project.config.activeTheme).toBe('default');
    expect(project.chapters[0]?.title).toBe('Chapter 1');
  });
});
