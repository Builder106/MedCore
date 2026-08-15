import { SignJWT, jwtVerify } from 'jose';

const alg = 'HS256';

export interface SessionClaims {
  userId: string;
  role: string;
  name: string;
}

export async function signSessionToken(claims: SessionClaims, secret: string): Promise<string> {
  const enc = new TextEncoder().encode(secret);
  return new SignJWT({ role: claims.role, name: claims.name })
    .setProtectedHeader({ alg })
    .setSubject(claims.userId)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(enc);
}

export async function verifySessionToken(
  token: string,
  secret: string
): Promise<SessionClaims | null> {
  try {
    const enc = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, enc, { algorithms: [alg] });
    const sub = payload.sub;
    const role = payload.role;
    const name = payload.name;
    if (typeof sub !== 'string' || typeof role !== 'string' || typeof name !== 'string')
      return null;
    return { userId: sub, role, name };
  } catch {
    return null;
  }
}

export function readCookieHeader(
  cookieHeader: string | undefined,
  name: string
): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (k !== name) continue;
    return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return undefined;
}
