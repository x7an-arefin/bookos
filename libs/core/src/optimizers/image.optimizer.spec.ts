import { optimizeImage, getImageMetadata, optimizeAllAssets } from './image.optimizer.js';
import { BookProject } from '../types/book.types.js';
import fs from 'fs-extra';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const targetFilename = fileURLToPath(import.meta.url);
const targetDirname = path.dirname(targetFilename);

describe('Image Optimizer Module', () => {
  const fixturesDir = path.join(targetDirname, '..', '..', '__fixtures__', 'images');
  const testOutputDir = path.join(targetDirname, '..', '..', 'test-output-images');
  
  const pngFixturePath = path.join(fixturesDir, 'sample_300dpi.png');
  const jpgFixturePath = path.join(fixturesDir, 'sample_72dpi.jpg');

  async function createTestImage(filePath: string, width: number, height: number, dpi: number, format: 'png' | 'jpeg') {
    await fs.ensureDir(path.dirname(filePath));
    const basePng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    if (format === 'png') {
      await sharp(basePng)
        .resize(width, height)
        .png()
        .withMetadata({ density: dpi })
        .toFile(filePath);
    } else {
      await sharp(basePng)
        .resize(width, height)
        .jpeg()
        .withMetadata({ density: dpi })
        .toFile(filePath);
    }
  }

  let consoleWarnSpy: jest.SpyInstance;

  beforeAll(async () => {
    sharp.cache(false);
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await fs.ensureDir(fixturesDir);
    await fs.ensureDir(testOutputDir);
    
    // Generate the test fixtures dynamically
    await createTestImage(pngFixturePath, 1000, 1500, 300, 'png');
    await createTestImage(jpgFixturePath, 400, 600, 72, 'jpeg');
  });

  afterAll(async () => {
    consoleWarnSpy.mockRestore();
    await fs.remove(fixturesDir);
    await fs.remove(testOutputDir);
  });

  it('should correctly extract metadata using getImageMetadata', async () => {
    const pngMeta = await getImageMetadata(pngFixturePath);
    expect(pngMeta.width).toBe(1000);
    expect(pngMeta.height).toBe(1500);
    expect(pngMeta.dpi).toBe(300);
    expect(pngMeta.format).toBe('png');
    expect(pngMeta.sizeBytes).toBeGreaterThan(0);

    const jpgMeta = await getImageMetadata(jpgFixturePath);
    expect(jpgMeta.width).toBe(400);
    expect(jpgMeta.height).toBe(600);
    expect(jpgMeta.dpi).toBe(72);
    expect(jpgMeta.format).toBe('jpeg');
  });

  it('should throw a descriptive error for non-existent image paths', async () => {
    const fakePath = path.join(fixturesDir, 'non_existent_image.png');
    await expect(getImageMetadata(fakePath)).rejects.toThrow('Image file does not exist');
    await expect(optimizeImage(fakePath, testOutputDir)).rejects.toThrow('Source image file does not exist');
  });

  it('should generate thumbnail, mobile, and print variants for a 300 DPI image', async () => {
    const result = await optimizeImage(pngFixturePath, testOutputDir);

    expect(fs.existsSync(result.thumbnail)).toBe(true);
    expect(fs.existsSync(result.mobile)).toBe(true);
    expect(fs.existsSync(result.print)).toBe(true);

    // Verify thumbnail is WebP and width is 300px
    const thumbMeta = await sharp(result.thumbnail).metadata();
    expect(thumbMeta.format).toBe('webp');
    expect(thumbMeta.width).toBe(300);

    // Verify mobile is JPEG and smaller in size than original
    const mobileMeta = await sharp(result.mobile).metadata();
    expect(mobileMeta.format).toBe('jpeg');
    
    // Pixel-based calculation check: 1000px / 300 DPI * 72 DPI = 240px width
    expect(mobileMeta.width).toBe(240);

    // Verify print is JPEG with original resolution
    const printMeta = await sharp(result.print).metadata();
    expect(printMeta.format).toBe('jpeg');
    expect(printMeta.width).toBe(1000);
  });

  it('should batch optimize assets for a project via optimizeAllAssets', async () => {
    const project: BookProject = {
      id: 'test-project-images',
      meta: { title: 'Test Book', author: 'Author', language: 'en' },
      config: { global: {}, targets: {}, activeTheme: 'default' },
      frontMatterSections: [],
      chapters: [],
      backMatterSections: [],
      assets: [
        {
          id: 'asset-img-1',
          filename: 'sample_300dpi.png',
          localPath: pngFixturePath,
          mimeType: 'image/png',
          sizeBytes: 100
        },
        {
          id: 'asset-img-2',
          filename: 'sample_72dpi.jpg',
          localPath: jpgFixturePath,
          mimeType: 'image/jpeg',
          sizeBytes: 100
        }
      ],
      exportHistory: [],
      createdAt: '',
      updatedAt: ''
    };

    const progressCallback = jest.fn();
    const optimizedProject = await optimizeAllAssets(project, testOutputDir, progressCallback);

    expect(progressCallback).toHaveBeenCalled();
    expect(optimizedProject.assets[0]!.variants).toBeDefined();
    expect(optimizedProject.assets[1]!.variants).toBeDefined();

    expect(fs.existsSync(optimizedProject.assets[0]!.variants!.thumbnail)).toBe(true);
    expect(fs.existsSync(optimizedProject.assets[1]!.variants!.thumbnail)).toBe(true);
  });
});
