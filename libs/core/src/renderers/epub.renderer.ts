import path from 'path';
import fs from 'fs-extra';
import fontkit from 'fontkit';
import { exec } from 'child_process';
import util from 'util';
import { ZipArchive } from 'archiver';
import { BuildOptions, ValidationReport, ValidationItem, ValidationSeverity } from '../types/book.types.js';
import { processMarkdown } from '../ast/pipeline.js';
import { optimizeImage } from '../optimizers/image.optimizer.js';
import { getTargetCss } from '../utils/css-injector.js';

const execPromise = util.promisify(exec);

export function stripPrintOnlyCss(css: string): string {
  // Strip @page block overrides
  let clean = css.replace(/@page\s*(?:[^{]*)\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/gi, '');
  
  // Remove CSS rules that apply to paged media layouts
  clean = clean.replace(/break-inside\s*:\s*avoid\s*;?/gi, '');
  clean = clean.replace(/page-break-[a-z]+\s*:\s*[a-z]+\s*;?/gi, '');
  clean = clean.replace(/break-before\s*:\s*[a-z]+\s*;?/gi, '');
  clean = clean.replace(/break-after\s*:\s*[a-z]+\s*;?/gi, '');
  clean = clean.replace(/float\s*:\s*footnote\s*;?/gi, '');
  clean = clean.replace(/string-set\s*:[^;]+;?/gi, '');
  clean = clean.replace(/content\s*:\s*counter\([^)]+\)\s*;?/gi, '');
  
  return clean.trim();
}

async function isFontEmbeddable(fontPath: string): Promise<boolean> {
  try {
    const font = await fontkit.open(fontPath);
    if (font.os2 && font.os2.fsType) {
      const restricted = font.os2.fsType.restrictedLicense;
      if (restricted) return false;
    }
    return true;
  } catch (err) {
    console.warn(`Failed to inspect font license for ${fontPath}: ${err}`);
    return true;
  }
}

async function runEpubCheck(epubPath: string): Promise<ValidationReport> {
  const report: ValidationReport = {
    errors: [],
    warnings: [],
    info: [],
    isValid: true
  };

  try {
    // Check if epubcheck is available via npx without install
    const { stdout, stderr } = await execPromise(`npx --no-install epubcheck "${epubPath}"`);
    const output = stdout + stderr;
    
    // Parse EpubCheck outputs
    const lines = output.split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^(ERROR|WARNING|INFO)\(([^)]+)\):\s*([^:]+)\(([^)]+)\):\s*(.*)/) ||
                    line.match(/^(ERROR|WARNING|INFO)\(([^)]+)\):\s*(.*)/);
      if (match) {
        const severity = match[1]!.toLowerCase() as ValidationSeverity;
        const code = match[2]!;
        const message = match[5] || match[3] || line;
        
        const item: ValidationItem = {
          severity,
          code,
          message: message.trim()
        };

        if (severity === 'error') {
          report.errors.push(item);
          report.isValid = false;
        } else if (severity === 'warning') {
          report.warnings.push(item);
        } else {
          report.info.push(item);
        }
      }
    }
  } catch (err: any) {
    const output = (err.stdout || '') + (err.stderr || '') + (err.message || '');
    if (output.includes('not found') || output.includes('cannot find') || output.includes('ENOENT')) {
      // EpubCheck executable not installed/configured globally, fail gracefully
      return report;
    }

    const lines = output.split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^(ERROR|WARNING|INFO)\(([^)]+)\):\s*([^:]+)\(([^)]+)\):\s*(.*)/) ||
                    line.match(/^(ERROR|WARNING|INFO)\(([^)]+)\):\s*(.*)/);
      if (match) {
        const severity = match[1]!.toLowerCase() as ValidationSeverity;
        const code = match[2]!;
        const message = match[5] || match[3] || line;
        
        const item: ValidationItem = {
          severity,
          code,
          message: message.trim()
        };

        if (severity === 'error') {
          report.errors.push(item);
          report.isValid = false;
        } else if (severity === 'warning') {
          report.warnings.push(item);
        } else {
          report.info.push(item);
        }
      }
    }
  }

  return report;
}

export async function renderEPUB(options: BuildOptions): Promise<{ epubPath: string; report: ValidationReport }> {
  const { project, target, outputDir, onProgress } = options;

  onProgress?.(10, 'Initializing EPUB packaging workspace...');
  const tempDir = path.join(outputDir, `epub-temp-${project.id}`);
  await fs.ensureDir(tempDir);
  await fs.ensureDir(path.join(tempDir, 'META-INF'));
  await fs.ensureDir(path.join(tempDir, 'OEBPS'));
  await fs.ensureDir(path.join(tempDir, 'OEBPS', 'content'));
  await fs.ensureDir(path.join(tempDir, 'OEBPS', 'fonts'));
  await fs.ensureDir(path.join(tempDir, 'OEBPS', 'images'));

  const lang = project.meta.language || 'en';

  // 1. mimetype (MUST be stored first, uncompressed)
  const mimetypeContent = 'application/epub+zip';
  
  // 2. META-INF/container.xml
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

  // 3. CSS stylesheet filter
  onProgress?.(25, 'Filtering print-only CSS templates...');
  // Read core/theme css stylesheet
  // For EPUB target we load kindle or standard epub css based on target name
  const rawCss = getTargetCss(target, project, outputDir);
  const epubCss = stripPrintOnlyCss(rawCss);
  await fs.writeFile(path.join(tempDir, 'OEBPS', 'style.css'), epubCss);

  // 4. Chapter processing loop (Markdown to XHTML conversion)
  onProgress?.(45, 'Compiling XHTML documents...');
  const allSections = [
    ...project.frontMatterSections.map(s => ({ ...s, type: s.frontMatter?.type || 'frontmatter' })),
    ...project.chapters.map(s => ({ ...s, type: s.frontMatter?.type || 'normal' })),
    ...project.backMatterSections.map(s => ({ ...s, type: s.frontMatter?.type || 'backmatter' }))
  ];

  const processedChapters: {
    id: string;
    filename: string;
    title: string;
    type: string;
    h2s: { title: string; id: string }[];
  }[] = [];

  for (let i = 0; i < allSections.length; i++) {
    const sect = allSections[i]!;
    const padIndex = String(i + 1).padStart(3, '0');
    const filename = `ch${padIndex}.xhtml`;

    let chapterHtml = await processMarkdown(sect.contentMarkdown, sect.frontMatter || {}, 'epub');

    // Extract H2 headings and assign unique IDs to them for nav.xhtml navigation mapping
    let h2Count = 0;
    const h2s: { title: string; id: string }[] = [];
    chapterHtml = chapterHtml.replace(/<h2>(.*?)<\/h2>/g, (_, title) => {
      const cleanTitle = title.replace(/<[^>]+>/g, '').trim();
      const id = `h2-${h2Count++}`;
      h2s.push({ title: cleanTitle, id });
      return `<h2 id="${id}">${title}</h2>`;
    });

    // XHTML skeleton wrap
    const xhtmlSkeleton = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}" lang="${lang}">
<head>
  <meta charset="utf-8" />
  <title>${sect.title}</title>
  <link rel="stylesheet" type="text/css" href="../style.css" />
</head>
<body>
  ${chapterHtml}
</body>
</html>`;

    await fs.writeFile(path.join(tempDir, 'OEBPS', 'content', filename), xhtmlSkeleton);
    processedChapters.push({
      id: sect.id,
      filename,
      title: sect.title,
      type: sect.type,
      h2s
    });
  }

  // 5. Font embedding
  onProgress?.(65, 'Embedding fonts...');
  const embeddedFontFiles: string[] = [];
  const fontAssets = project.assets.filter(a => a.mimeType?.startsWith('font/') || a.localPath?.endsWith('.otf') || a.localPath?.endsWith('.ttf'));
  
  for (const font of fontAssets) {
    if (await isFontEmbeddable(font.localPath)) {
      const destPath = path.join(tempDir, 'OEBPS', 'fonts', font.filename);
      try {
        await fs.copy(font.localPath, destPath);
        embeddedFontFiles.push(font.filename);
      } catch (err) {
        console.warn(`Failed to copy font asset ${font.filename} into EPUB structure: ${err}`);
      }
    } else {
      console.warn(`Font asset "${font.filename}" has restrictive embedding license. Falling back to system fonts.`);
    }
  }

  // 6. Image assets copies and path rewrites
  onProgress?.(75, 'Embedding and optimizing image assets...');
  const embeddedImageFiles: { filename: string; mimeType: string }[] = [];
  const imageAssets = project.assets.filter(a => a.mimeType?.startsWith('image/'));

  for (const img of imageAssets) {
    // Generate mobile optimized variant (as per EPUB requirements)
    const variants = await optimizeImage(img.localPath, path.join(tempDir, 'OEBPS', 'images'));
    const mobileFilename = path.basename(variants.mobile);
    embeddedImageFiles.push({
      filename: mobileFilename,
      mimeType: img.mimeType || 'image/jpeg'
    });

    // Update references in all processed XHTML files
    const targetPattern = new RegExp(`(src|href)=["'](?:[^"']*/)?${img.filename}["']`, 'g');
    for (const ch of processedChapters) {
      const chPath = path.join(tempDir, 'OEBPS', 'content', ch.filename);
      if (fs.existsSync(chPath)) {
        let content = await fs.readFile(chPath, 'utf8');
        content = content.replace(targetPattern, `$1="../images/${mobileFilename}"`);
        await fs.writeFile(chPath, content);
      }
    }
  }

  // 7. Navigation document (OEBPS/nav.xhtml)
  let navTocItems = '';
  let navLandmarks = '';

  for (const ch of processedChapters) {
    navTocItems += `      <li>\n        <a href="content/${ch.filename}">${ch.title}</a>\n`;
    if (ch.h2s.length > 0) {
      navTocItems += '        <ol>\n';
      for (const h2 of ch.h2s) {
        navTocItems += `          <li><a href="content/${ch.filename}#${h2.id}">${h2.title}</a></li>\n`;
      }
      navTocItems += '        </ol>\n';
    }
    navTocItems += '      </li>\n';

    // Build Landmarks entries
    if (ch.type === 'frontmatter' && ch.title.toLowerCase().includes('toc')) {
      navLandmarks += `      <li><a epub:type="toc" href="content/${ch.filename}">Table of Contents</a></li>\n`;
    } else if (ch.type === 'frontmatter' && ch.title.toLowerCase().includes('cover')) {
      navLandmarks += `      <li><a epub:type="cover" href="content/${ch.filename}">Cover</a></li>\n`;
    } else if (ch.type === 'normal' && !navLandmarks.includes('epub:type="bodymatter"')) {
      navLandmarks += `      <li><a epub:type="bodymatter" href="content/${ch.filename}">Start of Content</a></li>\n`;
    }
  }

  const navXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}" lang="${lang}">
<head>
  <title>Navigation</title>
  <meta charset="utf-8" />
  <link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol>
${navTocItems}    </ol>
  </nav>
  <nav epub:type="landmarks" id="landmarks" hidden="hidden">
    <h2>Landmarks</h2>
    <ol>
      <li><a epub:type="toc" href="nav.xhtml">Table of Contents</a></li>
${navLandmarks}    </ol>
  </nav>
</body>
</html>`;
  await fs.writeFile(path.join(tempDir, 'OEBPS', 'nav.xhtml'), navXhtml);

  // 8. Legacy NCX (OEBPS/toc.ncx)
  let ncxNavMap = '';
  let playOrder = 1;
  for (const ch of processedChapters) {
    ncxNavMap += `    <navPoint id="navpoint-${ch.id}" playOrder="${playOrder++}">\n`;
    ncxNavMap += `      <navLabel>\n        <text>${ch.title}</text>\n      </navLabel>\n`;
    ncxNavMap += `      <content src="content/${ch.filename}"/>\n`;
    if (ch.h2s.length > 0) {
      for (const h2 of ch.h2s) {
        ncxNavMap += `      <navPoint id="navpoint-${ch.id}-${h2.id}" playOrder="${playOrder++}">\n`;
        ncxNavMap += `        <navLabel>\n          <text>${h2.title}</text>\n        </navLabel>\n`;
        ncxNavMap += `        <content src="content/${ch.filename}#${h2.id}"/>\n`;
        ncxNavMap += `      </navPoint>\n`;
      }
    }
    ncxNavMap += '    </navPoint>\n';
  }

  const tocNcx = `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${project.id}"/>
    <meta name="dtb:depth" content="2"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${project.meta.title}</text>
  </docTitle>
  <navMap>
${ncxNavMap}  </navMap>
</ncx>`;
  await fs.writeFile(path.join(tempDir, 'OEBPS', 'toc.ncx'), tocNcx);

  // 9. IDPF Manifest XML (OEBPS/content.opf)
  let manifestItems = '';
  let spineItems = '';
  
  for (const ch of processedChapters) {
    manifestItems += `    <item id="${ch.id}" href="content/${ch.filename}" media-type="application/xhtml+xml"/>\n`;
    spineItems += `    <itemref idref="${ch.id}"/>\n`;
  }

  for (let i = 0; i < embeddedFontFiles.length; i++) {
    const f = embeddedFontFiles[i]!;
    const ext = path.extname(f).toLowerCase();
    const mime = ext === '.otf' ? 'application/vnd.ms-opentype' : 
                 (ext === '.woff' ? 'font/woff' : (ext === '.woff2' ? 'font/woff2' : 'application/x-font-ttf'));
    manifestItems += `    <item id="font-${i}" href="fonts/${f}" media-type="${mime}"/>\n`;
  }

  for (let i = 0; i < embeddedImageFiles.length; i++) {
    const img = embeddedImageFiles[i]!;
    manifestItems += `    <item id="img-${i}" href="images/${img.filename}" media-type="${img.mimeType}"/>\n`;
  }

  const contentOpf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:${project.id}</dc:identifier>
    <dc:title>${project.meta.title}</dc:title>
    <dc:creator id="creator">${project.meta.author}</dc:creator>
    <dc:language>${lang}</dc:language>
    <dc:publisher>${project.meta.publisher || 'BookOS'}</dc:publisher>
    <dc:date>${project.meta.publicationDate || new Date().toISOString()}</dc:date>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="style.css" media-type="text/css"/>
${manifestItems}  </manifest>
  <spine toc="ncx">
${spineItems}  </spine>
  <guide>
    <reference type="toc" title="Table of Contents" href="nav.xhtml"/>
  </guide>
</package>`;
  await fs.writeFile(path.join(tempDir, 'OEBPS', 'content.opf'), contentOpf);

  // 10. Archive packaging
  onProgress?.(85, 'Assembling ZIP container structure...');
  const epubPath = path.join(outputDir, `${project.id}-${target}.epub`);
  const outputStream = fs.createWriteStream(epubPath);
  const archive = new ZipArchive({ zlib: { level: 9 } });

  await new Promise<void>((resolve, reject) => {
    outputStream.on('close', () => resolve());
    archive.on('error', (err) => reject(err));

    archive.pipe(outputStream);

    // mimetype MUST be the first file and MUST be stored uncompressed
    archive.append(mimetypeContent, { name: 'mimetype', store: true });

    // Add rest of the files recursively
    archive.append(containerXml, { name: 'META-INF/container.xml' });
    archive.append(contentOpf, { name: 'OEBPS/content.opf' });
    archive.append(navXhtml, { name: 'OEBPS/nav.xhtml' });
    archive.append(tocNcx, { name: 'OEBPS/toc.ncx' });
    archive.append(epubCss, { name: 'OEBPS/style.css' });

    for (const ch of processedChapters) {
      archive.file(path.join(tempDir, 'OEBPS', 'content', ch.filename), { name: `OEBPS/content/${ch.filename}` });
    }
    for (const f of embeddedFontFiles) {
      archive.file(path.join(tempDir, 'OEBPS', 'fonts', f), { name: `OEBPS/fonts/${f}` });
    }
    for (const img of embeddedImageFiles) {
      archive.file(path.join(tempDir, 'OEBPS', 'images', img.filename), { name: `OEBPS/images/${img.filename}` });
    }

    archive.finalize();
  });

  // 11. Cleanup temporary directories
  try {
    await fs.remove(tempDir);
  } catch (err) {
    console.warn(`Failed to clean up temporary build directory ${tempDir}: ${err}`);
  }

  // 12. Run EPUBCheck validation
  onProgress?.(95, 'Validating output archive via EPUBCheck...');
  const report = await runEpubCheck(epubPath);

  onProgress?.(100, 'EPUB compiled successfully!');
  return {
    epubPath,
    report
  };
}
