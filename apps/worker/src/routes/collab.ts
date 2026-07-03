import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import type { Env, AuthContext } from '../types/env';
import { createDb } from '../db/client';
import { books, collabSessions } from '../db/schema';
import { authMiddleware } from '../middleware/auth.middleware';
import { generateUUID, nowMs } from '../utils/helpers';
import { sendCollaborationInviteEmail } from '../services/email.service';

type CollabApp = Hono<{ Bindings: Env; Variables: { user: AuthContext } }>;

export const collabRoutes: CollabApp = new Hono();

collabRoutes.use('/*', authMiddleware);

async function assertBookOwner(db: any, bookId: string, userId: string) {
  const book = await db.select({ ownerId: books.ownerId }).from(books).where(eq(books.id, bookId)).get();
  return book?.ownerId === userId;
}

collabRoutes.get('/', async (c) => {
  const bookId = c.req.param('bookId');
  const { userId } = c.get('user');
  const db = createDb(c.env.DB);

  if (!(await assertBookOwner(db, bookId, userId))) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const list = await db
    .select()
    .from(collabSessions)
    .where(eq(collabSessions.bookId, bookId))
    .all();

  return c.json(list);
});

collabRoutes.post('/invite', async (c) => {
  const bookId = c.req.param('bookId');
  const { userId, email: inviterEmail } = c.get('user');
  const body = await c.req.json<{ email: string; permission?: string }>();
  const db = createDb(c.env.DB);

  if (!(await assertBookOwner(db, bookId, userId))) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const book = await db.select().from(books).where(eq(books.id, bookId)).get();
  if (!book) {
    return c.json({ error: 'Book not found' }, 404);
  }

  const invitedEmail = body.email.toLowerCase().trim();
  const permission = body.permission || 'reviewer';

  const id = generateUUID();
  const now = nowMs();
  const expiresAt = now + 7 * 24 * 60 * 60 * 1000;

  await db.insert(collabSessions).values({
    id,
    bookId,
    invitedEmail,
    permission,
    invitedBy: userId,
    createdAt: now,
    expiresAt,
  });

  const inviteUrl = `${c.env.CORS_ORIGIN || 'http://localhost:4200'}/shared/${id}`;
  if (c.env.RESEND_API_KEY) {
    await sendCollaborationInviteEmail(
      invitedEmail,
      inviterEmail || 'An author',
      book.title,
      inviteUrl,
      c.env.RESEND_API_KEY
    );
  } else {
    console.warn('RESEND_API_KEY is not configured. Invite link:', inviteUrl);
  }

  return c.json({ id, invitedEmail, permission, expiresAt }, 201);
});

collabRoutes.post('/accept', async (c) => {
  const body = await c.req.json<{ token: string }>();
  const db = createDb(c.env.DB);

  const session = await db
    .select()
    .from(collabSessions)
    .where(eq(collabSessions.id, body.token))
    .get();

  if (!session) {
    return c.json({ error: 'Invitation not found' }, 404);
  }

  if (session.expiresAt < nowMs()) {
    return c.json({ error: 'Invitation expired' }, 410);
  }

  await db
    .update(collabSessions)
    .set({ acceptedAt: nowMs() })
    .where(eq(collabSessions.id, body.token));

  return c.json({ success: true, bookId: session.bookId });
});

collabRoutes.delete('/:collabSessionId', async (c) => {
  const bookId = c.req.param('bookId');
  const collabSessionId = c.req.param('collabSessionId');
  const { userId } = c.get('user');
  const db = createDb(c.env.DB);

  if (!(await assertBookOwner(db, bookId, userId))) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  await db.delete(collabSessions).where(and(eq(collabSessions.id, collabSessionId), eq(collabSessions.bookId, bookId)));
  return new Response(null, { status: 204 });
});

collabRoutes.get('/invite/:token', async (c) => {
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

  const book = await db.select({ title: books.title }).from(books).where(eq(books.id, session.bookId)).get();

  return c.json({
    email: session.invitedEmail,
    permission: session.permission,
    bookTitle: book?.title || 'Untitled Book',
  });
});

collabRoutes.get('/ws', async (c) => {
  const bookId = c.req.param('bookId');
  
  // Connect/Fetch the Durable Object collab room instance
  const id = c.env.COLLAB_ROOM.idFromName(bookId);
  const obj = c.env.COLLAB_ROOM.get(id);
  
  return obj.fetch(c.req.raw);
});
