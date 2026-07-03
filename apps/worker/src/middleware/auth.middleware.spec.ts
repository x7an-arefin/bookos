import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { authMiddleware } from './auth.middleware';
import { signAccessToken } from '../services/jwt.service';
import { env } from 'cloudflare:test';
import { SignJWT } from 'jose';

const TEST_SECRET = 'my-super-secret-key-must-be-long-enough-32-chars';

describe('auth.middleware', () => {
  it('passes through on valid JWT and active KV session', async () => {
    const app = new Hono<{ Bindings: any }>();
    app.get('/test', authMiddleware, (c) => c.text('success'));

    const userId = 'u123';
    const jti = 'jti1';
    
    const token = await signAccessToken(userId, 'user@example.com', 'free', jti, TEST_SECRET);
    await env.SESSION_KV.put(`session:${jti}`, userId);

    const req = new Request('http://localhost/test', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const res = await app.request(req, {}, {
      SESSION_KV: env.SESSION_KV,
      JWT_SECRET: TEST_SECRET
    });

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('success');
  });

  it('returns 401 on valid JWT but missing KV entry (revoked)', async () => {
    const app = new Hono<{ Bindings: any }>();
    app.get('/test', authMiddleware, (c) => c.text('success'));

    const token = await signAccessToken('u123', 'user@example.com', 'free', 'jti2', TEST_SECRET);

    const req = new Request('http://localhost/test', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const res = await app.request(req, {}, {
      SESSION_KV: env.SESSION_KV,
      JWT_SECRET: TEST_SECRET
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Session has been revoked.' });
  });

  it('returns 401 on expired JWT', async () => {
    const app = new Hono<{ Bindings: any }>();
    app.get('/test', authMiddleware, (c) => c.text('success'));

    const expiredToken = await new SignJWT({ email: 'user@example.com', plan: 'free' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('u123')
      .setJti('jti3')
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(new TextEncoder().encode(TEST_SECRET));

    const req = new Request('http://localhost/test', {
      headers: {
        'Authorization': `Bearer ${expiredToken}`
      }
    });

    const res = await app.request(req, {}, {
      SESSION_KV: env.SESSION_KV,
      JWT_SECRET: TEST_SECRET
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Invalid or expired token.' });
  });

  it('returns 401 on malformed JWT', async () => {
    const app = new Hono<{ Bindings: any }>();
    app.get('/test', authMiddleware, (c) => c.text('success'));

    const req = new Request('http://localhost/test', {
      headers: {
        'Authorization': 'Bearer malformed.token.here'
      }
    });

    const res = await app.request(req, {}, {
      SESSION_KV: env.SESSION_KV,
      JWT_SECRET: TEST_SECRET
    });

    expect(res.status).toBe(401);
  });

  it('returns 401 on missing Authorization header', async () => {
    const app = new Hono<{ Bindings: any }>();
    app.get('/test', authMiddleware, (c) => c.text('success'));

    const req = new Request('http://localhost/test');

    const res = await app.request(req, {}, {
      SESSION_KV: env.SESSION_KV,
      JWT_SECRET: TEST_SECRET
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authorization token required.' });
  });
});
