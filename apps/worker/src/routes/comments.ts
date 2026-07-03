import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import type { Env } from '../types/env';
import { createDb } from '../db/client';
import { comments, users, chapters } from '../db/schema';
import { generateUUID, nowMs } from '../utils/helpers';
import { verifyToken } from '../services/jwt.service';

export const commentsRoutes = new Hono<{ Bindings: Env }>();

// GET /api/books/:bookId/chapters/:chapterId/comments
commentsRoutes.get('/', async (c) => {
  const chapterId = c.req.param('chapterId');
  const db = createDb(c.env.DB);

  // Join with users to retrieve commenter email
  const list = await db
    .select({
      id: comments.id,
      chapterId: comments.chapterId,
      parentId: comments.parentId,
      authorId: comments.authorId,
      authorEmail: users.email,
      text: comments.text,
      rangeStart: comments.rangeStart,
      rangeEnd: comments.rangeEnd,
      isResolved: comments.isResolved,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.chapterId, chapterId))
    .orderBy(comments.createdAt)
    .all();

  return c.json(list);
});

// POST /api/books/:bookId/chapters/:chapterId/comments
commentsRoutes.post('/', async (c) => {
  const chapterId = c.req.param('chapterId');
  const body = await c.req.json<{
    text: string;
    rangeStart?: number;
    rangeEnd?: number;
    parentId?: string;
    guestName?: string;
  }>();

  const db = createDb(c.env.DB);

  // Check if chapter exists
  const chapter = await db.select().from(chapters).where(eq(chapters.id, chapterId)).get();
  if (!chapter) {
    return c.json({ error: 'Chapter not found' }, 404);
  }

  // Parse authorization token if present
  let userId = 'guest-reader-id';
  let email = 'guest@bookos.dev';

  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = await verifyToken(token, c.env.JWT_SECRET);
      userId = payload.sub as string;
      email = payload.email as string;
    } catch {
      // Fallback to guest
    }
  }

  // If using the guest fallback, ensure the guest user exists in the database
  if (userId === 'guest-reader-id') {
    const guestUser = await db.select().from(users).where(eq(users.id, 'guest-reader-id')).get();
    if (!guestUser) {
      await db.insert(users).values({
        id: 'guest-reader-id',
        email: 'guest@bookos.dev',
        passwordHash: 'no-password',
        plan: 'free',
        createdAt: nowMs(),
        updatedAt: nowMs(),
      });
    }
  }

  // Format text to embed guest name if guestName is provided
  let commentText = body.text;
  if (userId === 'guest-reader-id' && body.guestName) {
    commentText = `[Guest: ${body.guestName.trim()}] ${body.text}`;
  }

  const id = generateUUID();
  const now = nowMs();

  await db.insert(comments).values({
    id,
    chapterId,
    parentId: body.parentId || null,
    authorId: userId,
    text: commentText,
    rangeStart: body.rangeStart ?? 0,
    rangeEnd: body.rangeEnd ?? 0,
    isResolved: 0,
    createdAt: now,
  });

  return c.json({
    id,
    chapterId,
    parentId: body.parentId || null,
    authorId: userId,
    authorEmail: email,
    text: commentText,
    rangeStart: body.rangeStart ?? 0,
    rangeEnd: body.rangeEnd ?? 0,
    isResolved: 0,
    createdAt: now,
  }, 201);
});
