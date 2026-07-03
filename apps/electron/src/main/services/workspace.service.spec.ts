import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { WorkspaceService, WorkspaceNotFoundError, InvalidWorkspaceError } from './workspace.service.js';
import type { BookProject } from '@press/core';

describe('WorkspaceService', () => {
  let tempDir: string;
  let service: WorkspaceService;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `bookos-workspace-test-${Date.now()}-${Math.random()}`);
    service = new WorkspaceService('1.0.0');
  });

  afterEach(async () => {
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  const getMockProject = (): BookProject => ({
    id: 'book-123',
    meta: {
      title: 'Design of Systems',
      author: 'A. N. Author',
    },
    config: {
      global: { pageSize: '6in 9in', baseFont: 'Georgia' },
      targets: {},
      activeTheme: 'default',
    },
    frontMatterSections: [
      { id: 'fm-1', title: 'Copyright', sortOrder: 0, contentMarkdown: '© 2026.', frontMatter: { type: 'frontmatter' }, lastModified: '' },
    ],
    chapters: [
      { id: 'ch-1', title: 'Introduction', sortOrder: 1, contentMarkdown: '# Introduction\nHello World.', frontMatter: {}, lastModified: '' },
      { id: 'ch-2', title: 'Second Chapter', sortOrder: 2, contentMarkdown: '# Second Chapter\nContent goes here.', frontMatter: {}, lastModified: '' },
    ],
    backMatterSections: [
      { id: 'bm-1', title: 'About Author', sortOrder: 99, contentMarkdown: 'Author Bio.', frontMatter: { type: 'backmatter' }, lastModified: '' },
    ],
    assets: [],
    exportHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  it('should write a workspace on disk and structure it correctly', async () => {
    const project = getMockProject();
    await service.writeWorkspace(tempDir, project);

    expect(await fs.pathExists(path.join(tempDir, 'book.json'))).toBe(true);
    expect(await fs.pathExists(path.join(tempDir, 'src', '00-copyright.md'))).toBe(true);
    expect(await fs.pathExists(path.join(tempDir, 'src', '01-introduction.md'))).toBe(true);
    expect(await fs.pathExists(path.join(tempDir, 'src', '02-second-chapter.md'))).toBe(true);
    expect(await fs.pathExists(path.join(tempDir, 'src', '99-about-author.md'))).toBe(true);
    expect(await fs.pathExists(path.join(tempDir, '.bookos', 'meta.json'))).toBe(true);

    const bookJson = await fs.readJson(path.join(tempDir, 'book.json'));
    expect(bookJson.id).toBe('book-123');
    expect(bookJson.meta.title).toBe('Design of Systems');
    expect(bookJson.chapters).toBeUndefined(); // Should not save content in book.json
  });

  it('should read a workspace back from disk and reconstruct BookProject', async () => {
    const project = getMockProject();
    await service.writeWorkspace(tempDir, project);

    const restored = await service.readWorkspace(tempDir);
    expect(restored.id).toBe('book-123');
    expect(restored.meta.title).toBe('Design of Systems');
    expect(restored.frontMatterSections.length).toBe(1);
    expect(restored.chapters.length).toBe(2);
    expect(restored.backMatterSections.length).toBe(1);

    expect(restored.chapters[0]!.title).toBe('Introduction');
    expect(restored.chapters[0]!.sortOrder).toBe(1);
    expect(restored.chapters[0]!.contentMarkdown.trim()).toBe('# Introduction\nHello World.');
  });

  it('should delete orphaned files in src/ when rewriting workspace', async () => {
    const project = getMockProject();
    await service.writeWorkspace(tempDir, project);

    // Add a stale file
    await fs.writeFile(path.join(tempDir, 'src', '98-stale.md'), 'some text', 'utf8');
    expect(await fs.pathExists(path.join(tempDir, 'src', '98-stale.md'))).toBe(true);

    // Rewrite
    await service.writeWorkspace(tempDir, project);
    expect(await fs.pathExists(path.join(tempDir, 'src', '98-stale.md'))).toBe(false); // Stale file deleted
  });

  it('should throw WorkspaceNotFoundError if folder does not exist', async () => {
    await expect(service.readWorkspace(path.join(tempDir, 'invalid'))).rejects.toThrow(WorkspaceNotFoundError);
  });

  it('should throw InvalidWorkspaceError if book.json is missing', async () => {
    await fs.ensureDir(tempDir);
    await expect(service.readWorkspace(tempDir)).rejects.toThrow(InvalidWorkspaceError);
  });
});
