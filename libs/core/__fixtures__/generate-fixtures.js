import fs from 'fs-extra';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

async function generate() {
  const imagesDir = path.join(dirname, 'images');
  const fontsDir = path.join(dirname, 'fonts');
  const chaptersDir = path.join(dirname, 'chapters');

  await fs.ensureDir(imagesDir);
  await fs.ensureDir(fontsDir);
  await fs.ensureDir(chaptersDir);

  // 1. Generate Images
  const basePng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  console.log('Generating image fixtures...');
  await sharp(basePng).resize(600, 900).png().withMetadata({ density: 300 }).toFile(path.join(imagesDir, 'sample-300dpi.png'));
  await sharp(basePng).resize(400, 600).jpeg().withMetadata({ density: 72 }).toFile(path.join(imagesDir, 'sample-72dpi.jpg'));
  await sharp(basePng).resize(1600, 2560).jpeg().withMetadata({ density: 300 }).toFile(path.join(imagesDir, 'sample-cover.jpg'));

  // 2. Generate Fonts
  console.log('Generating font fixtures...');
  let fontCopied = false;
  const searchFonts = [];
  if (process.platform === 'win32') {
    searchFonts.push('C:\\Windows\\Fonts\\arial.ttf');
  } else if (process.platform === 'darwin') {
    searchFonts.push('/Library/Fonts/Arial.ttf', '/System/Library/Fonts/Helvetica.dfont');
  } else {
    searchFonts.push(
      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
      '/usr/share/fonts/liberation/LiberationSans-Regular.ttf'
    );
  }

  for (const f of searchFonts) {
    if (await fs.pathExists(f)) {
      await fs.copy(f, path.join(fontsDir, 'open-sans-mock.ttf'));
      await fs.copy(f, path.join(fontsDir, 'restricted-mock.ttf'));
      fontCopied = true;
      break;
    }
  }

  if (!fontCopied) {
    await fs.writeFile(path.join(fontsDir, 'open-sans-mock.ttf'), 'mock ttf data');
    await fs.writeFile(path.join(fontsDir, 'restricted-mock.ttf'), 'mock ttf data');
  }

  console.log('Fixtures generated successfully!');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
