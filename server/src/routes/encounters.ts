import { desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { getDb, schema } from '../db/index.js';
import { newId } from '../lib/ids.js';

export const encountersRouter = Router();

// Cross-patient recent encounters: GET /encounters?limit=N
encountersRouter.get('/encounters', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const { db } = await getDb();
  const rows = await db
    .select()
    .from(schema.encounters)
    .orderBy(desc(schema.encounters.encounterDate))
    .limit(limit);
  res.json({ encounters: rows });
});

encountersRouter.get('/patients/:patientId/encounters', async (req, res) => {
  const { db } = await getDb();
  const rows = await db
    .select()
    .from(schema.encounters)
    .where(eq(schema.encounters.patientId, req.params.patientId))
    .orderBy(desc(schema.encounters.encounterDate));
  res.json({ encounters: rows });
});

const CreateBody = z.object({
  patientId: z.string(),
  doctorId: z.string(),
  encounterDate: z.number(),
  type: z.enum(['consultation', 'follow_up', 'emergency', 'telemedicine']).default('consultation'),
  chiefComplaint: z.string().optional(),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
});

encountersRouter.post('/encounters', async (req, res) => {
  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { db } = await getDb();
  const id = newId('ENC');
  await db
    .insert(schema.encounters)
    .values({
      id,
      ...parsed.data,
      createdAt: Date.now(),
    })
    .run();
  res.status(201).json({ id });
});
