import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export interface AccessTokenPayload extends JWTPayload {
  sub: string;
  email: string;
  plan: string;
  jti: string;
}

export interface RefreshTokenPayload extends JWTPayload {
  sub: string;
  jti: string;
}

function getSecret(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(
  userId: string,
  email: string,
  plan: string,
  jti: string,
  secret: string
): Promise<string> {
  return new SignJWT({ email, plan })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getSecret(secret));
}

export async function signRefreshToken(
  userId: string,
  jti: string,
  secret: string
): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret(secret));
}

export async function verifyToken(token: string, secret: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, getSecret(secret));
  return payload;
}
