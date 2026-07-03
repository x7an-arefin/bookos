import { sessions } from '../db/schema';
import type { Database } from '../db/client';
import { eq } from 'drizzle-orm';

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const ACCESS_TTL_SECONDS = 24 * 60 * 60;

export async function storeSession(
  kv: KVNamespace,
  db: Database,
  userId: string,
  accessJti: string,
  refreshJti: string,
  expiresAt: number,
  deviceHint?: string
): Promise<void> {
  const now = Date.now();
  const ttlSeconds = Math.floor((expiresAt - now) / 1000);

  await Promise.all([
    kv.put(`session:${accessJti}`, userId, { expirationTtl: ACCESS_TTL_SECONDS }),
    kv.put(`refresh:${refreshJti}`, userId, { expirationTtl: ttlSeconds > 0 ? ttlSeconds : SESSION_TTL_SECONDS }),
    db.insert(sessions).values({
      jti: refreshJti,
      userId,
      createdAt: now,
      expiresAt,
      deviceHint: deviceHint ?? null,
    }),
  ]);
}

export async function revokeSession(
  kv: KVNamespace,
  db: Database,
  refreshJti: string,
  accessJti?: string
): Promise<void> {
  const ops: Promise<unknown>[] = [
    kv.delete(`refresh:${refreshJti}`),
    db
      .update(sessions)
      .set({ revokedAt: Date.now() })
      .where(eq(sessions.jti, refreshJti)),
  ];
  if (accessJti) {
    ops.push(kv.delete(`session:${accessJti}`));
  }
  await Promise.all(ops);
}

export async function isSessionActive(kv: KVNamespace, jti: string): Promise<boolean> {
  const value = await kv.get(`session:${jti}`);
  return value !== null;
}

export async function isRefreshActive(kv: KVNamespace, refreshJti: string): Promise<boolean> {
  const value = await kv.get(`refresh:${refreshJti}`);
  return value !== null;
}
