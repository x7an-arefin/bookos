import path from 'path';
import fs from 'fs-extra';
import matter from 'gray-matter';
import type { BookProject, Chapter } from '@press/core';

export class WorkspaceNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkspaceNotFoundError';
  }
}

export class InvalidWorkspaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidWorkspaceError';
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-') // Support Arabic script characters in slug too
    .replace(/(^-|-$)+/g, '');
}

function extractTitleFromMarkdown(markdown: string, defaultTitle: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1]!.trim() : defaultTitle;
}

export class WorkspaceService {
  constructor(private appVersion: string = '1.0.0') {}

  /**
   * Reads a BookProject structure from the local folder workspace.
   */
  public async readWorkspace(folderPath: string): Promise<BookProject> {
    const exists = await fs.pathExists(folderPath);
    if (!exists) {
      throw new WorkspaceNotFoundError(`Workspace directory does not exist at "${folderPath}"`);
    }

    const bookJsonPath = path.join(folderPath, 'book.json');
    const hasBookJson = await fs.pathExists(bookJsonPath);
    if (!hasBookJson) {
      throw new InvalidWorkspaceError(`book.json is missing in workspace root "${folderPath}"`);
    }

    let project: BookProject;
    try {
      const raw = await fs.readFile(bookJsonPath, 'utf8');
      project = JSON.parse(raw) as BookProject;
    } catch (err: any) {
      throw new InvalidWorkspaceError(`Failed to parse book.json: ${err.message}`);
    }

    // Set defaults
    project.frontMatterSections = [];
    project.chapters = [];
    project.backMatterSections = [];
    project.assets = project.assets || [];

    const srcDir = path.join(folderPath, 'src');
    if (await fs.pathExists(srcDir)) {
      const files = await fs.readdir(srcDir);
      // Sort alphabetically to maintain the numeric ordering
      const mdFiles = files.filter((f) => f.endsWith('.md')).sort();

      for (const filename of mdFiles) {
        const filePath = path.join(srcDir, filename);
        const rawContent = await fs.readFile(filePath, 'utf8');
        const stats = await fs.stat(filePath);

        // Parse YAML front-matter + Markdown body
        const parsed = matter(rawContent);
        const contentMarkdown = parsed.content;
        const frontMatter = parsed.data || {};

        const id = path.parse(filename).name;
        // Strip sort prefix (e.g. "01-introduction" -> "introduction")
        const cleanTitle = id.replace(/^\d+-/, '').replace(/-/g, ' ');
        const defaultTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
        const title = frontMatter['title'] || extractTitleFromMarkdown(contentMarkdown, defaultTitle);
        const type = frontMatter['type'] || 'normal';
        const sortOrder = parseInt(id.match(/^\d+/)?.[0] || '0', 10);

        const chapter: Chapter = {
          id,
          title,
          sortOrder,
          contentMarkdown,
          frontMatter,
          lastModified: stats.mtime.toISOString(),
        };

        if (type === 'frontmatter' || type === 'copyright' || type === 'dedication') {
          project.frontMatterSections.push(chapter);
        } else if (type === 'backmatter' || type === 'appendix' || type === 'about-author') {
          project.backMatterSections.push(chapter);
        } else {
          project.chapters.push(chapter);
        }
      }
    }

    // Sort chapters of each section just in case
    project.frontMatterSections.sort((a, b) => a.sortOrder - b.sortOrder);
    project.chapters.sort((a, b) => a.sortOrder - b.sortOrder);
    project.backMatterSections.sort((a, b) => a.sortOrder - b.sortOrder);

    // Sync asset records based on existing directories (assets, images, fonts)
    const possibleAssetDirs = ['assets', 'images', 'fonts'];
    const activeAssets: string[] = [];

    for (const dirName of possibleAssetDirs) {
      const dirPath = path.join(folderPath, dirName);
      if (await fs.pathExists(dirPath)) {
        const files = await fs.readdir(dirPath);
        for (const filename of files) {
          const filePath = path.join(dirPath, filename);
          const stats = await fs.stat(filePath);
          if (stats.isFile()) {
            activeAssets.push(filename);
            const existing = project.assets.find((a) => a.filename === filename);
            const relativePath = path.relative(folderPath, filePath).replace(/\\/g, '/');

            if (!existing) {
              let mimeType = 'application/octet-stream';
              const lower = filename.toLowerCase();
              if (lower.endsWith('.png')) mimeType = 'image/png';
              else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mimeType = 'image/jpeg';
              else if (lower.endsWith('.webp')) mimeType = 'image/webp';
              else if (lower.endsWith('.ttf')) mimeType = 'font/ttf';
              else if (lower.endsWith('.otf')) mimeType = 'font/otf';

              project.assets.push({
                id: `asset-${slugify(filename)}`,
                filename,
                localPath: relativePath,
                mimeType,
                sizeBytes: stats.size,
              });
            } else {
              existing.sizeBytes = stats.size;
              existing.localPath = relativePath;
            }
          }
        }
      }
    }
    project.assets = project.assets.filter((a) => activeAssets.includes(a.filename));

    return project;
  }

  /**
   * Writes the BookProject metadata and content back to separate files.
   */
  public async writeWorkspace(folderPath: string, project: BookProject): Promise<void> {
    const srcDir = path.join(folderPath, 'src');
    const assetsDir = path.join(folderPath, 'assets');
    const distDir = path.join(folderPath, 'dist');
    const bookosDir = path.join(folderPath, '.bookos');

    await fs.ensureDir(folderPath);
    await fs.ensureDir(srcDir);
    await fs.ensureDir(assetsDir);
    await fs.ensureDir(distDir);
    await fs.ensureDir(bookosDir);

    // Save project definition without chapter bodies to book.json (metadata & targets only)
    const cleanProject = {
      id: project.id,
      meta: project.meta,
      config: project.config,
      assets: project.assets,
      exportHistory: project.exportHistory || [],
      createdAt: project.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const bookJsonPath = path.join(folderPath, 'book.json');
    await fs.writeFile(bookJsonPath, JSON.stringify(cleanProject, null, 2), 'utf8');

    // Track active filenames to delete stale ones
    const activeFilenames = new Set<string>();

    const allSections = [
      ...project.frontMatterSections.map((s) => ({ ...s, defaultType: 'frontmatter' })),
      ...project.chapters.map((s) => ({ ...s, defaultType: 'normal' })),
      ...project.backMatterSections.map((s) => ({ ...s, defaultType: 'backmatter' })),
    ];

    for (const chapter of allSections) {
      const filename = `${String(chapter.sortOrder).padStart(2, '0')}-${slugify(chapter.title)}.md`;
      activeFilenames.add(filename);

      const filePath = path.join(srcDir, filename);
      const fm = {
        ...chapter.frontMatter,
      };
      if (chapter.defaultType !== 'normal' && !fm['type']) {
        fm['type'] = chapter.defaultType;
      }

      const content = matter.stringify(chapter.contentMarkdown, fm);
      await fs.writeFile(filePath, content, 'utf8');
    }

    // Clean up stale files in src/
    const files = await fs.readdir(srcDir);
    const mdFiles = files.filter((f) => f.endsWith('.md'));
    for (const file of mdFiles) {
      if (!activeFilenames.has(file)) {
        await fs.remove(path.join(srcDir, file));
      }
    }

    // Write internal app tracking metadata
    const metaPath = path.join(bookosDir, 'meta.json');
    await fs.writeFile(
      metaPath,
      JSON.stringify(
        {
          lastSaved: new Date().toISOString(),
          version: this.appVersion,
        },
        null,
        2
      ),
      'utf8'
    );
  }
}
