import { desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { getDb, schema } from '../db/index.js';
import { newId } from '../lib/ids.js';
import { resolveInteraction } from '../lib/interactions.js';
import { verifyPin } from '../lib/pin.js';

export const prescriptionsRouter = Router();

prescriptionsRouter.get('/patients/:patientId/prescriptions', async (req, res) => {
  const { db } = await getDb();
  const list = await db
    .select()
    .from(schema.prescriptions)
    .where(eq(schema.prescriptions.patientId, req.params.patientId))
    .orderBy(desc(schema.prescriptions.createdAt));
  res.json({ prescriptions: list });
});

const CreateBody = z.object({
  patientId: z.string(),
  doctorId: z.string(),
  drugName: z.string().min(1),
  dosage: z.string().min(1),
  frequency: z.string().min(1),
  duration: z.string().optional(),
  notes: z.string().optional(),
  acknowledgedInteractions: z
    .array(
      z.object({
        drugB: z.string(),
        level: z.enum(['critical', 'warning', 'info']),
      })
    )
    .default([]),
  pin: z.string().optional(),
});

prescriptionsRouter.post('/prescriptions', async (req, res) => {
  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { db } = await getDb();
  const existing = await db
    .select()
    .from(schema.prescriptions)
    .where(eq(schema.prescriptions.patientId, parsed.data.patientId));

  const active = existing.filter(p => p.status === 'active');
  const interactionResults = await Promise.all(
    active.map(p => resolveInteraction(parsed.data.drugName, p.drugName))
  );
  const critical = interactionResults.find(r => r.level === 'critical');
  if (critical) {
    const ack = parsed.data.acknowledgedInteractions.find(
      a => a.drugB.toLowerCase() === critical.drugB.toLowerCase() && a.level === 'critical'
    );
    if (!ack) {
      res.status(409).json({
        error: 'critical_interaction',
        interaction: critical,
        message: 'Critical interaction must be acknowledged with PIN override',
      });
      return;
    }
    if (!parsed.data.pin) {
      res
        .status(400)
        .json({ error: 'pin_required', message: 'PIN required to override critical interaction' });
      return;
    }
    const [doctor] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, parsed.data.doctorId));
    if (!doctor || !verifyPin(parsed.data.pin, doctor.pinHash)) {
      res.status(403).json({ error: 'invalid_pin' });
      return;
    }
  }

  const id = newId('RX');
  const now = Date.now();
  await db
    .insert(schema.prescriptions)
    .values({
      id,
      patientId: parsed.data.patientId,
      doctorId: parsed.data.doctorId,
      drugName: parsed.data.drugName,
      dosage: parsed.data.dosage,
      frequency: parsed.data.frequency,
      duration: parsed.data.duration,
      notes: parsed.data.notes,
      status: 'active',
      createdAt: now,
    })
    .run();

  for (const result of interactionResults) {
    if (result.level === 'none') continue;
    await db
      .insert(schema.interactionEvents)
      .values({
        id: newId('IXE'),
        patientId: parsed.data.patientId,
        doctorId: parsed.data.doctorId,
        drugA: result.drugA,
        drugB: result.drugB,
        level: result.level,
        message: result.message,
        source: result.source === 'none' ? 'fallback' : result.source,
        overridden: result.level === 'critical' ? 1 : 0,
        overrideReason:
          result.level === 'critical' ? 'Doctor override during prescription save' : null,
        createdAt: now,
      })
      .run();
  }

  res.status(201).json({ id, interactions: interactionResults.filter(r => r.level !== 'none') });
});
