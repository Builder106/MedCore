import type { NextFunction, Request, Response } from 'express';
import { env } from '../lib/env.js';
import { readCookieHeader, verifySessionToken } from '../lib/session-token.js';

export const SESSION_COOKIE = 'mc_session';

declare global {
  namespace Express {
    interface Request {
      auth?: { userId: string; role: string; name: string };
    }
  }
}

export async function sessionMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.auth = undefined;
  const raw = readCookieHeader(req.headers.cookie, SESSION_COOKIE);
  if (!raw) {
    next();
    return;
  }
  const claims = await verifySessionToken(raw, env.SESSION_SECRET);
  if (claims) {
    req.auth = { userId: claims.userId, role: claims.role, name: claims.name };
  }
  next();
}

export function isPublicApiPath(path: string): boolean {
  if (path === '/health') return true;
  if (path === '/auth/login' || path === '/auth/logout') return true;
  if (path === '/sms/inbound') return true;
  return false;
}

export function requireApiSession(req: Request, res: Response, next: NextFunction) {
  if (isPublicApiPath(req.path)) {
    next();
    return;
  }
  if (req.auth) {
    next();
    return;
  }
  res.status(401).json({ error: 'unauthorized' });
}
