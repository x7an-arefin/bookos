import type { Context, MiddlewareHandler, Next } from 'hono';
import type { Env, AuthContext } from '../types/env';
import { verifyToken } from '../services/jwt.service';
import { isSessionActive } from '../services/session.service';

export const authMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: { user: AuthContext } }> = async (
  c: Context<{ Bindings: Env; Variables: { user: AuthContext } }>,
  next: Next
) => {
  let token = '';
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else {
    token = c.req.query('token') || '';
  }

  if (!token) {
    return c.json({ error: 'Authorization token required.' }, 401);
  }

  let payload: any;
  try {
    payload = await verifyToken(token, c.env.JWT_SECRET);
  } catch {
    return c.json({ error: 'Invalid or expired token.' }, 401);
  }

  const jti = payload.jti as string;
  const active = await isSessionActive(c.env.SESSION_KV, jti);
  if (!active) {
    return c.json({ error: 'Session has been revoked.' }, 401);
  }

  c.set('user', {
    userId: payload.sub as string,
    email: payload.email as string,
    plan: payload.plan as string,
    jti,
  });

  await next();
};
