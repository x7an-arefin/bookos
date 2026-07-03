import fs from 'fs-extra';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

async function run() {
  const iconsDir = path.join(dirname, 'icons');
  await fs.ensureDir(iconsDir);

  const basePng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  // Write placeholder PNG to all target extensions (suitable for placeholder development)
  await sharp(basePng).resize(512, 512).png().toFile(path.join(dirname, 'icon.ico'));
  await sharp(basePng).resize(512, 512).png().toFile(path.join(dirname, 'icon.icns'));
  await sharp(basePng).resize(512, 512).png().toFile(path.join(iconsDir, '512x512.png'));

  console.log('Build placeholder icons generated successfully.');
}

run().catch(console.error);
