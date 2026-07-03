import path from 'path';
import fs from 'fs-extra';
import sharp from 'sharp';
import crypto from 'crypto';
import { BookProject } from '../types/book.types.js';

export interface ImageVariants {
  original: string;
  thumbnail: string;
  mobile: string;
  print: string;
}

export interface ImageMetadata {
  width: number;
  height: number;
  dpi: number | null;
  format: string;
  sizeBytes: number;
}

export type ProgressCallback = (percent: number, message: string) => void;

export async function getImageMetadata(filePath: string): Promise<ImageMetadata> {
  if (!await fs.pathExists(filePath)) {
    throw new Error(`Image file does not exist at path: ${filePath}`);
  }

  try {
    const stat = await fs.stat(filePath);
    const meta = await sharp(filePath).metadata();
    
    if (!meta.width || !meta.height || !meta.format) {
      throw new Error(`Invalid or corrupt image file.`);
    }

    return {
      width: meta.width,
      height: meta.height,
      dpi: meta.density || null,
      format: meta.format,
      sizeBytes: stat.size
    };
  } catch (err: any) {
    throw new Error(`Failed to extract metadata for image ${filePath}: ${err.message}`);
  }
}

export async function optimizeImage(sourcePath: string, outputDir: string): Promise<ImageVariants> {
  if (!await fs.pathExists(sourcePath)) {
    throw new Error(`Source image file does not exist at path: ${sourcePath}`);
  }

  await fs.ensureDir(outputDir);
  const metadata = await getImageMetadata(sourcePath);
  const uuid = crypto.randomUUID();

  const destThumb = path.join(outputDir, `${uuid}_thumb.webp`);
  const destMobile = path.join(outputDir, `${uuid}_mobile.jpg`);
  const destPrint = path.join(outputDir, `${uuid}_print.jpg`);

  // 1. Thumbnail variant (WebP, 300px wide, quality 80)
  await sharp(sourcePath)
    .resize(300)
    .webp({ quality: 80 })
    .toFile(destThumb);

  // 2. Mobile variant (JPEG, 72 DPI equivalent, quality 80)
  const currentDpi = metadata.dpi || 72;
  const inchWidth = metadata.width / currentDpi;
  const targetWidth = Math.round(72 * inchWidth);
  const mobileWidth = Math.min(metadata.width, targetWidth);

  await sharp(sourcePath)
    .resize(mobileWidth)
    .jpeg({ quality: 80 })
    .toFile(destMobile);

  // 3. Print variant (JPEG, quality 95, no downscaling)
  if (metadata.dpi && metadata.dpi < 150) {
    await fs.copy(sourcePath, destPrint);
  } else {
    await sharp(sourcePath)
      .jpeg({ quality: 95 })
      .toFile(destPrint);
  }

  return {
    original: sourcePath,
    thumbnail: destThumb,
    mobile: destMobile,
    print: destPrint
  };
}

export async function optimizeAllAssets(
  project: BookProject,
  outputDir: string,
  onProgress?: ProgressCallback
): Promise<BookProject> {
  const images = project.assets.filter(a => a.mimeType?.startsWith('image/'));
  const total = images.length;

  if (total === 0) {
    onProgress?.(100, 'No image assets to optimize.');
    return project;
  }

  const projectCopy = JSON.parse(JSON.stringify(project)) as BookProject;

  for (let i = 0; i < total; i++) {
    const asset = projectCopy.assets.find(a => a.id === images[i]!.id)!;
    const countStr = `${i + 1}/${total}`;
    
    onProgress?.(
      Math.round((i / total) * 100),
      `Optimizing images... ${countStr}`
    );

    try {
      const variants = await optimizeImage(asset.localPath, outputDir);
      asset.variants = variants;
    } catch (err: any) {
      console.error(`Failed to optimize asset ${asset.filename}: ${err.message}`);
      asset.variants = {
        original: asset.localPath,
        thumbnail: asset.localPath,
        mobile: asset.localPath,
        print: asset.localPath
      };
    }
  }

  onProgress?.(100, 'Image asset optimization complete.');
  return projectCopy;
}
