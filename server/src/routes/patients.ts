import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { getDb, schema } from '../db/index.js';

export const patientsRouter = Router();

patientsRouter.get('/patients', async (_req, res) => {
  const { db } = await getDb();
  const list = await db.select().from(schema.patients);
  res.json({ patients: list.map(p => ({ ...p, allergies: JSON.parse(p.allergies) })) });
});

patientsRouter.get('/patients/:id', async (req, res) => {
  const { db } = await getDb();
  const [row] = await db
    .select()
    .from(schema.patients)
    .where(eq(schema.patients.id, req.params.id));
  if (!row) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.json({ patient: { ...row, allergies: JSON.parse(row.allergies) } });
});
