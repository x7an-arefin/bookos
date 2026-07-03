import { Hono } from 'hono';
import { eq, and, gt } from 'drizzle-orm';
import type { Env, AuthContext, SyncPushRequest, SyncPushResponse, ConflictedChapter } from '../types/env';
import { createDb } from '../db/client';
import { books, chapters, snapshots } from '../db/schema';
import { authMiddleware } from '../middleware/auth.middleware';
import { generateUUID, nowMs, countWords } from '../utils/helpers';

type SyncApp = Hono<{ Bindings: Env; Variables: { user: AuthContext } }>;

export const syncRoutes: SyncApp = new Hono();

syncRoutes.use('/*', authMiddleware);

async function createAutoSnapshot(
  db: ReturnType<typeof createDb>,
  bookId: string
): Promise<string> {
  const book = await db.select().from(books).where(eq(books.id, bookId)).get();
  const bookChapters = await db.select().from(chapters).where(eq(chapters.bookId, bookId)).orderBy(chapters.sortOrder);

  const snapshotData = { book, chapters: bookChapters };
  const id = generateUUID();
  const totalWords = bookChapters.reduce((acc, ch) => acc + ch.wordCount, 0);

  await db.insert(snapshots).values({
    id,
    bookId,
    label: null,
    snapshotJson: JSON.stringify(snapshotData),
    chapterCount: bookChapters.length,
    wordCount: totalWords,
    createdAt: nowMs(),
    isAuto: 1,
  });

  return id;
}

syncRoutes.post('/push', async (c) => {
  const { userId } = c.get('user');
  const body = await c.req.json<SyncPushRequest>();

  if (!body.bookId) {
    return c.json({ error: 'bookId is required.' }, 400);
  }

  const db = createDb(c.env.DB);

  const book = await db
    .select({ ownerId: books.ownerId })
    .from(books)
    .where(eq(books.id, body.bookId))
    .get();

  if (!book || book.ownerId !== userId) {
    return c.json({ error: 'Book not found.' }, 404);
  }

  const snapshotId = await createAutoSnapshot(db, body.bookId);

  const serverChapters = await db
    .select({ id: chapters.id, lastModified: chapters.lastModified, contentMarkdown: chapters.contentMarkdown, title: chapters.title })
    .from(chapters)
    .where(eq(chapters.bookId, body.bookId));

  const serverChapterMap = new Map(serverChapters.map((ch) => [ch.id, ch]));
  const conflicts: ConflictedChapter[] = [];
  const now = nowMs();

  if (body.book) {
    await db.update(books).set({ ...body.book, updatedAt: now, lastSyncAt: now }).where(eq(books.id, body.bookId));
  }

  for (const incoming of body.chapters ?? []) {
    const server = serverChapterMap.get(incoming.id);

    if (server && server.lastModified > incoming.lastModified) {
      conflicts.push({
        id: incoming.id,
        title: server.title,
        clientContent: incoming.contentMarkdown,
        serverContent: server.contentMarkdown,
        clientLastModified: incoming.lastModified,
        serverLastModified: server.lastModified,
      });
      continue;
    }

    const wordCount = countWords(incoming.contentMarkdown);

    if (server) {
      await db
        .update(chapters)
        .set({
          title: incoming.title,
          sortOrder: incoming.sortOrder,
          contentMarkdown: incoming.contentMarkdown,
          frontMatterJson: incoming.frontMatterJson ?? null,
          wordCount,
          lastModified: incoming.lastModified,
        })
        .where(eq(chapters.id, incoming.id));
    } else {
      await db.insert(chapters).values({
        id: incoming.id,
        bookId: body.bookId,
        title: incoming.title,
        sortOrder: incoming.sortOrder,
        contentMarkdown: incoming.contentMarkdown,
        frontMatterJson: incoming.frontMatterJson ?? null,
        wordCount,
        lastModified: incoming.lastModified,
        createdAt: now,
      });
    }
  }

  const allChapters = await db.select({ wordCount: chapters.wordCount }).from(chapters).where(eq(chapters.bookId, body.bookId));
  const totalWords = allChapters.reduce((acc, ch) => acc + ch.wordCount, 0);
  await db
    .update(books)
    .set({ wordCount: totalWords, chapterCount: allChapters.length, updatedAt: now, lastSyncAt: now })
    .where(eq(books.id, body.bookId));

  const response: SyncPushResponse = {
    success: true,
    conflicts,
    snapshotId,
    syncedAt: now,
  };

  return c.json(response);
});

syncRoutes.get('/pull/:bookId', async (c) => {
  const { userId } = c.get('user');
  const bookId = c.req.param('bookId');
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

  return c.json({ book, chapters: bookChapters });
});

syncRoutes.get('/diff/:bookId', async (c) => {
  const { userId } = c.get('user');
  const bookId = c.req.param('bookId');
  const since = parseInt(c.req.query('since') ?? '0', 10);
  const db = createDb(c.env.DB);

  const book = await db.select({ ownerId: books.ownerId }).from(books).where(eq(books.id, bookId)).get();
  if (!book || book.ownerId !== userId) {
    return c.json({ error: 'Book not found.' }, 404);
  }

  const modified = await db
    .select()
    .from(chapters)
    .where(and(eq(chapters.bookId, bookId), gt(chapters.lastModified, since)))
    .orderBy(chapters.sortOrder);

  return c.json(modified);
});

syncRoutes.get('/status/:bookId', async (c) => {
  const { userId } = c.get('user');
  const bookId = c.req.param('bookId');
  const clientLastSync = parseInt(c.req.query('client_last_sync') ?? '0', 10);
  const db = createDb(c.env.DB);

  const book = await db
    .select({ ownerId: books.ownerId, updatedAt: books.updatedAt, lastSyncAt: books.lastSyncAt })
    .from(books)
    .where(eq(books.id, bookId))
    .get();

  if (!book || book.ownerId !== userId) {
    return c.json({ error: 'Book not found.' }, 404);
  }

  return c.json({
    lastSyncAt: book.lastSyncAt,
    serverUpdatedAt: book.updatedAt,
    isServerAhead: book.updatedAt > clientLastSync,
  });
});
