import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    plan: text('plan').notNull().default('free'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    deletedAt: integer('deleted_at'),
  },
  (t) => [
    uniqueIndex('users_email_idx').on(t.email),
    index('users_plan_idx').on(t.plan),
  ]
);

export const sessions = sqliteTable(
  'sessions',
  {
    jti: text('jti').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    createdAt: integer('created_at').notNull(),
    expiresAt: integer('expires_at').notNull(),
    revokedAt: integer('revoked_at'),
    deviceHint: text('device_hint'),
  },
  (t) => [index('sessions_user_id_idx').on(t.userId)]
);

export const books = sqliteTable(
  'books',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id),
    title: text('title').notNull(),
    author: text('author').notNull(),
    subtitle: text('subtitle'),
    isbn: text('isbn'),
    language: text('language').notNull().default('en'),
    publisher: text('publisher'),
    configJson: text('config_json').notNull().default('{}'),
    themeSlug: text('theme_slug').notNull().default('classic-serif'),
    wordCount: integer('word_count').notNull().default(0),
    chapterCount: integer('chapter_count').notNull().default(0),
    lastSyncAt: integer('last_sync_at'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    deletedAt: integer('deleted_at'),
  },
  (t) => [
    index('books_owner_id_idx').on(t.ownerId),
    index('books_owner_deleted_idx').on(t.ownerId, t.deletedAt),
    index('books_title_idx').on(t.title),
    index('books_updated_at_idx').on(t.updatedAt),
  ]
);

export const chapters = sqliteTable(
  'chapters',
  {
    id: text('id').primaryKey(),
    bookId: text('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    sortOrder: integer('sort_order').notNull(),
    contentMarkdown: text('content_markdown').notNull().default(''),
    frontMatterJson: text('front_matter_json'),
    wordCount: integer('word_count').notNull().default(0),
    lastModified: integer('last_modified').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    index('chapters_book_id_idx').on(t.bookId),
    index('chapters_book_sort_idx').on(t.bookId, t.sortOrder),
  ]
);

export const snapshots = sqliteTable(
  'snapshots',
  {
    id: text('id').primaryKey(),
    bookId: text('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    label: text('label'),
    snapshotJson: text('snapshot_json').notNull(),
    chapterCount: integer('chapter_count').notNull(),
    wordCount: integer('word_count').notNull(),
    createdAt: integer('created_at').notNull(),
    isAuto: integer('is_auto').notNull().default(0),
  },
  (t) => [index('snapshots_book_id_idx').on(t.bookId)]
);

export const assets = sqliteTable(
  'assets',
  {
    id: text('id').primaryKey(),
    bookId: text('book_id').references(() => books.id, { onDelete: 'cascade' }),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id),
    filename: text('filename').notNull(),
    mimeType: text('mime_type').notNull(),
    fileSizeBytes: integer('file_size_bytes').notNull(),
    cloudUrl: text('cloud_url').notNull(),
    thumbnailUrl: text('thumbnail_url').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    index('assets_book_id_idx').on(t.bookId),
    index('assets_owner_id_idx').on(t.ownerId),
  ]
);

export const comments = sqliteTable(
  'comments',
  {
    id: text('id').primaryKey(),
    chapterId: text('chapter_id')
      .notNull()
      .references(() => chapters.id, { onDelete: 'cascade' }),
    parentId: text('parent_id').references((): any => comments.id),
    authorId: text('author_id')
      .notNull()
      .references(() => users.id),
    text: text('text').notNull(),
    rangeStart: integer('range_start').notNull(),
    rangeEnd: integer('range_end').notNull(),
    isResolved: integer('is_resolved').notNull().default(0),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('comments_chapter_id_idx').on(t.chapterId)]
);

export const collabSessions = sqliteTable(
  'collab_sessions',
  {
    id: text('id').primaryKey(),
    bookId: text('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    invitedEmail: text('invited_email').notNull(),
    permission: text('permission').notNull().default('reviewer'),
    invitedBy: text('invited_by')
      .notNull()
      .references(() => users.id),
    acceptedAt: integer('accepted_at'),
    expiresAt: integer('expires_at').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('collab_sessions_book_id_idx').on(t.bookId)]
);

export const themes = sqliteTable(
  'themes',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    description: text('description'),
    cssUrl: text('css_url').notNull(),
    configJson: text('config_json'),
    isPremium: integer('is_premium').notNull().default(0),
    priceUsd: real('price_usd'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [uniqueIndex('themes_slug_idx').on(t.slug)]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;
export type Chapter = typeof chapters.$inferSelect;
export type NewChapter = typeof chapters.$inferInsert;
export type Snapshot = typeof snapshots.$inferSelect;
export type NewSnapshot = typeof snapshots.$inferInsert;
export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type CollabSession = typeof collabSessions.$inferSelect;
export type NewCollabSession = typeof collabSessions.$inferInsert;
export type Theme = typeof themes.$inferSelect;
export type NewTheme = typeof themes.$inferInsert;
