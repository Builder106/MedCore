import { desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { getDb, schema } from '../db/index.js';
import { newId } from '../lib/ids.js';

export const consentRouter = Router();

consentRouter.get('/consent', async (req, res) => {
  const { db } = await getDb();
  const Q = z.object({ patientId: z.string().optional(), grantedTo: z.string().optional() });
  const parsed = Q.parse(req.query);
  const where = parsed.patientId
    ? eq(schema.consentGrants.patientId, parsed.patientId)
    : parsed.grantedTo
      ? eq(schema.consentGrants.grantedTo, parsed.grantedTo)
      : undefined;
  const rows = await db
    .select()
    .from(schema.consentGrants)
    .where(where)
    .orderBy(desc(schema.consentGrants.grantedAt));
  res.json({ grants: rows.map(g => ({ ...g, sections: safeJsonArray(g.sections) })) });
});

function safeJsonArray(s: string): string[] {
  try {
    const p = JSON.parse(s);
    return Array.isArray(p) ? p.map(String) : [];
  } catch {
    return [];
  }
}

const CreateBody = z.object({
  patientId: z.string(),
  grantedTo: z.string(),
  grantedToType: z.enum(['doctor', 'facility']).default('doctor'),
  sections: z.array(z.string()).default([]),
  expiresAt: z.number().optional(),
});

consentRouter.post('/consent', async (req, res) => {
  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { db } = await getDb();
  const id = newId('CNT');
  await db
    .insert(schema.consentGrants)
    .values({
      id,
      patientId: parsed.data.patientId,
      grantedTo: parsed.data.grantedTo,
      grantedToType: parsed.data.grantedToType,
      sections: JSON.stringify(parsed.data.sections),
      expiresAt: parsed.data.expiresAt,
      status: 'active',
      grantedAt: Date.now(),
    })
    .run();
  res.status(201).json({ id });
});

consentRouter.delete('/consent/:id', async (req, res) => {
  const { db } = await getDb();
  await db
    .update(schema.consentGrants)
    .set({ status: 'revoked', revokedAt: Date.now() })
    .where(eq(schema.consentGrants.id, req.params.id))
    .run();
  res.json({ ok: true });
});
