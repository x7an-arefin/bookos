import { Hono } from 'hono';
import { eq, and, max, sql } from 'drizzle-orm';
import type { Env, AuthContext } from '../types/env';
import { createDb } from '../db/client';
import { books, chapters } from '../db/schema';
import { authMiddleware } from '../middleware/auth.middleware';
import { generateUUID, nowMs, countWords } from '../utils/helpers';

type ChaptersApp = Hono<{ Bindings: Env; Variables: { user: AuthContext } }>;

export const chaptersRoutes: ChaptersApp = new Hono();

chaptersRoutes.use('/*', authMiddleware);

async function assertBookOwner(db: ReturnType<typeof createDb>, bookId: string, userId: string): Promise<boolean> {
  const book = await db
    .select({ ownerId: books.ownerId })
    .from(books)
    .where(eq(books.id, bookId))
    .get();
  return book?.ownerId === userId;
}

chaptersRoutes.post('/', async (c) => {
  const { userId } = c.get('user');
  const bookId = c.req.param('bookId');
  const db = createDb(c.env.DB);

  if (!(await assertBookOwner(db, bookId, userId))) {
    return c.json({ error: 'Book not found.' }, 404);
  }

  const body = await c.req.json<{ title?: string; sortOrder?: number }>();
  if (!body.title?.trim()) {
    return c.json({ error: 'Title is required.' }, 400);
  }

  const maxResult = await db
    .select({ maxOrder: max(chapters.sortOrder) })
    .from(chapters)
    .where(eq(chapters.bookId, bookId))
    .get();

  const sortOrder = body.sortOrder ?? (maxResult?.maxOrder ?? -1) + 1;
  const id = generateUUID();
  const now = nowMs();

  await db.insert(chapters).values({
    id,
    bookId,
    title: body.title.trim(),
    sortOrder,
    contentMarkdown: '',
    lastModified: now,
    createdAt: now,
  });

  await db
    .update(books)
    .set({ chapterCount: sql`chapter_count + 1`, updatedAt: now })
    .where(eq(books.id, bookId));

  return c.json({ id }, 201);
});

chaptersRoutes.patch('/:chapterId', async (c) => {
  const { userId } = c.get('user');
  const bookId = c.req.param('bookId');
  const chapterId = c.req.param('chapterId');
  const db = createDb(c.env.DB);

  if (!(await assertBookOwner(db, bookId, userId))) {
    return c.json({ error: 'Book not found.' }, 404);
  }

  const body = await c.req.json<{
    title?: string;
    contentMarkdown?: string;
    frontMatterJson?: string;
    lastModified?: number;
  }>();

  const now = nowMs();
  const updates: Record<string, unknown> = { lastModified: body.lastModified ?? now };

  if (body.title !== undefined) updates.title = body.title;
  if (body.contentMarkdown !== undefined) {
    updates.contentMarkdown = body.contentMarkdown;
    updates.wordCount = countWords(body.contentMarkdown);
  }
  if (body.frontMatterJson !== undefined) updates.frontMatterJson = body.frontMatterJson;

  await db.update(chapters).set(updates).where(and(eq(chapters.id, chapterId), eq(chapters.bookId, bookId)));
  await db.update(books).set({ updatedAt: now }).where(eq(books.id, bookId));

  return c.json({ success: true });
});

chaptersRoutes.delete('/:chapterId', async (c) => {
  const { userId } = c.get('user');
  const bookId = c.req.param('bookId');
  const chapterId = c.req.param('chapterId');
  const db = createDb(c.env.DB);

  if (!(await assertBookOwner(db, bookId, userId))) {
    return c.json({ error: 'Book not found.' }, 404);
  }

  await db.delete(chapters).where(and(eq(chapters.id, chapterId), eq(chapters.bookId, bookId)));

  const remaining = await db
    .select({ id: chapters.id })
    .from(chapters)
    .where(eq(chapters.bookId, bookId))
    .orderBy(chapters.sortOrder);

  for (let i = 0; i < remaining.length; i++) {
    await db.update(chapters).set({ sortOrder: i }).where(eq(chapters.id, remaining[i].id));
  }

  const now = nowMs();
  await db
    .update(books)
    .set({ chapterCount: sql`chapter_count - 1`, updatedAt: now })
    .where(eq(books.id, bookId));

  return new Response(null, { status: 204 });
});

chaptersRoutes.put('/reorder', async (c) => {
  const { userId } = c.get('user');
  const bookId = c.req.param('bookId');
  const db = createDb(c.env.DB);

  if (!(await assertBookOwner(db, bookId, userId))) {
    return c.json({ error: 'Book not found.' }, 404);
  }

  const body = await c.req.json<{ chapterIds?: string[] }>();
  if (!Array.isArray(body.chapterIds) || body.chapterIds.length === 0) {
    return c.json({ error: 'chapterIds array is required.' }, 400);
  }

  for (let i = 0; i < body.chapterIds.length; i++) {
    await db
      .update(chapters)
      .set({ sortOrder: i })
      .where(and(eq(chapters.id, body.chapterIds[i]), eq(chapters.bookId, bookId)));
  }

  await db.update(books).set({ updatedAt: nowMs() }).where(eq(books.id, bookId));
  return c.json({ success: true });
});
