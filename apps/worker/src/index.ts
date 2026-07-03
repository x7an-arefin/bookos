import { Hono } from 'hono';
export { BookCollabRoom } from './durable-objects/book-collab-room';
import { cors } from 'hono/cors';
import type { Env } from './types/env';
import { authRoutes } from './routes/auth';
import { booksRoutes } from './routes/books';
import { chaptersRoutes } from './routes/chapters';
import { syncRoutes } from './routes/sync';
import { snapshotsRoutes } from './routes/snapshots';
import { collabRoutes } from './routes/collab';
import { collabPublicRoutes } from './routes/collab-public';
import { commentsRoutes } from './routes/comments';

const app = new Hono<{ Bindings: Env }>();

app.use('/*', async (c, next) => {
  const corsMiddleware = cors({
    origin: c.env.CORS_ORIGIN ?? 'http://localhost:4200',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
  return corsMiddleware(c, next);
});

app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error.' }, 500);
});

app.notFound((c) => {
  return c.json({ error: 'Not found.' }, 404);
});

app.get('/api/health', (c) => c.json({ status: 'ok', ts: Date.now() }));

app.route('/api/auth', authRoutes);
app.route('/api/books', booksRoutes);
app.route('/api/books/:bookId/chapters', chaptersRoutes);
app.route('/api/sync', syncRoutes);
app.route('/api/books/:bookId/snapshots', snapshotsRoutes);
app.route('/api/books/:bookId/collab', collabRoutes);
app.route('/api/collab', collabPublicRoutes);
app.route('/api/books/:bookId/chapters/:chapterId/comments', commentsRoutes);

export default app;
