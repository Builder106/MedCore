import { and, desc, eq, isNotNull, lt } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { getDb, schema } from '../db/index.js';
import { newId } from '../lib/ids.js';

export const vaccinationsRouter = Router();

// Cross-patient query: GET /vaccinations?overdue=true
vaccinationsRouter.get('/vaccinations', async (req, res) => {
  const { db } = await getDb();
  const now = Date.now();
  const rows =
    req.query.overdue === 'true'
      ? await db
          .select()
          .from(schema.vaccinations)
          .where(
            and(isNotNull(schema.vaccinations.nextDueAt), lt(schema.vaccinations.nextDueAt, now))
          )
          .orderBy(desc(schema.vaccinations.nextDueAt))
      : await db
          .select()
          .from(schema.vaccinations)
          .orderBy(desc(schema.vaccinations.administeredAt));
  res.json({ vaccinations: rows });
});

vaccinationsRouter.get('/patients/:patientId/vaccinations', async (req, res) => {
  const { db } = await getDb();
  const rows = await db
    .select()
    .from(schema.vaccinations)
    .where(eq(schema.vaccinations.patientId, req.params.patientId))
    .orderBy(desc(schema.vaccinations.administeredAt));
  res.json({ vaccinations: rows });
});

const CreateBody = z.object({
  patientId: z.string(),
  vaccineName: z.string().min(1),
  doseNumber: z.number().int().positive().default(1),
  batch: z.string().optional(),
  site: z.string().optional(),
  administeredAt: z.number(),
  nextDueAt: z.number().optional(),
  administeredBy: z.string().optional(),
});

vaccinationsRouter.post('/vaccinations', async (req, res) => {
  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { db } = await getDb();
  const id = newId('VAC');
  await db
    .insert(schema.vaccinations)
    .values({
      id,
      ...parsed.data,
      createdAt: Date.now(),
    })
    .run();
  res.status(201).json({ id });
});
