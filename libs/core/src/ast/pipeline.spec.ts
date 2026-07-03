import { processMarkdown } from './pipeline.js';

describe('AST Markdown Pipeline', () => {
  it('should process basic markdown and output valid XHTML', async () => {
    const md = 'Hello World';
    const html = await processMarkdown(md, {}, 'preview');
    expect(html).toContain('<p>Hello World</p>');
  });

  it('should convert straight quotes to smart curly quotes', async () => {
    const md = 'He said, "Hello World."';
    const html = await processMarkdown(md, {}, 'preview');
    expect(html).toContain('He said, “Hello World.”');
  });

  it('should apply drop cap to the first letter of the first paragraph', async () => {
    const md = '# Header\nThis is the first paragraph.';
    const html = await processMarkdown(md, { dropCap: true, type: 'normal' }, 'preview');
    expect(html).toContain('<p><span class="drop-cap">T</span>his is the first paragraph.</p>');
  });

  it('should handle quotation prefix in drop caps', async () => {
    const md = '"This is a quote."';
    const html = await processMarkdown(md, { dropCap: true, type: 'normal' }, 'preview');
    expect(html).toContain('<p>“<span class="drop-cap">T</span>his is a quote.”</p>');
  });

  it('should expand links in print mode and preserve them in epub mode', async () => {
    const md = '[Google](https://google.com)';
    
    const printHtml = await processMarkdown(md, {}, 'print');
    expect(printHtml).toContain('<a>Google</a><span class="url-display"> (https://google.com)</span>');

    const epubHtml = await processMarkdown(md, {}, 'epub');
    expect(epubHtml).toContain('<a href="https://google.com">Google</a>');
  });

  it('should process footnotes correctly according to target format', async () => {
    const md = 'Text with ref[^1]\n\n[^1]: Footnote content';

    const printHtml = await processMarkdown(md, {}, 'print');
    expect(printHtml).toContain('<aside class="footnote" data-ref="1">Footnote content</aside>');

    const epubHtml = await processMarkdown(md, {}, 'epub');
    expect(epubHtml).toContain('<a id="fnref-1" epub:type="noteref" href="#fn-1">1</a>');
    expect(epubHtml).toContain('<aside epub:type="footnote">');
  });

  it('should detect RTL script and wrap it in dir="rtl" span', async () => {
    const md = 'English text: كتابة عربية';
    const html = await processMarkdown(md, {}, 'preview');
    expect(html).toContain('<span dir="rtl" lang="ar" class="rtl-text">كتابة عربية</span>');
  });

  it('should sanitize task list checkboxes', async () => {
    const md = '- [ ] Unchecked\n- [x] Checked';
    const html = await processMarkdown(md, {}, 'preview');
    expect(html).toContain('<span class="checkbox-print">☐</span>');
    expect(html).toContain('<span class="checkbox-print">☑</span>');
  });

  it('should handle table overflow properties', async () => {
    const md = `
| Col1 | Col2 | Col3 | Col4 | Col5 | Col6 |
|------|------|------|------|------|------|
| Val1 | Val2 | Val3 | Val4 | Val5 | Val6 |
    `;
    const html = await processMarkdown(md, {}, 'preview');
    expect(html).toContain('<table class="table-overflow">');
  });
});
