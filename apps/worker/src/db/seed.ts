import { createDb } from './client';
import { users, books, chapters, themes } from './schema';

export async function seed(db: D1Database): Promise<void> {
  const client = createDb(db);
  const now = Date.now();

  await client.insert(themes).values([
    {
      id: 'theme-classic-serif',
      slug: 'classic-serif',
      name: 'Classic Serif',
      description: 'Traditional book typography using serif fonts. Perfect for literary fiction and non-fiction.',
      cssUrl: '/themes/classic-serif.css',
      configJson: '{"fontFamily":"Georgia","fontSize":"11pt","lineHeight":"1.6"}',
      isPremium: 0,
      priceUsd: null,
      createdAt: now,
    },
    {
      id: 'theme-modern-sans',
      slug: 'modern-sans',
      name: 'Modern Sans',
      description: 'Clean, contemporary typography for technical writing, business books and memoirs.',
      cssUrl: '/themes/modern-sans.css',
      configJson: '{"fontFamily":"Inter","fontSize":"10.5pt","lineHeight":"1.5"}',
      isPremium: 0,
      priceUsd: null,
      createdAt: now,
    },
  ]).onConflictDoNothing();

  await client.insert(users).values({
    id: 'user-dev-admin',
    email: 'admin@bookos.test',
    passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lewbl8PkLWTgdMZ5u',
    plan: 'free',
    createdAt: now,
    updatedAt: now,
  }).onConflictDoNothing();

  await client.insert(books).values({
    id: 'book-sample-01',
    ownerId: 'user-dev-admin',
    title: 'The Art of Writing',
    author: 'Admin User',
    subtitle: 'A practical guide',
    configJson: '{}',
    themeSlug: 'classic-serif',
    wordCount: 120,
    chapterCount: 2,
    createdAt: now,
    updatedAt: now,
  }).onConflictDoNothing();

  await client.insert(chapters).values([
    {
      id: 'chapter-sample-01',
      bookId: 'book-sample-01',
      title: 'Introduction',
      sortOrder: 0,
      contentMarkdown: 'Welcome to the art of writing. This sample chapter gives you a starting point.',
      wordCount: 15,
      lastModified: now,
      createdAt: now,
    },
    {
      id: 'chapter-sample-02',
      bookId: 'book-sample-01',
      title: 'Finding Your Voice',
      sortOrder: 1,
      contentMarkdown: 'Your writing voice is the unique way you express ideas on the page. It develops with practice.',
      wordCount: 17,
      lastModified: now,
      createdAt: now,
    },
  ]).onConflictDoNothing();
}
