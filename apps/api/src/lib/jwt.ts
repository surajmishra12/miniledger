/**
 * Access tokens: HS256 JWT, 15 minutes (architecture.md §7.3).
 */
import { jwtVerify, SignJWT } from 'jose';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const ISSUER = 'miniledger-api';
const AUDIENCE = 'miniledger-mobile';

const keyFor = (secret: string) => new TextEncoder().encode(secret);

export async function signAccessToken(
  secret: string,
  claims: { userId: string; sessionId: string },
  now: Date,
): Promise<{ token: string; expiresAt: Date }> {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const expiresAtSeconds = issuedAt + ACCESS_TOKEN_TTL_SECONDS;
  const token = await new SignJWT({ sid: claims.sessionId })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(claims.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAtSeconds)
    .sign(keyFor(secret));
  return { token, expiresAt: new Date(expiresAtSeconds * 1000) };
}

/** Returns the claims, or null for any invalid, expired or malformed token. */
export async function verifyAccessToken(
  secret: string,
  token: string,
  now: Date,
): Promise<{ userId: string; sessionId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, keyFor(secret), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256'],
      currentDate: now,
    });
    if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') return null;
    return { userId: payload.sub, sessionId: payload.sid };
  } catch {
    return null;
  }
}
