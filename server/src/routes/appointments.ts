import { and, desc, eq, gte } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { getDb, schema } from '../db/index.js';
import { newId } from '../lib/ids.js';

export const appointmentsRouter = Router();

appointmentsRouter.get('/appointments', async (req, res) => {
  const Q = z.object({
    doctorId: z.string().optional(),
    patientId: z.string().optional(),
    from: z.coerce.number().optional(),
  });
  const parsed = Q.parse(req.query);
  const { db } = await getDb();
  const conditions = [];
  if (parsed.doctorId) conditions.push(eq(schema.appointments.doctorId, parsed.doctorId));
  if (parsed.patientId) conditions.push(eq(schema.appointments.patientId, parsed.patientId));
  if (parsed.from) conditions.push(gte(schema.appointments.scheduledFor, parsed.from));
  const rows = await db
    .select()
    .from(schema.appointments)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(schema.appointments.scheduledFor));
  res.json({ appointments: rows });
});

appointmentsRouter.get('/patients/:patientId/appointments', async (req, res) => {
  const { db } = await getDb();
  const rows = await db
    .select()
    .from(schema.appointments)
    .where(eq(schema.appointments.patientId, req.params.patientId))
    .orderBy(desc(schema.appointments.scheduledFor));
  res.json({ appointments: rows });
});

const CreateBody = z.object({
  patientId: z.string(),
  doctorId: z.string(),
  facilityId: z.string().optional(),
  scheduledFor: z.number(),
  durationMin: z.number().int().positive().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

appointmentsRouter.post('/appointments', async (req, res) => {
  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { db } = await getDb();
  const id = newId('APT');
  await db
    .insert(schema.appointments)
    .values({
      id,
      patientId: parsed.data.patientId,
      doctorId: parsed.data.doctorId,
      facilityId: parsed.data.facilityId,
      scheduledFor: parsed.data.scheduledFor,
      durationMin: parsed.data.durationMin ?? 20,
      reason: parsed.data.reason,
      notes: parsed.data.notes,
      status: 'scheduled',
      createdAt: Date.now(),
    })
    .run();
  res.status(201).json({ id });
});

const PatchBody = z.object({
  status: z.enum(['scheduled', 'checked_in', 'completed', 'cancelled', 'no_show']).optional(),
  notes: z.string().optional(),
  scheduledFor: z.number().optional(),
});

appointmentsRouter.patch('/appointments/:id', async (req, res) => {
  const parsed = PatchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { db } = await getDb();
  await db
    .update(schema.appointments)
    .set(parsed.data)
    .where(eq(schema.appointments.id, req.params.id))
    .run();
  res.json({ ok: true });
});
