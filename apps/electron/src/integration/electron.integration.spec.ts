import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { WorkspaceService } from '../main/services/workspace.service.js';
import { DatabaseService } from '../main/services/database.service.js';
import { buildBook, optimizeImage } from '@press/core';

describe('Electron Monorepo Pipeline Integration Tests', () => {
  let tempDir: string;
  let workspaceService: WorkspaceService;
  let db: DatabaseService;
  
  const rootDir = path.resolve(__dirname, '../../../..');
  const fixturesDir = path.join(rootDir, 'libs/core/__fixtures__');

  beforeAll(async () => {
    tempDir = path.join(os.tmpdir(), `bookos-integration-${Date.now()}-${Math.random()}`);
    workspaceService = new WorkspaceService('1.0.0');
    
    // SQLite/JSON database helper
    db = new DatabaseService(path.join(tempDir, 'db.json'));

    // Ensure core fixtures exist on disk
    const basePng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    const sharp = require('sharp');
    const imagesFixtureDir = path.join(fixturesDir, 'images');
    const fontsFixtureDir = path.join(fixturesDir, 'fonts');
    
    await fs.ensureDir(imagesFixtureDir);
    await fs.ensureDir(fontsFixtureDir);

    if (!fs.existsSync(path.join(imagesFixtureDir, 'sample-300dpi.png'))) {
      await sharp(basePng).resize(600, 900).png().withMetadata({ density: 300 }).toFile(path.join(imagesFixtureDir, 'sample-300dpi.png'));
    }
    if (!fs.existsSync(path.join(imagesFixtureDir, 'sample-72dpi.jpg'))) {
      await sharp(basePng).resize(400, 600).jpeg().withMetadata({ density: 72 }).toFile(path.join(imagesFixtureDir, 'sample-72dpi.jpg'));
    }
    if (!fs.existsSync(path.join(imagesFixtureDir, 'sample-cover.jpg'))) {
      await sharp(basePng).resize(1600, 2560).jpeg().withMetadata({ density: 300 }).toFile(path.join(imagesFixtureDir, 'sample-cover.jpg'));
    }

    if (!fs.existsSync(path.join(fontsFixtureDir, 'open-sans-mock.ttf'))) {
      let fontCopied = false;
      const searchFonts = [
        'C:\\Windows\\Fonts\\arial.ttf',
        '/Library/Fonts/Arial.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
      ];
      for (const f of searchFonts) {
        if (await fs.pathExists(f)) {
          await fs.copy(f, path.join(fontsFixtureDir, 'open-sans-mock.ttf'));
          await fs.copy(f, path.join(fontsFixtureDir, 'restricted-mock.ttf'));
          fontCopied = true;
          break;
        }
      }
      if (!fontCopied) {
        await fs.writeFile(path.join(fontsFixtureDir, 'open-sans-mock.ttf'), 'mock ttf data');
        await fs.writeFile(path.join(fontsFixtureDir, 'restricted-mock.ttf'), 'mock ttf data');
      }
    }

    // Set up temp workspace files
    await fs.ensureDir(path.join(tempDir, 'images'));
    await fs.ensureDir(path.join(tempDir, 'fonts'));
    await fs.ensureDir(path.join(tempDir, 'src'));

    // Load and write project via WorkspaceService to guarantee correct front-matter headers on disk
    const project = await fs.readJson(path.join(fixturesDir, 'sample-book.json'));
    await workspaceService.writeWorkspace(tempDir, project);

    // Copy images and fonts fixtures to correct local workspace paths
    await fs.copy(path.join(fixturesDir, 'images'), path.join(tempDir, 'images'));
    await fs.copy(path.join(fixturesDir, 'fonts'), path.join(tempDir, 'fonts'));

    // Copy images to tempDir root to satisfy relative markdown reference validation
    const imageFiles = await fs.readdir(path.join(fixturesDir, 'images'));
    for (const file of imageFiles) {
      await fs.copy(path.join(fixturesDir, 'images', file), path.join(tempDir, file));
    }
  });

  afterAll(async () => {
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  it('should read a workspace from disk into a BookProject', async () => {
    const project = await workspaceService.readWorkspace(tempDir);
    expect(project.id).toBeDefined();
    expect(project.meta.title).toBe('BookOS Sample Manual');
    expect(project.chapters.length).toBe(3);
    expect(project.frontMatterSections.length).toBe(1);
    expect(project.backMatterSections.length).toBe(1);
    expect(project.assets.length).toBeGreaterThanOrEqual(3);
  });

  it('should write a BookProject back to disk and produce correct file layout', async () => {
    const project = await workspaceService.readWorkspace(tempDir);
    
    // Modify metadata
    project.meta.title = 'Updated Integration Book Title';
    
    await workspaceService.writeWorkspace(tempDir, project);

    expect(await fs.pathExists(path.join(tempDir, 'book.json'))).toBe(true);
    expect(await fs.pathExists(path.join(tempDir, 'src', '02-introduction.md'))).toBe(true);

    const parsedJson = await fs.readJson(path.join(tempDir, 'book.json'));
    expect(parsedJson.meta.title).toBe('Updated Integration Book Title');
  });

  it('should round-trip a BookProject without data loss', async () => {
    const project = await workspaceService.readWorkspace(tempDir);
    await workspaceService.writeWorkspace(tempDir, project);
    
    const restored = await workspaceService.readWorkspace(tempDir);
    expect(restored.meta).toEqual(project.meta);
    expect(restored.chapters[0]!.contentMarkdown.trim()).toEqual(project.chapters[0]!.contentMarkdown.trim());
  });

  it('should store and retrieve a project from the local database', async () => {
    const project = await workspaceService.readWorkspace(tempDir);
    db.upsertProject(project, tempDir);

    const retrieved = db.getProjectById(project.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.title).toBe('Updated Integration Book Title');
    expect(retrieved!.folderPath).toBe(tempDir);
  });

  it('should build a PDF from a fixture BookProject', async () => {
    const project = await workspaceService.readWorkspace(tempDir);
    const outputDir = path.join(tempDir, 'dist');
    await fs.ensureDir(outputDir);

    const result = await buildBook({
      project,
      target: 'pdf-trade',
      outputDir,
      workspaceDir: tempDir,
    });

    if (!result.success) {
      console.error('PDF Build Failure Error:', result.error);
      console.error('PDF Build Validation Report:', JSON.stringify(result.validation, null, 2));
    }

    expect(result.success).toBe(true);
    expect(result.outputPath).toBeDefined();
    expect(fs.existsSync(result.outputPath)).toBe(true);

    const pdfBuffer = await fs.readFile(result.outputPath);
    expect(pdfBuffer.slice(0, 4).toString()).toBe('%PDF');
  }, 30000); // 30s timeout for Puppeteer compile

  it('should build an EPUB from a fixture BookProject', async () => {
    const project = await workspaceService.readWorkspace(tempDir);
    const outputDir = path.join(tempDir, 'dist');
    await fs.ensureDir(outputDir);

    const result = await buildBook({
      project,
      target: 'epub-standard',
      outputDir,
      workspaceDir: tempDir,
    });

    if (!result.success) {
      console.error('EPUB Build Failure Error:', result.error);
      console.error('EPUB Build Validation Report:', JSON.stringify(result.validation, null, 2));
    }

    expect(result.success).toBe(true);
    expect(result.outputPath).toBeDefined();
    expect(fs.existsSync(result.outputPath)).toBe(true);
    expect(path.extname(result.outputPath)).toBe('.epub');
    
    const stats = await fs.stat(result.outputPath);
    expect(stats.size).toBeGreaterThan(1000);
  }, 20000); // 20s timeout

  it('should optimize an asset and generate all 4 image variants', async () => {
    const inputImage = path.join(tempDir, 'images', 'sample-300dpi.png');
    const outputDir = path.join(tempDir, 'assets', '.variants', 'asset-img-1');
    await fs.ensureDir(outputDir);

    const variants = await optimizeImage(inputImage, outputDir);
    expect(variants.thumbnail).toBeDefined();
    expect(variants.mobile).toBeDefined();
    expect(variants.print).toBeDefined();

    expect(fs.existsSync(variants.thumbnail!)).toBe(true);
    expect(fs.existsSync(variants.mobile!)).toBe(true);
    expect(fs.existsSync(variants.print!)).toBe(true);
  }, 10000);
});
