import { Hono } from 'hono';
import { eq, and, isNull } from 'drizzle-orm';
import type { Env, AuthContext } from '../types/env';
import { createDb } from '../db/client';
import { users, sessions } from '../db/schema';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../services/password.service';
import { signAccessToken, signRefreshToken, verifyToken } from '../services/jwt.service';
import { storeSession, revokeSession, isSessionActive, isRefreshActive } from '../services/session.service';
import { checkLoginRateLimit } from '../services/rate-limiter.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { generateUUID, nowMs, msFromNow, DAY_MS, THIRTY_DAYS_MS } from '../utils/helpers';
import { sendPasswordResetEmail } from '../services/email.service';

type AuthApp = Hono<{ Bindings: Env; Variables: { user: AuthContext } }>;

export const authRoutes: AuthApp = new Hono();

authRoutes.post('/register', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();

  if (!body.email || !body.password) {
    return c.json({ error: 'Email and password are required.' }, 400);
  }

  const email = body.email.toLowerCase().trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return c.json({ error: 'Invalid email format.' }, 422);
  }

  const strength = validatePasswordStrength(body.password);
  if (!strength.valid) {
    return c.json({ error: strength.reason }, 422);
  }

  const db = createDb(c.env.DB);
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).get();
  if (existing) {
    return c.json({ error: 'An account with this email already exists.' }, 409);
  }

  const userId = generateUUID();
  const now = nowMs();
  const passwordHash = await hashPassword(body.password);

  await db.insert(users).values({
    id: userId,
    email,
    passwordHash,
    plan: 'free',
    createdAt: now,
    updatedAt: now,
  });

  const accessJti = generateUUID();
  const refreshJti = generateUUID();
  const refreshExpiresAt = msFromNow(THIRTY_DAYS_MS);

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(userId, email, 'free', accessJti, c.env.JWT_SECRET),
    signRefreshToken(userId, refreshJti, c.env.JWT_SECRET),
  ]);

  const deviceHint = c.req.header('User-Agent')?.slice(0, 120);
  await storeSession(c.env.SESSION_KV, db, userId, accessJti, refreshJti, refreshExpiresAt, deviceHint);

  return c.json({ access_token: accessToken, refresh_token: refreshToken, user: { id: userId, email, plan: 'free' } }, 201);
});

authRoutes.post('/login', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();

  if (!body.email || !body.password) {
    return c.json({ error: 'Email and password are required.' }, 400);
  }

  const ip = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? 'unknown';
  const rateLimit = await checkLoginRateLimit(c.env.RATE_KV, ip);
  if (rateLimit.blocked) {
    return c.json({ error: 'Too many login attempts. Please try again later.' }, 429);
  }

  const email = body.email.toLowerCase().trim();
  const db = createDb(c.env.DB);
  const user = await db.select().from(users).where(eq(users.email, email)).get();

  const genericError = { error: 'Invalid email or password.' };
  if (!user || user.deletedAt) {
    return c.json(genericError, 401);
  }

  const valid = await verifyPassword(body.password, user.passwordHash);
  if (!valid) {
    return c.json(genericError, 401);
  }

  const accessJti = generateUUID();
  const refreshJti = generateUUID();
  const refreshExpiresAt = msFromNow(THIRTY_DAYS_MS);

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(user.id, user.email, user.plan, accessJti, c.env.JWT_SECRET),
    signRefreshToken(user.id, refreshJti, c.env.JWT_SECRET),
  ]);

  const deviceHint = c.req.header('User-Agent')?.slice(0, 120);
  await storeSession(c.env.SESSION_KV, db, user.id, accessJti, refreshJti, refreshExpiresAt, deviceHint);

  return c.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    user: { id: user.id, email: user.email, plan: user.plan },
  });
});

authRoutes.post('/refresh', async (c) => {
  const body = await c.req.json<{ refresh_token?: string }>();

  if (!body.refresh_token) {
    return c.json({ error: 'Refresh token is required.' }, 400);
  }

  let payload: any;
  try {
    payload = await verifyToken(body.refresh_token, c.env.JWT_SECRET);
  } catch {
    return c.json({ error: 'Invalid or expired refresh token.' }, 401);
  }

  const oldJti = payload.jti as string;
  const active = await isRefreshActive(c.env.SESSION_KV, oldJti);
  if (!active) {
    return c.json({ error: 'Session has been revoked.' }, 401);
  }

  const userId = payload.sub as string;
  const db = createDb(c.env.DB);
  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user || user.deletedAt) {
    return c.json({ error: 'User not found.' }, 401);
  }

  const newAccessJti = generateUUID();
  const newRefreshJti = generateUUID();
  const refreshExpiresAt = msFromNow(THIRTY_DAYS_MS);

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(user.id, user.email, user.plan, newAccessJti, c.env.JWT_SECRET),
    signRefreshToken(user.id, newRefreshJti, c.env.JWT_SECRET),
    revokeSession(c.env.SESSION_KV, db, oldJti),
  ]);

  const deviceHint = c.req.header('User-Agent')?.slice(0, 120);
  await storeSession(c.env.SESSION_KV, db, user.id, newAccessJti, newRefreshJti, refreshExpiresAt, deviceHint);

  return c.json({ access_token: accessToken, refresh_token: refreshToken });
});

authRoutes.post('/logout', authMiddleware, async (c) => {
  const { jti } = c.get('user');
  const db = createDb(c.env.DB);
  await revokeSession(c.env.SESSION_KV, db, jti);
  return new Response(null, { status: 204 });
});

authRoutes.get('/me', authMiddleware, async (c) => {
  const { userId } = c.get('user');
  const db = createDb(c.env.DB);
  const user = await db
    .select({ id: users.id, email: users.email, plan: users.plan, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!user) {
    return c.json({ error: 'User not found.' }, 404);
  }

  return c.json(user);
});

authRoutes.patch('/me', authMiddleware, async (c) => {
  const { userId } = c.get('user');
  const body = await c.req.json<{ password?: string }>();

  if (!body.password) {
    return c.json({ error: 'No fields to update.' }, 400);
  }

  const strength = validatePasswordStrength(body.password);
  if (!strength.valid) {
    return c.json({ error: strength.reason }, 422);
  }

  const db = createDb(c.env.DB);
  const now = nowMs();
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(body.password), updatedAt: now })
    .where(eq(users.id, userId));

  return c.json({ success: true });
});

authRoutes.get('/sessions', authMiddleware, async (c) => {
  const { userId } = c.get('user');
  const db = createDb(c.env.DB);
  const list = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
    .all();
  return c.json(list);
});

authRoutes.delete('/sessions/:jti', authMiddleware, async (c) => {
  const { userId } = c.get('user');
  const targetJti = c.req.param('jti');
  const db = createDb(c.env.DB);
  
  const session = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.jti, targetJti), eq(sessions.userId, userId)))
    .get();

  if (!session) {
    return c.json({ error: 'Session not found.' }, 404);
  }

  await revokeSession(c.env.SESSION_KV, db, targetJti);
  return new Response(null, { status: 204 });
});

authRoutes.post('/forgot-password', async (c) => {
  const body = await c.req.json<{ email?: string }>();
  if (!body.email) {
    return c.json({ error: 'Email is required.' }, 400);
  }

  const email = body.email.toLowerCase().trim();
  const db = createDb(c.env.DB);
  const user = await db.select().from(users).where(eq(users.email, email)).get();

  // Protect against email enumeration
  if (!user || user.deletedAt) {
    return c.json({ success: true });
  }

  const resetToken = generateUUID();
  await c.env.SESSION_KV.put(`reset:${resetToken}`, user.id, { expirationTtl: 3600 });

  const resetLink = `${c.env.CORS_ORIGIN || 'http://localhost:4200'}/auth/reset-password?token=${resetToken}`;
  
  if (c.env.RESEND_API_KEY) {
    await sendPasswordResetEmail(email, resetLink, c.env.RESEND_API_KEY);
  } else {
    console.warn('RESEND_API_KEY is not configured. Reset link:', resetLink);
  }

  return c.json({ success: true });
});

authRoutes.post('/reset-password', async (c) => {
  const body = await c.req.json<{ token?: string; new_password?: string }>();
  if (!body.token || !body.new_password) {
    return c.json({ error: 'Token and new password are required.' }, 400);
  }

  const kvKey = `reset:${body.token}`;
  const userId = await c.env.SESSION_KV.get(kvKey);
  if (!userId) {
    return c.json({ error: 'Invalid or expired reset token.' }, 400);
  }

  const strength = validatePasswordStrength(body.new_password);
  if (!strength.valid) {
    return c.json({ error: strength.reason }, 422);
  }

  const db = createDb(c.env.DB);
  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user || user.deletedAt) {
    return c.json({ error: 'User not found.' }, 404);
  }

  const passwordHash = await hashPassword(body.new_password);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: nowMs() })
    .where(eq(users.id, userId));

  await c.env.SESSION_KV.delete(kvKey);

  return c.json({ success: true });
});

