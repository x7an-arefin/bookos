import { describe, it, expect } from 'vitest';
import { SignJWT } from 'jose';
import { signAccessToken, signRefreshToken, verifyToken } from './jwt.service';

const TEST_SECRET = 'my-super-secret-key-must-be-long-enough-32-chars';

describe('jwt.service', () => {
  it('signAccessToken produces a JWT that decodes to the correct payload', async () => {
    const token = await signAccessToken('userId1', 'user@example.com', 'free', 'jti1', TEST_SECRET);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const decoded = await verifyToken(token, TEST_SECRET);
    expect(decoded.sub).toBe('userId1');
    expect(decoded.email).toBe('user@example.com');
    expect(decoded.plan).toBe('free');
    expect(decoded.jti).toBe('jti1');
  });

  it('signRefreshToken produces a valid refresh token', async () => {
    const token = await signRefreshToken('userId1', 'jti2', TEST_SECRET);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const decoded = await verifyToken(token, TEST_SECRET);
    expect(decoded.sub).toBe('userId1');
    expect(decoded.jti).toBe('jti2');
  });

  it('verifyToken rejects an expired token', async () => {
    const expiredToken = await new SignJWT({ email: 'user@example.com' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(new TextEncoder().encode(TEST_SECRET));
    
    await expect(verifyToken(expiredToken, TEST_SECRET)).rejects.toThrow();
  });

  it('verifyToken rejects a tampered signature', async () => {
    const token = await signAccessToken('userId1', 'user@example.com', 'free', 'jti1', TEST_SECRET);
    const tampered = token + 'a';
    await expect(verifyToken(tampered, TEST_SECRET)).rejects.toThrow();
  });
});
