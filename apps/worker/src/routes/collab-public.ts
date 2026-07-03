import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import type { Env } from '../types/env';
import { createDb } from '../db/client';
import { books, chapters, collabSessions } from '../db/schema';
import { nowMs } from '../utils/helpers';

export const collabPublicRoutes = new Hono<{ Bindings: Env }>();

collabPublicRoutes.get('/accept/:token', async (c) => {
  const token = c.req.param('token');
  const db = createDb(c.env.DB);

  const session = await db
    .select()
    .from(collabSessions)
    .where(eq(collabSessions.id, token))
    .get();

  if (!session) {
    return c.json({ error: 'Invitation not found' }, 404);
  }

  if (session.expiresAt < nowMs()) {
    return c.json({ error: 'Invitation expired' }, 410);
  }

  if (!session.acceptedAt) {
    await db
      .update(collabSessions)
      .set({ acceptedAt: nowMs() })
      .where(eq(collabSessions.id, token));
  }

  const book = await db.select().from(books).where(eq(books.id, session.bookId)).get();
  if (!book) {
    return c.json({ error: 'Book not found' }, 404);
  }

  const bookChapters = await db
    .select()
    .from(chapters)
    .where(eq(chapters.bookId, session.bookId))
    .orderBy(chapters.sortOrder);

  return c.json({
    book,
    chapters: bookChapters,
    permission: session.permission,
  });
});
