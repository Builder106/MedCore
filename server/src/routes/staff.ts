import { desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { getDb, schema } from '../db/index.js';
import { newId } from '../lib/ids.js';
import { requireRole } from '../middleware/rbac.js';

export const staffRouter = Router();

staffRouter.get('/staff', requireRole('admin', 'doctor'), async (_req, res) => {
  const { db } = await getDb();
  const rows = await db.select().from(schema.staff).orderBy(desc(schema.staff.createdAt));
  res.json({ staff: rows });
});

const CreateBody = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  specialty: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  facilityId: z.string().optional(),
});

staffRouter.post('/staff', requireRole('admin'), async (req, res) => {
  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { db } = await getDb();
  const id = newId('STF');
  await db
    .insert(schema.staff)
    .values({
      id,
      ...parsed.data,
      status: 'active',
      createdAt: Date.now(),
    })
    .run();
  res.status(201).json({ id });
});

const PatchBody = z.object({
  status: z.enum(['active', 'on_leave', 'inactive']).optional(),
  role: z.string().optional(),
  specialty: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

staffRouter.patch('/staff/:id', requireRole('admin'), async (req, res) => {
  const parsed = PatchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { db } = await getDb();
  await db
    .update(schema.staff)
    .set(parsed.data)
    .where(eq(schema.staff.id, String(req.params.id)))
    .run();
  res.json({ ok: true });
});
