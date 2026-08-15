import { desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { getDb, schema } from '../db/index.js';
import { newId } from '../lib/ids.js';

export const referralsRouter = Router();

referralsRouter.get('/referrals', async (req, res) => {
  const { db } = await getDb();
  const Q = z.object({ patientId: z.string().optional(), doctorId: z.string().optional() });
  const parsed = Q.parse(req.query);
  const where = parsed.patientId
    ? eq(schema.referrals.patientId, parsed.patientId)
    : parsed.doctorId
      ? eq(schema.referrals.fromDoctorId, parsed.doctorId)
      : undefined;
  const rows = await db
    .select()
    .from(schema.referrals)
    .where(where)
    .orderBy(desc(schema.referrals.createdAt));
  res.json({ referrals: rows });
});

const CreateBody = z.object({
  patientId: z.string(),
  fromDoctorId: z.string(),
  toDoctorId: z.string().optional(),
  toFacility: z.string().optional(),
  specialty: z.string().optional(),
  urgency: z.enum(['routine', 'urgent', 'emergency']).default('routine'),
  reason: z.string().min(1),
});

referralsRouter.post('/referrals', async (req, res) => {
  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { db } = await getDb();
  const id = newId('REF');
  await db
    .insert(schema.referrals)
    .values({
      id,
      ...parsed.data,
      status: 'pending',
      createdAt: Date.now(),
    })
    .run();
  res.status(201).json({ id });
});

const StatusBody = z.object({ status: z.enum(['accepted', 'completed', 'declined']) });

referralsRouter.patch('/referrals/:id/status', async (req, res) => {
  const parsed = StatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { db } = await getDb();
  await db
    .update(schema.referrals)
    .set({ status: parsed.data.status, respondedAt: Date.now() })
    .where(eq(schema.referrals.id, req.params.id))
    .run();
  res.json({ ok: true });
});
