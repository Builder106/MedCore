import { desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { getDb, schema } from '../db/index.js';
import { newId } from '../lib/ids.js';

export const labsRouter = Router();

// Cross-patient query: GET /labs?status=critical
labsRouter.get('/labs', async (req, res) => {
  const { db } = await getDb();
  const { status } = req.query;
  let rows;
  if (status && typeof status === 'string') {
    rows = await db
      .select()
      .from(schema.labResults)
      .where(eq(schema.labResults.status, status as 'normal' | 'high' | 'low' | 'critical'))
      .orderBy(desc(schema.labResults.collectedAt));
  } else {
    rows = await db.select().from(schema.labResults).orderBy(desc(schema.labResults.collectedAt));
  }
  res.json({ labs: rows });
});

labsRouter.get('/patients/:patientId/labs', async (req, res) => {
  const { db } = await getDb();
  const rows = await db
    .select()
    .from(schema.labResults)
    .where(eq(schema.labResults.patientId, req.params.patientId))
    .orderBy(desc(schema.labResults.collectedAt));
  res.json({ labs: rows });
});

const CreateBody = z.object({
  patientId: z.string(),
  doctorId: z.string().optional(),
  testName: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().optional(),
  referenceRange: z.string().optional(),
  status: z.enum(['normal', 'high', 'low', 'critical']).default('normal'),
  collectedAt: z.number(),
  plainEnglish: z.string().optional(),
});

labsRouter.post('/labs', async (req, res) => {
  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { db } = await getDb();
  const id = newId('LAB');
  await db
    .insert(schema.labResults)
    .values({
      id,
      patientId: parsed.data.patientId,
      doctorId: parsed.data.doctorId,
      testName: parsed.data.testName,
      value: parsed.data.value,
      unit: parsed.data.unit,
      referenceRange: parsed.data.referenceRange,
      status: parsed.data.status,
      collectedAt: parsed.data.collectedAt,
      reviewedByDoctor: 0,
      plainEnglish: parsed.data.plainEnglish,
      createdAt: Date.now(),
    })
    .run();
  res.status(201).json({ id });
});

labsRouter.patch('/labs/:id/review', async (req, res) => {
  const { db } = await getDb();
  await db
    .update(schema.labResults)
    .set({ reviewedByDoctor: 1 })
    .where(eq(schema.labResults.id, req.params.id))
    .run();
  res.json({ ok: true });
});
