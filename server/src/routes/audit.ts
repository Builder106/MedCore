import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { getDb, schema } from '../db/index.js';
import { requireRole } from '../middleware/rbac.js';

export const auditRouter = Router();

auditRouter.get('/audit', requireRole('admin'), async (req, res) => {
  const Q = z.object({
    patientId: z.string().optional(),
    userId: z.string().optional(),
    from: z.coerce.number().optional(),
    to: z.coerce.number().optional(),
    limit: z.coerce.number().int().positive().max(500).default(200),
  });
  const parsed = Q.parse(req.query);
  const { db } = await getDb();
  const conditions = [];
  if (parsed.patientId) conditions.push(eq(schema.auditLog.patientId, parsed.patientId));
  if (parsed.userId) conditions.push(eq(schema.auditLog.userId, parsed.userId));
  if (parsed.from) conditions.push(gte(schema.auditLog.createdAt, parsed.from));
  if (parsed.to) conditions.push(lte(schema.auditLog.createdAt, parsed.to));
  const rows = await db
    .select()
    .from(schema.auditLog)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(parsed.limit);
  res.json({ entries: rows });
});
