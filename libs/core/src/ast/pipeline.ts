import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import remarkSmartypants from 'remark-smartypants';
import rehypeStringify from 'rehype-stringify';
import matter from 'gray-matter';
import { visit, SKIP } from 'unist-util-visit';
import { Root, Element, Text } from 'hast';
import { ChapterFrontMatter } from '../types/book.types.js';

// Preprocess footnote markers to simple tokens that will not get escaped by markdown parsers
export function preprocessFootnotes(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const cleanLines: string[] = [];
  
  let currentRef: string | null = null;
  let currentText = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const defMatch = line.match(/^\[\^([^\]]+)\]:\s*(.*)/);
    if (defMatch) {
      if (currentRef) {
        cleanLines.push(`[[fndef:${currentRef}:${currentText.trim()}]]`);
      }
      currentRef = defMatch[1]!;
      currentText = defMatch[2]!;
    } else if (currentRef !== null) {
      if (line.trim() === '') {
        cleanLines.push(`[[fndef:${currentRef}:${currentText.trim()}]]`);
        currentRef = null;
        currentText = '';
        cleanLines.push(line);
      } else {
        currentText += '\n' + line;
      }
    } else {
      cleanLines.push(line);
    }
  }
  
  if (currentRef) {
    cleanLines.push(`[[fndef:${currentRef}:${currentText.trim()}]]`);
  }
  
  let processedMarkdown = cleanLines.join('\n');
  const refRegex = /\[\^([^\]]+)\]/g;
  processedMarkdown = processedMarkdown.replace(refRegex, (match, ref) => {
    return `[[fnref:${ref}]]`;
  });
  
  return processedMarkdown;
}

// Custom rehype plugin to transform footnote tokens to final elements
function rehypeFootnotePlugin(options: { targetType: 'print' | 'epub' | 'preview' }) {
  return (tree: Root) => {
    const definitions = new Map<string, string>();
    
    // Pass 1: Extract and remove definitions
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName === 'p' && parent && index !== undefined) {
        const firstChild = node.children[0];
        if (firstChild && firstChild.type === 'text') {
          const match = firstChild.value.match(/^\[\[fndef:([^:]+):([\s\S]*)\]\]$/);
          if (match) {
            const ref = match[1]!;
            const content = match[2]!;
            definitions.set(ref, content);
            
            parent.children.splice(index, 1);
            return index; // return current index to check the newly shifted element
          }
        }
      }
      return undefined;
    });

    // Pass 2: Inline refs replacement
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'pre' || node.tagName === 'code') return;

      const newChildren: any[] = [];
      for (const child of node.children) {
        if (child.type === 'text') {
          const text = child.value;
          const fnrefRegex = /\[\[fnref:([^\]]+)\]\]/g;
          
          let lastIndex = 0;
          let match;
          
          while ((match = fnrefRegex.exec(text)) !== null) {
            const ref = match[1]!;
            const matchIndex = match.index;
            
            if (matchIndex > lastIndex) {
              newChildren.push({ type: 'text', value: text.substring(lastIndex, matchIndex) });
            }
            
            const def = definitions.get(ref) || '';
            
            if (options.targetType === 'print') {
              newChildren.push({
                type: 'element',
                tagName: 'aside',
                properties: { className: ['footnote'], dataRef: ref },
                children: [{ type: 'text', value: def }]
              });
            } else if (options.targetType === 'epub') {
              newChildren.push({
                type: 'element',
                tagName: 'a',
                properties: { id: `fnref-${ref}`, 'epub:type': 'noteref', href: `#fn-${ref}` },
                children: [{ type: 'text', value: ref }]
              });
            } else {
              newChildren.push({
                type: 'element',
                tagName: 'span',
                properties: { className: ['footnote-tooltip'], dataTooltip: def },
                children: [{
                  type: 'element',
                  tagName: 'sup',
                  children: [{ type: 'text', value: `[${ref}]` }]
                }]
              });
            }
            
            lastIndex = fnrefRegex.lastIndex;
          }
          
          if (lastIndex < text.length) {
            newChildren.push({ type: 'text', value: text.substring(lastIndex) });
          }
        } else {
          newChildren.push(child);
        }
      }
      node.children = newChildren;
    });

    // Pass 3: Append footnotes section for EPUB
    if (options.targetType === 'epub' && definitions.size > 0) {
      const footnoteItems: Element[] = [];
      for (const [ref, def] of definitions.entries()) {
        footnoteItems.push({
          type: 'element',
          tagName: 'li',
          properties: { id: `fn-${ref}` },
          children: [
            {
              type: 'element',
              tagName: 'aside',
              properties: { 'epub:type': 'footnote' },
              children: [
                {
                  type: 'element',
                  tagName: 'p',
                  properties: {},
                  children: [
                    { type: 'text', value: def + ' ' },
                    {
                      type: 'element',
                      tagName: 'a',
                      properties: { href: `#fnref-${ref}`, 'epub:type': 'backlink' },
                      children: [{ type: 'text', value: '↩' }]
                    }
                  ]
                }
              ]
            }
          ]
        });
      }

      const footnotesSection: Element = {
        type: 'element',
        tagName: 'section',
        properties: { className: ['footnotes'], 'epub:type': 'footnotes' },
        children: [
          { type: 'element', tagName: 'hr', properties: {}, children: [] },
          {
            type: 'element',
            tagName: 'ol',
            properties: {},
            children: footnoteItems
          }
        ]
      };

      tree.children.push(footnotesSection);
    }
  };
}

function dropCapPlugin(options: { dropCap?: boolean; chapterType?: string }) {
  return (tree: Root) => {
    if (options.dropCap !== true) return;
    if (options.chapterType !== 'normal' && options.chapterType !== 'part-opener' && options.chapterType !== undefined) return;

    let foundFirstP = false;
    visit(tree, 'element', (node: Element) => {
      if (foundFirstP) return;
      if (node.tagName === 'p') {
        foundFirstP = true;
        const firstChild = node.children[0];
        if (firstChild && firstChild.type === 'text') {
          const textNode = firstChild as Text;
          const text = textNode.value;
          if (text.length > 0) {
            const firstChar = text[0]!;
            let remainingText = text.substring(1);
            
            if (['"', "'", '“', '‘', '«', '‹'].includes(firstChar)) {
              if (text.length > 1) {
                const nextChar = text[1]!;
                remainingText = text.substring(2);
                
                const dropCapSpan: Element = {
                  type: 'element',
                  tagName: 'span',
                  properties: { className: ['drop-cap'] },
                  children: [{ type: 'text', value: nextChar }]
                };
                
                node.children = [
                  { type: 'text', value: firstChar },
                  dropCapSpan,
                  { type: 'text', value: remainingText },
                  ...node.children.slice(1)
                ];
              }
            } else {
              const dropCapSpan: Element = {
                type: 'element',
                tagName: 'span',
                properties: { className: ['drop-cap'] },
                children: [{ type: 'text', value: firstChar }]
              };
              
              node.children = [
                dropCapSpan,
                { type: 'text', value: remainingText },
                ...node.children.slice(1)
              ];
            }
          }
        }
      }
    });
  };
}

function linkTransformerPlugin(options: { targetType: 'print' | 'epub' | 'preview' }) {
  return (tree: Root) => {
    if (options.targetType !== 'print') return;

    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName === 'a' && parent && index !== undefined) {
        const href = node.properties?.href;
        if (typeof href === 'string') {
          if (href.startsWith('#')) return;

          const urlSpan: Element = {
            type: 'element',
            tagName: 'span',
            properties: { className: ['url-display'] },
            children: [{ type: 'text', value: ` (${href})` }]
          };
          
          if (node.properties) {
            delete node.properties.href;
          }

          parent.children.splice(index + 1, 0, urlSpan);
        }
      }
    });
  };
}

function bidiDetectorPlugin() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'span' && 
          (node.properties?.className as string[] || []).some(c => c === 'rtl-text' || c === 'cjk-text')) {
        return SKIP;
      }
      if (node.tagName === 'pre' || node.tagName === 'code') return undefined;

      const newChildren: any[] = [];
      for (const child of node.children) {
        if (child.type === 'text') {
          const text = child.value;
          let currentType: 'normal' | 'rtl' | 'cjk' = 'normal';
          let currentRun = '';

          const pushRun = () => {
            if (!currentRun) return;
            if (currentType === 'rtl') {
              const hasArabic = /[\u0600-\u06FF]/.test(currentRun);
              const lang = hasArabic ? 'ar' : 'he';
              newChildren.push({
                type: 'element',
                tagName: 'span',
                properties: { dir: 'rtl', lang, className: ['rtl-text'] },
                children: [{ type: 'text', value: currentRun }]
              });
            } else if (currentType === 'cjk') {
              newChildren.push({
                type: 'element',
                tagName: 'span',
                properties: { lang: 'zh', className: ['cjk-text'] },
                children: [{ type: 'text', value: currentRun }]
              });
            } else {
              newChildren.push({ type: 'text', value: currentRun });
            }
            currentRun = '';
          };

          for (let i = 0; i < text.length; i++) {
            const char = text[i]!;
            const codePoint = char.codePointAt(0)!;
            
            let charType: 'normal' | 'rtl' | 'cjk' = 'normal';
            if ((codePoint >= 0x0600 && codePoint <= 0x06FF) || (codePoint >= 0x0590 && codePoint <= 0x05FF)) {
              charType = 'rtl';
            } else if ((codePoint >= 0x4E00 && codePoint <= 0x9FFF) || (codePoint >= 0x3040 && codePoint <= 0x30FF)) {
              charType = 'cjk';
            } else if (char === ' ') {
              if (currentType === 'rtl') {
                const remaining = text.substring(i + 1);
                const hasMoreRtl = /^[^\u4E00-\u9FFF\u3040-\u30FF]*[\u0600-\u06FF\u0590-\u05FF]/.test(remaining);
                if (hasMoreRtl) {
                  charType = 'rtl';
                }
              } else if (currentType === 'cjk') {
                const remaining = text.substring(i + 1);
                const hasMoreCjk = /^[^\u0600-\u06FF\u0590-\u05FF]*[\u4E00-\u9FFF\u3040-\u30FF]/.test(remaining);
                if (hasMoreCjk) {
                  charType = 'cjk';
                }
              }
            }

            if (charType !== currentType) {
              pushRun();
              currentType = charType;
            }
            currentRun += char;
          }
          pushRun();
        } else {
          newChildren.push(child);
        }
      }
      node.children = newChildren;
      return undefined;
    });
  };
}

function checkboxSanitizerPlugin() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName === 'input' && node.properties?.type === 'checkbox' && parent && index !== undefined) {
        const checked = node.properties.checked === true || node.properties.checked === 'true';
        const unicodeChar = checked ? '☑' : '☐';
        
        const checkboxSpan: Element = {
          type: 'element',
          tagName: 'span',
          properties: { className: ['checkbox-print'] },
          children: [{ type: 'text', value: unicodeChar }]
        };
        
        parent.children[index] = checkboxSpan;
      }
    });
  };
}

function tableOverflowGuardPlugin() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'table') {
        let maxCols = 0;
        let maxCellLength = 0;
        
        visit(node, 'element', (child: Element) => {
          if (child.tagName === 'tr') {
            const cols = child.children.filter(c => c.type === 'element' && (c.tagName === 'td' || c.tagName === 'th')).length;
            if (cols > maxCols) maxCols = cols;
          }
          if (child.tagName === 'td' || child.tagName === 'th') {
            let textLen = 0;
            visit(child, 'text', (t: Text) => {
              textLen += t.value.length;
            });
            if (textLen > maxCellLength) maxCellLength = textLen;
          }
        });

        const classNames: string[] = [];
        if (maxCols >= 8) {
          classNames.push('table-landscape');
        } else if (maxCols >= 5) {
          classNames.push('table-overflow');
        }

        if (classNames.length > 0) {
          node.properties = node.properties || {};
          node.properties.className = [
            ...(node.properties.className as string[] || []),
            ...classNames
          ];
        }

        if (maxCellLength > 60) {
          node.properties = node.properties || {};
          node.properties.style = `${node.properties.style || ''}; font-size: 0.8em;`.trim().replace(/^;/, '');
        }
      }
    });
  };
}

export async function processMarkdown(
  markdown: string,
  frontMatter: ChapterFrontMatter,
  targetType: 'print' | 'epub' | 'preview'
): Promise<string> {
  const parsed = matter(markdown);
  const cleanMarkdown = parsed.content;
  const mergedFrontMatter = { ...frontMatter, ...parsed.data };

  // Step 1: Preprocess footnotes
  const preprocessed = preprocessFootnotes(cleanMarkdown);

  // Step 2-5: Run unified parser & custom AST plugins
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkSmartypants)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(dropCapPlugin, { dropCap: mergedFrontMatter.dropCap, chapterType: mergedFrontMatter.type })
    .use(linkTransformerPlugin, { targetType })
    .use(rehypeFootnotePlugin, { targetType })
    .use(bidiDetectorPlugin)
    .use(checkboxSanitizerPlugin)
    .use(tableOverflowGuardPlugin)
    .use(rehypeStringify, { closeSelfClosing: true })
    .process(preprocessed);

  const xhtml = String(result);

  // Simple XHTML well-formedness check (Task 3.11)
  const openTagsCount = (xhtml.match(/<[a-zA-Z0-9:-]+/g) || []).length;
  const closeTagsCount = (xhtml.match(/<\/[a-zA-Z0-9:-]+/g) || []).length;
  const selfClosedCount = (xhtml.match(/\/>/g) || []).length;
  if (openTagsCount !== (closeTagsCount + selfClosedCount)) {
    console.warn(`[XHTML Validation Warning] Potential malformed XHTML tag structure. Open tags: ${openTagsCount}, Close tags: ${closeTagsCount}, Self-closed tags: ${selfClosedCount}`);
  }

  return xhtml;
}
