// Universal type definitions for BookOS schema

export interface BookMeta {
  title: string;
  author: string;
  subtitle?: string;
  publisher?: string;
  isbn?: string;
  language: string; // ISO 639-1 code, e.g. 'en'
  description?: string;
  genre?: string;
  publicationDate?: string; // ISO date string
}

export type CssSize = string; // Constraint: e.g., "1in", "20mm", "12pt"

export interface MarginConfig {
  top: CssSize;
  bottom: CssSize;
  inner: CssSize;
  outer: CssSize;
}

export interface LayoutTarget {
  pageSize: string; // e.g. "6in 9in", "A4", "Letter"
  margins: MarginConfig;
  baseFont: string;
  baseFontSize: string;
  headingFont: string;
  baseLineHeight: number;
  runningHeaders: boolean;
  suppressHeadersOnChapterOpen: boolean;
  dropCaps: boolean;
  hyphenation: boolean;
  chapterStartsOnRightPage: boolean;
  includeTOC: boolean;
  includeISBNBarcode: boolean;
  printBleed: boolean;
}

export interface BookConfig {
  global: Partial<LayoutTarget>;
  targets: Record<string, LayoutTarget>;
  activeTheme: string; // theme slug
}

export type ChapterType = 'normal' | 'part-opener' | 'frontmatter' | 'backmatter';
export type PageNumberStyle = 'arabic' | 'roman' | 'none';

export interface ChapterFrontMatter {
  type?: ChapterType;
  suppressRunningHeaders?: boolean;
  author?: string; // override for guest author
  lang?: string; // override ISO language code
  pageNumberStyle?: PageNumberStyle;
  dropCap?: boolean;
}

export interface Chapter {
  id: string; // UUID v4
  title: string;
  sortOrder: number;
  contentMarkdown: string;
  frontMatter?: ChapterFrontMatter;
  lastModified: string; // ISO date string
  wordCount?: number; // computed
  estimatedPageCount?: number; // computed
}

export interface BookAsset {
  id: string; // UUID v4
  filename: string;
  localPath: string; // absolute path on user machine
  cloudUrl?: string; // for premium users
  mimeType: string;
  sizeBytes: number;
  variants?: {
    original?: string; // path or URL
    thumbnail?: string; // path or URL
    mobile?: string; // path or URL
    print?: string; // path or URL
  };
}

export interface ExportRecord {
  target: string;
  format: 'pdf' | 'epub';
  completedAt: string; // ISO date string
  outputPath: string;
  fileSizeBytes: number;
  pageCount?: number;
}

export interface BookProject {
  id: string; // UUID v4
  meta: BookMeta;
  config: BookConfig;
  frontMatterSections: Chapter[];
  chapters: Chapter[];
  backMatterSections: Chapter[];
  assets: BookAsset[];
  exportHistory: ExportRecord[];
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface BuildOptions {
  project: BookProject;
  target: string;
  outputDir: string;
  workspaceDir?: string;
  onProgress?: (percent: number, message: string) => void;
}

export interface BuildResult {
  success: boolean;
  outputPath?: string;
  format?: 'pdf' | 'epub';
  pageCount?: number;
  validation: ValidationReport;
  duration: number;
}

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationItem {
  severity: ValidationSeverity;
  code: string;
  message: string;
  chapterId?: string;
  assetId?: string;
}

export interface ValidationReport {
  errors: ValidationItem[];
  warnings: ValidationItem[];
  info: ValidationItem[];
  isValid: boolean;
}
