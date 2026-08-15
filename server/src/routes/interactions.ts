import { desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { getDb, schema } from '../db/index.js';
import { newId } from '../lib/ids.js';
import { resolveInteraction } from '../lib/interactions.js';
import { verifyPin } from '../lib/pin.js';

export const interactionsRouter = Router();

interactionsRouter.get('/interactions', async (req, res) => {
  const Q = z.object({ drug1: z.string().min(1), drug2: z.string().min(1) });
  const parsed = Q.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'drug1 and drug2 query params required' });
    return;
  }
  const result = await resolveInteraction(parsed.data.drug1, parsed.data.drug2);
  res.json(result);
});

const LogBody = z.object({
  patientId: z.string(),
  doctorId: z.string(),
  drugA: z.string(),
  drugB: z.string(),
  level: z.enum(['critical', 'warning', 'info']),
  message: z.string(),
  source: z.enum(['openfda', 'rxnorm', 'fallback']).default('fallback'),
  overridden: z.boolean().default(false),
  overrideReason: z.string().optional(),
  pin: z.string().optional(),
});

interactionsRouter.post('/interactions/events', async (req, res) => {
  const parsed = LogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { db } = await getDb();
  if (parsed.data.overridden) {
    if (!parsed.data.pin) {
      res.status(400).json({ error: 'PIN required to override interaction' });
      return;
    }
    const [doctor] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, parsed.data.doctorId));
    if (!doctor || doctor.role !== 'doctor' || !verifyPin(parsed.data.pin, doctor.pinHash)) {
      res.status(403).json({ error: 'Invalid PIN for override' });
      return;
    }
  }
  const id = newId('IXE');
  await db
    .insert(schema.interactionEvents)
    .values({
      id,
      patientId: parsed.data.patientId,
      doctorId: parsed.data.doctorId,
      drugA: parsed.data.drugA,
      drugB: parsed.data.drugB,
      level: parsed.data.level,
      message: parsed.data.message,
      source: parsed.data.source,
      overridden: parsed.data.overridden ? 1 : 0,
      overrideReason: parsed.data.overrideReason,
      createdAt: Date.now(),
    })
    .run();
  res.status(201).json({ id });
});

interactionsRouter.get('/patients/:patientId/interactions', async (req, res) => {
  const { db } = await getDb();
  const events = await db
    .select()
    .from(schema.interactionEvents)
    .where(eq(schema.interactionEvents.patientId, req.params.patientId))
    .orderBy(desc(schema.interactionEvents.createdAt));
  res.json({ events });
});
