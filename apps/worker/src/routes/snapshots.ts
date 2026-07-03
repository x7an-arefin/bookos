import { Hono } from 'hono';
import { eq, desc } from 'drizzle-orm';
import type { Env, AuthContext } from '../types/env';
import { createDb } from '../db/client';
import { books, chapters, snapshots } from '../db/schema';
import { authMiddleware } from '../middleware/auth.middleware';
import { generateUUID, nowMs } from '../utils/helpers';

type SnapshotsApp = Hono<{ Bindings: Env; Variables: { user: AuthContext } }>;

export const snapshotsRoutes: SnapshotsApp = new Hono();

snapshotsRoutes.use('/*', authMiddleware);

async function assertBookOwner(db: ReturnType<typeof createDb>, bookId: string, userId: string): Promise<boolean> {
  const book = await db.select({ ownerId: books.ownerId }).from(books).where(eq(books.id, bookId)).get();
  return book?.ownerId === userId;
}

snapshotsRoutes.get('/', async (c) => {
  const { userId } = c.get('user');
  const bookId = c.req.param('bookId');
  const db = createDb(c.env.DB);

  if (!(await assertBookOwner(db, bookId, userId))) {
    return c.json({ error: 'Book not found.' }, 404);
  }

  const list = await db
    .select({
      id: snapshots.id,
      label: snapshots.label,
      chapterCount: snapshots.chapterCount,
      wordCount: snapshots.wordCount,
      createdAt: snapshots.createdAt,
      isAuto: snapshots.isAuto,
    })
    .from(snapshots)
    .where(eq(snapshots.bookId, bookId))
    .orderBy(desc(snapshots.createdAt));

  return c.json(list);
});

snapshotsRoutes.post('/', async (c) => {
  const { userId } = c.get('user');
  const bookId = c.req.param('bookId');
  const db = createDb(c.env.DB);

  if (!(await assertBookOwner(db, bookId, userId))) {
    return c.json({ error: 'Book not found.' }, 404);
  }

  const body = await c.req.json<{ label?: string }>();

  const book = await db.select().from(books).where(eq(books.id, bookId)).get();
  const bookChapters = await db.select().from(chapters).where(eq(chapters.bookId, bookId)).orderBy(chapters.sortOrder);

  const id = generateUUID();
  const now = nowMs();
  const totalWords = bookChapters.reduce((acc, ch) => acc + ch.wordCount, 0);

  await db.insert(snapshots).values({
    id,
    bookId,
    label: body.label?.trim() ?? null,
    snapshotJson: JSON.stringify({ book, chapters: bookChapters }),
    chapterCount: bookChapters.length,
    wordCount: totalWords,
    createdAt: now,
    isAuto: 0,
  });

  return c.json({ id, label: body.label ?? null, createdAt: now }, 201);
});

snapshotsRoutes.get('/:snapshotId', async (c) => {
  const { userId } = c.get('user');
  const bookId = c.req.param('bookId');
  const snapshotId = c.req.param('snapshotId');
  const db = createDb(c.env.DB);

  if (!(await assertBookOwner(db, bookId, userId))) {
    return c.json({ error: 'Book not found.' }, 404);
  }

  const snapshot = await db
    .select()
    .from(snapshots)
    .where(eq(snapshots.id, snapshotId))
    .get();

  if (!snapshot || snapshot.bookId !== bookId) {
    return c.json({ error: 'Snapshot not found.' }, 404);
  }

  return c.json({ ...snapshot, data: JSON.parse(snapshot.snapshotJson) });
});

snapshotsRoutes.post('/:snapshotId/restore', async (c) => {
  const { userId } = c.get('user');
  const bookId = c.req.param('bookId');
  const snapshotId = c.req.param('snapshotId');
  const db = createDb(c.env.DB);

  if (!(await assertBookOwner(db, bookId, userId))) {
    return c.json({ error: 'Book not found.' }, 404);
  }

  const snapshot = await db.select().from(snapshots).where(eq(snapshots.id, snapshotId)).get();
  if (!snapshot || snapshot.bookId !== bookId) {
    return c.json({ error: 'Snapshot not found.' }, 404);
  }

  const safetyBook = await db.select().from(books).where(eq(books.id, bookId)).get();
  const safetyChapters = await db.select().from(chapters).where(eq(chapters.bookId, bookId)).orderBy(chapters.sortOrder);
  const safetyId = generateUUID();
  const safetyWords = safetyChapters.reduce((acc, ch) => acc + ch.wordCount, 0);
  await db.insert(snapshots).values({
    id: safetyId,
    bookId,
    label: 'Before restore',
    snapshotJson: JSON.stringify({ book: safetyBook, chapters: safetyChapters }),
    chapterCount: safetyChapters.length,
    wordCount: safetyWords,
    createdAt: nowMs(),
    isAuto: 1,
  });

  const data = JSON.parse(snapshot.snapshotJson) as { book: any; chapters: any[] };

  await db.delete(chapters).where(eq(chapters.bookId, bookId));

  const now = nowMs();
  for (const ch of data.chapters ?? []) {
    await db.insert(chapters).values({ ...ch, bookId, createdAt: now, lastModified: now });
  }

  if (data.book) {
    await db.update(books).set({ ...data.book, id: bookId, ownerId: userId, updatedAt: now }).where(eq(books.id, bookId));
  }

  return c.json({ success: true, safetySnapshotId: safetyId });
});

snapshotsRoutes.delete('/:snapshotId', async (c) => {
  const { userId } = c.get('user');
  const bookId = c.req.param('bookId');
  const snapshotId = c.req.param('snapshotId');
  const db = createDb(c.env.DB);

  if (!(await assertBookOwner(db, bookId, userId))) {
    return c.json({ error: 'Book not found.' }, 404);
  }

  await db.delete(snapshots).where(eq(snapshots.id, snapshotId));
  return new Response(null, { status: 204 });
});
