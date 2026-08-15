import type { NextFunction, Request, Response } from 'express';
import { getDb, schema } from '../db/index.js';
import { newId } from '../lib/ids.js';
import { isPublicApiPath } from './session.js';

const SKIP_PATHS = new Set(['/health', '/auth/me', '/push/vapid']);

function extractPatientId(path: string, body: unknown): string | null {
  const match = path.match(/\/patients\/([^/]+)/);
  if (match) return match[1];
  if (body && typeof body === 'object' && 'patientId' in body) {
    const val = (body as { patientId?: unknown }).patientId;
    if (typeof val === 'string') return val;
  }
  return null;
}

function deriveAction(method: string, path: string): string {
  if (path.startsWith('/auth/login')) return 'auth.login';
  if (path.startsWith('/auth/logout')) return 'auth.logout';
  if (method === 'GET') return 'read';
  if (method === 'POST') return 'create';
  if (method === 'PATCH' || method === 'PUT') return 'update';
  if (method === 'DELETE') return 'delete';
  return method.toLowerCase();
}

export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  if (isPublicApiPath(req.path) && !req.path.startsWith('/auth/login')) {
    next();
    return;
  }
  if (SKIP_PATHS.has(req.path)) {
    next();
    return;
  }

  const started = Date.now();
  const patientIdFromBody = extractPatientId(req.path, req.body);

  res.on('finish', () => {
    void (async () => {
      try {
        const { db } = await getDb();
        await db
          .insert(schema.auditLog)
          .values({
            id: newId('AUD'),
            userId: req.auth?.userId ?? null,
            role: req.auth?.role ?? null,
            patientId: patientIdFromBody,
            action: deriveAction(req.method, req.path),
            path: req.path,
            method: req.method,
            status: res.statusCode,
            durationMs: Date.now() - started,
            ip:
              (req.headers['x-forwarded-for'] as string | undefined) ??
              req.socket.remoteAddress ??
              null,
            createdAt: Date.now(),
          })
          .run();
      } catch (err) {
        console.error('[audit] failed to record entry', err);
      }
    })();
  });

  next();
}
