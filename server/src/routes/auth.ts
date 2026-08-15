import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { getDb, schema } from '../db/index.js';
import { env } from '../lib/env.js';
import { hashPin, isLegacyHash, verifyPin } from '../lib/pin.js';
import { signSessionToken } from '../lib/session-token.js';
import { SESSION_COOKIE } from '../middleware/session.js';

export const authRouter = Router();

const LoginBody = z.object({
  userId: z.string().min(3),
  pin: z.string().min(4).max(32),
});

const MAX_FAILED = 5;
const LOCK_MS = 1000 * 60 * 30;

function sessionCookieOptions() {
  const maxAgeMs = env.SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const secure = process.env.NODE_ENV === 'production' || process.env.FORCE_SECURE_COOKIES === '1';
  return { maxAgeMs, secure };
}

authRouter.post('/auth/login', async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_body' });
    return;
  }
  const { userId, pin } = parsed.data;
  const { db } = await getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (!user) {
    res.status(401).json({ error: 'invalid_credentials' });
    return;
  }
  if (user.lockedUntil && user.lockedUntil > Date.now()) {
    res.status(423).json({ error: 'locked' });
    return;
  }
  if (!user.pinHash || !verifyPin(pin, user.pinHash)) {
    const failed = user.failedAttempts + 1;
    const update: Partial<typeof schema.users.$inferInsert> = { failedAttempts: failed };
    if (failed >= MAX_FAILED) {
      update.lockedUntil = Date.now() + LOCK_MS;
      update.failedAttempts = 0;
    }
    await db.update(schema.users).set(update).where(eq(schema.users.id, user.id)).run();
    res.status(401).json({ error: 'invalid_credentials', attemptsBeforeLock: MAX_FAILED });
    return;
  }
  const update: Partial<typeof schema.users.$inferInsert> = { failedAttempts: 0 };
  if (isLegacyHash(user.pinHash)) {
    update.pinHash = hashPin(pin);
    update.pinRotatedAt = Date.now();
  }
  await db.update(schema.users).set(update).where(eq(schema.users.id, user.id)).run();

  const { maxAgeMs, secure } = sessionCookieOptions();
  const token = await signSessionToken(
    { userId: user.id, role: user.role, name: user.name },
    env.SESSION_SECRET
  );
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: maxAgeMs,
  });
  res.json({
    user: { id: user.id, name: user.name, role: user.role },
  });
});

authRouter.post('/auth/logout', (_req, res) => {
  const { secure } = sessionCookieOptions();
  res.clearCookie(SESSION_COOKIE, { path: '/', httpOnly: true, sameSite: 'lax', secure });
  res.json({ ok: true });
});

authRouter.get('/auth/me', (req, res) => {
  if (!req.auth) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  res.json({
    user: {
      id: req.auth.userId,
      name: req.auth.name,
      role: req.auth.role,
    },
  });
});
