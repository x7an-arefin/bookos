# Chapter One: Designing Layouts

Typesetting books requires a deep understanding of negative space and proportions. Designers must consider margins, line height, font choice, and how sections flow together. A book layout is not just a container for text; it is an active participant in the reading experience.

When a reader opens a book, their eyes should naturally land on the top of the page. The margin configuration (inner, outer, top, and bottom) sets the tone. Inner margins must be wider to account for the gutter in printed binding, while outer margins provide space for the thumbs.

Here is a visual representation of standard target dimensions:

| Dimension | Standard Size | Purpose |
| --- | --- | --- |
| Trim Size | 6in × 9in | Standard trade paperback size |
| Gutter Margin | 0.75in | Binding space allowances |
| Font Size | 10.5pt | Optimal text legibility |
| Line Spacing | 14pt | Comfortable reading rhythm |

To insert an illustration, we use markdown references:

![Sample Image](sample-300dpi.png)

Every image must be processed through the optimizer to verify it complies with resolution benchmarks [^1]. If an image has low resolution, the validator logs warnings to prevent blurry print output.

[^1]: Image resolution is measured in dots per inch (DPI). For printing, 300 DPI is standard.

Designing for screen display requires a different approach. Digital readers prefer reflowable text where margins are thin and text scales dynamically. In these environments, we strip out print-specific parameters (like crop marks and page numbers) to allow screens to render the book correctly.

A well-crafted layout makes the interface disappear, allowing the reader to immerse themselves fully in the author's world. To learn more about modern layout design, visit the [BookOS Homepage](https://github.com/google-deepmind/bookos).
