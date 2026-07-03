import path from 'path';
import fs from 'fs-extra';
import puppeteer from 'puppeteer';
import bwipjs from 'bwip-js';
import { BuildOptions, BookProject, LayoutTarget } from '../types/book.types.js';
import { processMarkdown } from '../ast/pipeline.js';
import { getTargetCss } from '../utils/css-injector.js';

interface TocEntry {
  id: string;
  title: string;
  pageNumber: string;
}

export function generateTocPage(entries: TocEntry[], project: BookProject): string {
  let html = `<section class="toc-page" id="toc-section" style="break-before: page; break-after: page;">\n`;
  html += `  <h1 class="toc-title" style="text-align: center; margin-bottom: 2em; margin-top: 1.5in;">Table of Contents</h1>\n`;
  html += `  <div class="toc-list" style="max-width: 80%; margin: 0 auto; line-height: 2;">\n`;
  
  for (const entry of entries) {
    // Skip TOC itself if present
    if (entry.id.includes('toc')) continue;
    
    html += `    <div class="toc-entry" style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5em;">\n`;
    html += `      <span class="toc-entry-title" style="font-weight: bold;">${entry.title}</span>\n`;
    html += `      <span class="toc-entry-leader" style="flex-grow: 1; border-bottom: 1px dotted #888; margin: 0 10px; position: relative; top: -4px;"></span>\n`;
    html += `      <span class="toc-entry-page" style="font-variant-numeric: tabular-nums;">${entry.pageNumber}</span>\n`;
    html += `    </div>\n`;
  }
  
  html += `  </div>\n`;
  html += `</section>\n`;
  return html;
}

async function generateISBNBarcode(isbn: string): Promise<string> {
  const cleanIsbn = isbn.replace(/[- ]/g, '');
  const bcid = cleanIsbn.length === 13 ? 'ean13' : 'isbn';
  return bwipjs.toSVG({
    bcid,
    text: cleanIsbn,
    scale: 2,
    height: 12,
    includetext: true,
    textalign: 'center',
  });
}

export function buildHtmlScaffold(project: BookProject, css: string, bodyHtml: string, targetConfig: LayoutTarget): string {
  const lang = project.meta.language || 'en';
  const author = project.meta.author || '';
  const title = project.meta.title || '';
  
  let colorProfileMeta = '';
  if (targetConfig.printBleed) {
    colorProfileMeta = '  <meta name="color-profile" content="USWebCoatedSWOP.icc" />\n';
  }

  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${lang}" lang="${lang}">
<head>
  <meta charset="utf-8" />
  <meta name="author" content="${author}" />
  ${colorProfileMeta}  <title>${title}</title>
  <style>
    ${css}
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
}

async function aggregateChapters(
  project: BookProject,
  chaptersToCompress: string[],
  target: 'print' | 'epub' | 'preview',
  onProgress?: (percent: number, msg: string) => void
): Promise<{ id: string; html: string; title: string; type: string }[]> {
  const chaptersList: { id: string; html: string; title: string; type: string }[] = [];
  const totalSections = project.frontMatterSections.length + project.chapters.length + project.backMatterSections.length;
  let count = 0;

  for (const sect of project.frontMatterSections) {
    const html = await processMarkdown(sect.contentMarkdown, sect.frontMatter || {}, target);
    const type = sect.frontMatter?.type || 'frontmatter';
    chaptersList.push({ id: `fm-${sect.id}`, html, title: sect.title, type });
    count++;
    onProgress?.(10 + Math.floor((count / totalSections) * 15), `Parsing frontmatter: ${sect.title}`);
  }

  for (const sect of project.chapters) {
    const html = await processMarkdown(sect.contentMarkdown, sect.frontMatter || {}, target);
    const type = sect.frontMatter?.type || 'normal';
    chaptersList.push({ id: `ch-${sect.id}`, html, title: sect.title, type });
    count++;
    onProgress?.(10 + Math.floor((count / totalSections) * 15), `Parsing chapter: ${sect.title}`);
  }

  for (const sect of project.backMatterSections) {
    const html = await processMarkdown(sect.contentMarkdown, sect.frontMatter || {}, target);
    const type = sect.frontMatter?.type || 'backmatter';
    chaptersList.push({ id: `bm-${sect.id}`, html, title: sect.title, type });
    count++;
    onProgress?.(10 + Math.floor((count / totalSections) * 15), `Parsing backmatter: ${sect.title}`);
  }

  return chaptersList;
}

export async function renderPDF(options: BuildOptions): Promise<{ pdfPath: string; pageCount: number }> {
  const { project, target, outputDir, onProgress } = options;

  onProgress?.(5, 'Parsing layout settings...');
  const globalConfig = project.config?.global || {};
  const targetOverride = project.config?.targets?.[target] || {};

  const targetConfig = {
    ...globalConfig,
    ...targetOverride,
    margins: {
      ...(globalConfig.margins || {}),
      ...(targetOverride.margins || {}),
    },
  } as LayoutTarget;

  // 1. Compile CSS template
  let css = getTargetCss(target, project, outputDir);
  if (targetConfig.printBleed) {
    // Add print bleed and crop mark configurations to CSS
    css += `
      @page {
        marks: crop cross;
        bleed: 0.125in;
      }
    `;
  }

  // 2. Locate Paged.js polyfill
  onProgress?.(25, 'Loading Paged.js compiler dependency...');
  const searchPaths = [
    path.join(process.cwd(), 'node_modules', 'pagedjs', 'dist', 'paged.polyfill.js'),
    path.join(process.cwd(), '..', 'node_modules', 'pagedjs', 'dist', 'paged.polyfill.js'),
    path.join(process.cwd(), '..', '..', 'node_modules', 'pagedjs', 'dist', 'paged.polyfill.js'),
  ];
  
  let pagedJsScript = '';
  for (const p of searchPaths) {
    if (fs.existsSync(p)) {
      pagedJsScript = fs.readFileSync(p, 'utf8');
      break;
    }
  }

  if (!pagedJsScript) {
    throw new Error('Could not locate paged.polyfill.js in node_modules.');
  }

  // Helper to compile HTML string from lists
  const buildJoinedHtml = (
    chaptersList: { id: string; html: string; title: string; type: string }[],
    compressedIds: string[],
    blankPageInsertionIds: string[],
    barcodeSvg: string | null,
    tocHtml: string | null
  ) => {
    let html = '';
    
    // Find index of copyright section to insert TOC after it
    let insertTocIndex = -1;
    for (let i = 0; i < chaptersList.length; i++) {
      const c = chaptersList[i]!;
      if (c.type === 'copyright' || c.id.includes('copyright') || c.title.toLowerCase().includes('copyright')) {
        insertTocIndex = i;
        break;
      }
    }
    if (insertTocIndex === -1 && chaptersList.length > 0) {
      insertTocIndex = 0; // fallback to after first page (typically title page)
    }

    // Determine if back cover exists
    let backCoverIndex = -1;
    for (let i = 0; i < chaptersList.length; i++) {
      const c = chaptersList[i]!;
      if (c.type === 'back-cover' || c.id.includes('back-cover') || c.title.toLowerCase().includes('back cover')) {
        backCoverIndex = i;
        break;
      }
    }

    for (let i = 0; i < chaptersList.length; i++) {
      const c = chaptersList[i]!;
      const isCompressed = compressedIds.includes(c.id);
      const isOddEnding = blankPageInsertionIds.includes(c.id);

      const compStyle = isCompressed ? ' style="letter-spacing: -0.015em; word-spacing: -0.02em;"' : '';
      const wrapperClass = c.type === 'frontmatter' || c.type === 'copyright' ? 'book-frontmatter' : 
                           (c.type === 'backmatter' || c.type === 'back-cover' ? 'book-backmatter' : 'book-chapter');

      let chapterHtml = `<div class="${wrapperClass}" id="${c.id}" data-chapter-id="${c.id}" data-type="${c.type}"${compStyle}>\n${c.html}\n</div>\n`;

      // If this is the back cover, inject the barcode
      if (i === backCoverIndex && barcodeSvg) {
        const barcodeHtml = `<div class="isbn-barcode-container" style="position: absolute; bottom: 0.75in; right: 1.5in; width: 2in; height: 1.2in;">\n${barcodeSvg}\n</div>\n`;
        chapterHtml = chapterHtml.replace('</div>\n$', '') + barcodeHtml + '</div>\n';
      }

      html += chapterHtml;

      // Insert blank page break simulator if chapter ended on an odd page
      if (isOddEnding && i < chaptersList.length - 1) {
        html += `<div class="page-break-insert blank-page" style="break-before: page; content: '';"></div>\n`;
      }

      // Inject TOC HTML right after copyright/first section
      if (i === insertTocIndex && tocHtml) {
        html += tocHtml;
      }
    }

    // If barcode exists but we had no back cover section, append EAN barcode to the very end
    if (barcodeSvg && backCoverIndex === -1) {
      html += `<div class="book-backmatter back-cover-barcode" style="position: relative; break-before: page; min-height: 9in;">\n`;
      html += `  <div class="isbn-barcode-container" style="position: absolute; bottom: 0.75in; right: 1.5in; width: 2in; height: 1.2in;">\n${barcodeSvg}\n</div>\n`;
      html += `</div>\n`;
    }

    return html;
  };

  // Generate ISBN Barcode
  let barcodeSvg: string | null = null;
  if (targetConfig.includeISBNBarcode && project.meta.isbn) {
    try {
      barcodeSvg = await generateISBNBarcode(project.meta.isbn);
    } catch (err) {
      console.warn(`Failed to generate ISBN EAN barcode SVG: ${err}`);
    }
  }

  // 3. Process all Markdown sources (Dry-run Pass 1)
  onProgress?.(35, 'Performing Pass 1: Chapter aggregation...');
  const chaptersList = await aggregateChapters(project, [], 'print', onProgress ? (pct, msg) => onProgress(35 + (pct - 10), msg) : undefined);

  const dryRunBody = buildJoinedHtml(chaptersList, [], [], barcodeSvg, null);
  const dryRunScaffold = buildHtmlScaffold(project, css, dryRunBody, targetConfig);

  // 4. Spin up headless Puppeteer
  onProgress?.(50, 'Spawning headless browser for layout pass...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let tocEntries: TocEntry[] = [];
  let chaptersToCompress: string[] = [];
  let chaptersEndingOnOddPage: string[] = [];

  try {
    const page = await browser.newPage();
    await page.setContent(dryRunScaffold);

    // Inject PagedConfig listener
    await page.evaluate(() => {
      (window as any).PagedConfig = {
        auto: true,
        after: () => {
          (window as any).pagedjsRendered = true;
        },
      };
    });

    // Run Paged.js polyfill
    await page.addScriptTag({ content: pagedJsScript });

    // Wait for layout rendering
    await page.waitForFunction(() => (window as any).pagedjsRendered === true, {
      timeout: 60000,
    });

    // Pass 1 evaluations: Trailing space compression + blank-page triggers + page mappings for TOC
    onProgress?.(70, 'Evaluating layout parameters, orphans, and page lengths...');
    const evaluations = await page.evaluate(() => {
      const entries: TocEntry[] = [];
      const compress: string[] = [];
      const oddEndings: string[] = [];

      // Find all h1 headers to build TOC mapping
      const headings = document.querySelectorAll('.pagedjs_pages h1');
      const processedChapterIds = new Set<string>();

      headings.forEach(h => {
        const pageEl = h.closest('.pagedjs_page');
        if (!pageEl) return;

        const pageNumAttr = pageEl.getAttribute('data-page-number');
        const pageNum = pageNumAttr ? parseInt(pageNumAttr, 10) : 1;

        const marginBox = pageEl.querySelector('.pagedjs_margin-bottom-center .pagedjs_margin-content');
        const pageText = marginBox ? marginBox.textContent?.trim() : String(pageNum);

        let originalId = '';
        let current: Element | null = h;
        while (current) {
          if (current.id && (current.id.startsWith('fm-') || current.id.startsWith('ch-') || current.id.startsWith('bm-'))) {
            originalId = current.id;
            break;
          }
          current = current.parentElement;
        }

        if (originalId && !processedChapterIds.has(originalId)) {
          processedChapterIds.add(originalId);
          entries.push({
            id: originalId,
            title: h.textContent?.trim() || '',
            pageNumber: pageText || String(pageNum),
          });
        }
      });

      // Calculate trailing space and odd page endings
      processedChapterIds.forEach(id => {
        const chapterPages = Array.from(document.querySelectorAll('.pagedjs_page')).filter(page => page.querySelector(`#${id}`));
        if (chapterPages.length === 0) return;

        const lastPage = chapterPages[chapterPages.length - 1]!;
        
        const pageNumAttr = lastPage.getAttribute('data-page-number');
        const pageNum = pageNumAttr ? parseInt(pageNumAttr, 10) : 1;
        if (pageNum % 2 !== 0) {
          oddEndings.push(id);
        }

        // Bounding rect orphan check
        const lastP = lastPage.querySelector('p:last-of-type');
        if (lastP) {
          const pRect = lastP.getBoundingClientRect();
          const contentArea = lastPage.querySelector('.pagedjs_page_content');
          if (contentArea) {
            const contentRect = contentArea.getBoundingClientRect();
            const trailingSpace = contentRect.bottom - pRect.bottom;
            if (trailingSpace > 0 && trailingSpace < 40) {
              compress.push(id);
            }
          }
        }
      });

      return { entries, compress, oddEndings };
    });

    tocEntries = evaluations.entries;
    chaptersToCompress = evaluations.compress;
    chaptersEndingOnOddPage = evaluations.oddEndings;

    for (const id of chaptersToCompress) {
      console.log(`[Micro-compression Applied] Chapter "${id}" compressed to avoid orphan lines.`);
    }
  } finally {
    await browser.close();
  }

  // 5. Build Table of Contents XHTML Page
  let tocHtml: string | null = null;
  if (targetConfig.includeTOC && tocEntries.length > 0) {
    tocHtml = generateTocPage(tocEntries, project);
  }

  // 6. Final Render Pass (Pass 2)
  onProgress?.(80, 'Performing Pass 2: Final XHTML rendering with TOC and page spacing adjustments...');
  const finalBody = buildJoinedHtml(
    chaptersList,
    chaptersToCompress,
    chaptersEndingOnOddPage,
    barcodeSvg,
    tocHtml
  );
  
  const finalScaffold = buildHtmlScaffold(project, css, finalBody, targetConfig);

  const finalBrowser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await finalBrowser.newPage();
    await page.setContent(finalScaffold);

    await page.evaluate(() => {
      (window as any).PagedConfig = {
        auto: true,
        after: () => {
          (window as any).pagedjsRendered = true;
        },
      };
    });

    await page.addScriptTag({ content: pagedJsScript });

    await page.waitForFunction(() => (window as any).pagedjsRendered === true, {
      timeout: 60000,
    });

    onProgress?.(95, 'Writing final PDF output...');
    const pdfPath = path.join(outputDir, `${project.id}-${target}.pdf`);

    await page.pdf({
      path: pdfPath,
      printBackground: true,
      preferCSSPageSize: true,
    });

    const pageCount = await page.evaluate(() => {
      return document.querySelectorAll('.pagedjs_page').length;
    });

    onProgress?.(100, 'PDF Rendered successfully!');
    return {
      pdfPath,
      pageCount,
    };
  } finally {
    await finalBrowser.close();
  }
}
