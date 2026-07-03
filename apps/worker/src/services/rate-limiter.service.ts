const MAX_ATTEMPTS = 10;
const WINDOW_SECONDS = 15 * 60;

export interface RateLimitResult {
  blocked: boolean;
  remaining: number;
}

export async function checkLoginRateLimit(
  kv: KVNamespace,
  ip: string
): Promise<RateLimitResult> {
  const key = `rate:login:${ip}`;
  const raw = await kv.get(key);
  const count = raw ? parseInt(raw, 10) : 0;

  if (count >= MAX_ATTEMPTS) {
    return { blocked: true, remaining: 0 };
  }

  const newCount = count + 1;
  await kv.put(key, String(newCount), { expirationTtl: WINDOW_SECONDS });

  return { blocked: false, remaining: MAX_ATTEMPTS - newCount };
}
