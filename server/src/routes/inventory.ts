import { desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { getDb, schema } from '../db/index.js';
import { newId } from '../lib/ids.js';
import { requireRole } from '../middleware/rbac.js';

export const inventoryRouter = Router();

inventoryRouter.get('/inventory', requireRole('admin', 'doctor'), async (_req, res) => {
  const { db } = await getDb();
  const rows = await db.select().from(schema.inventory).orderBy(desc(schema.inventory.updatedAt));
  const lowStock = rows.filter(r => r.quantity <= r.reorderLevel);
  res.json({ items: rows, lowStockCount: lowStock.length });
});

const CreateBody = z.object({
  itemName: z.string().min(1),
  category: z.string().optional(),
  sku: z.string().optional(),
  quantity: z.number().int().nonnegative().default(0),
  reorderLevel: z.number().int().nonnegative().default(10),
  unit: z.string().optional(),
  location: z.string().optional(),
  expiresAt: z.number().optional(),
});

inventoryRouter.post('/inventory', requireRole('admin'), async (req, res) => {
  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const now = Date.now();
  const { db } = await getDb();
  const id = newId('INV');
  await db
    .insert(schema.inventory)
    .values({
      id,
      ...parsed.data,
      updatedAt: now,
      createdAt: now,
    })
    .run();
  res.status(201).json({ id });
});

const PatchBody = z.object({
  quantity: z.number().int().nonnegative().optional(),
  reorderLevel: z.number().int().nonnegative().optional(),
  location: z.string().optional(),
  expiresAt: z.number().optional(),
});

inventoryRouter.patch('/inventory/:id', requireRole('admin'), async (req, res) => {
  const parsed = PatchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { db } = await getDb();
  await db
    .update(schema.inventory)
    .set({ ...parsed.data, updatedAt: Date.now() })
    .where(eq(schema.inventory.id, String(req.params.id)))
    .run();
  res.json({ ok: true });
});
