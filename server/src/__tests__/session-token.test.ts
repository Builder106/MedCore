import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { readCookieHeader, signSessionToken, verifySessionToken } from '../lib/session-token.js';

describe('session-token lib', () => {
  const secret = 'super-secret-key-that-is-at-least-32-chars-long';

  it('signs and verifies valid session tokens', async () => {
    const claims = { userId: 'usr-001', role: 'doctor', name: 'Dr. Sarah' };
    const token = await signSessionToken(claims, secret);

    const verified = await verifySessionToken(token, secret);
    expect(verified).toEqual(claims);
  });

  it('returns null on invalid signatures or malformed tokens', async () => {
    const claims = { userId: 'usr-001', role: 'doctor', name: 'Dr. Sarah' };
    const token = await signSessionToken(claims, secret);

    const verifiedWithWrongSecret = await verifySessionToken(
      token,
      'another-completely-different-secret-key-32ch'
    );
    expect(verifiedWithWrongSecret).toBeNull();

    expect(await verifySessionToken('invalid.token.structure', secret)).toBeNull();
  });

  it('returns null if required claims are missing or not strings', async () => {
    const enc = new TextEncoder().encode(secret);
    const tokenWithInvalidClaims = await new SignJWT({ role: 123, name: null })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(enc);

    expect(await verifySessionToken(tokenWithInvalidClaims, secret)).toBeNull();
  });

  it('parses cookies from Cookie header string', () => {
    expect(readCookieHeader(undefined, 'session')).toBeUndefined();
    expect(readCookieHeader('', 'session')).toBeUndefined();

    const header = 'theme=dark; medcore_session=jwt.token.val; other=123';
    expect(readCookieHeader(header, 'medcore_session')).toBe('jwt.token.val');
    expect(readCookieHeader(header, 'theme')).toBe('dark');
    expect(readCookieHeader(header, 'missing')).toBeUndefined();

    const headerWithInvalidParts = 'malformedPart; correct=value';
    expect(readCookieHeader(headerWithInvalidParts, 'correct')).toBe('value');
  });
});
