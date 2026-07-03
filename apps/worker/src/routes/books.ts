import { Hono } from 'hono';
import { eq, and, isNull, isNotNull, desc, like, sql } from 'drizzle-orm';
import type { Env, AuthContext } from '../types/env';
import { createDb } from '../db/client';
import { books, chapters } from '../db/schema';
import { authMiddleware } from '../middleware/auth.middleware';
import { generateUUID, nowMs } from '../utils/helpers';

type BooksApp = Hono<{ Bindings: Env; Variables: { user: AuthContext } }>;

export const booksRoutes: BooksApp = new Hono();

booksRoutes.use('/*', authMiddleware);

booksRoutes.get('/', async (c) => {
  const { userId } = c.get('user');
  const db = createDb(c.env.DB);
  const q = c.req.query('q');

  let query = db
    .select({
      id: books.id,
      title: books.title,
      author: books.author,
      subtitle: books.subtitle,
      themeSlug: books.themeSlug,
      wordCount: books.wordCount,
      chapterCount: books.chapterCount,
      updatedAt: books.updatedAt,
      createdAt: books.createdAt,
      deletedAt: books.deletedAt,
    })
    .from(books)
    .where(and(eq(books.ownerId, userId), isNull(books.deletedAt)))
    .orderBy(desc(books.updatedAt));

  const results = await query;

  if (q) {
    const lower = q.toLowerCase();
    return c.json(results.filter((b) => b.title.toLowerCase().includes(lower)));
  }

  return c.json(results);
});

booksRoutes.post('/', async (c) => {
  const { userId } = c.get('user');
  const body = await c.req.json<{ title?: string; author?: string; subtitle?: string }>();

  if (!body.title?.trim() || !body.author?.trim()) {
    return c.json({ error: 'Title and author are required.' }, 400);
  }

  const db = createDb(c.env.DB);
  const id = generateUUID();
  const now = nowMs();

  await db.insert(books).values({
    id,
    ownerId: userId,
    title: body.title.trim(),
    author: body.author.trim(),
    subtitle: body.subtitle ?? null,
    configJson: '{}',
    createdAt: now,
    updatedAt: now,
  });

  return c.json({ id }, 201);
});

booksRoutes.get('/:id', async (c) => {
  const { userId } = c.get('user');
  const bookId = c.req.param('id');
  const db = createDb(c.env.DB);

  const book = await db.select().from(books).where(eq(books.id, bookId)).get();
  if (!book || book.ownerId !== userId) {
    return c.json({ error: 'Book not found.' }, 404);
  }

  const bookChapters = await db
    .select()
    .from(chapters)
    .where(eq(chapters.bookId, bookId))
    .orderBy(chapters.sortOrder);

  return c.json({ ...book, chapters: bookChapters });
});

booksRoutes.patch('/:id', async (c) => {
  const { userId } = c.get('user');
  const bookId = c.req.param('id');
  const db = createDb(c.env.DB);

  const book = await db.select({ ownerId: books.ownerId }).from(books).where(eq(books.id, bookId)).get();
  if (!book || book.ownerId !== userId) {
    return c.json({ error: 'Book not found.' }, 404);
  }

  const body = await c.req.json<{
    title?: string;
    author?: string;
    subtitle?: string;
    isbn?: string;
    language?: string;
    publisher?: string;
    configJson?: string;
    themeSlug?: string;
  }>();

  await db
    .update(books)
    .set({ ...body, updatedAt: nowMs() })
    .where(eq(books.id, bookId));

  return c.json({ success: true });
});

booksRoutes.delete('/:id', async (c) => {
  const { userId } = c.get('user');
  const bookId = c.req.param('id');
  const db = createDb(c.env.DB);

  const book = await db.select({ ownerId: books.ownerId }).from(books).where(eq(books.id, bookId)).get();
  if (!book || book.ownerId !== userId) {
    return c.json({ error: 'Book not found.' }, 404);
  }

  await db.update(books).set({ deletedAt: nowMs() }).where(eq(books.id, bookId));
  return new Response(null, { status: 204 });
});

booksRoutes.post('/:id/restore', async (c) => {
  const { userId } = c.get('user');
  const bookId = c.req.param('id');
  const db = createDb(c.env.DB);

  const book = await db.select().from(books).where(eq(books.id, bookId)).get();
  if (!book || book.ownerId !== userId) {
    return c.json({ error: 'Book not found.' }, 404);
  }
  if (!book.deletedAt) {
    return c.json({ error: 'Book is not in the trash.' }, 400);
  }

  await db.update(books).set({ deletedAt: null, updatedAt: nowMs() }).where(eq(books.id, bookId));
  return c.json({ success: true });
});

booksRoutes.delete('/:id/permanent', async (c) => {
  const { userId } = c.get('user');
  const bookId = c.req.param('id');
  const db = createDb(c.env.DB);

  const book = await db.select({ ownerId: books.ownerId, deletedAt: books.deletedAt }).from(books).where(eq(books.id, bookId)).get();
  if (!book || book.ownerId !== userId) {
    return c.json({ error: 'Book not found.' }, 404);
  }
  if (!book.deletedAt) {
    return c.json({ error: 'Book must be trashed before permanent deletion.' }, 400);
  }

  await db.delete(books).where(eq(books.id, bookId));
  return new Response(null, { status: 204 });
});
