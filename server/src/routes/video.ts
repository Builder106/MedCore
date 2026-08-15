import { desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { getDb, schema } from '../db/index.js';
import { newId } from '../lib/ids.js';
import { createVideoRoom } from '../lib/video.js';

export const videoRouter = Router();

const StartBody = z.object({
  patientId: z.string(),
  doctorId: z.string(),
  reason: z.string().optional(),
});

videoRouter.post('/video/sessions', async (req, res) => {
  const parsed = StartBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const id = newId('VID');
  const room = await createVideoRoom({
    patientId: parsed.data.patientId,
    dailyRoomName: `medcore-${id.toLowerCase()}`,
  });
  const { db } = await getDb();
  await db
    .insert(schema.videoConsultations)
    .values({
      id,
      patientId: parsed.data.patientId,
      doctorId: parsed.data.doctorId,
      roomUrl: room.url,
      roomName: room.name,
      status: 'scheduled',
      createdAt: Date.now(),
    })
    .run();
  res.status(201).json({ id, room });
});

videoRouter.post('/video/sessions/:id/start', async (req, res) => {
  const { db } = await getDb();
  await db
    .update(schema.videoConsultations)
    .set({ status: 'in_progress', startedAt: Date.now() })
    .where(eq(schema.videoConsultations.id, req.params.id))
    .run();
  res.json({ ok: true });
});

videoRouter.post('/video/sessions/:id/end', async (req, res) => {
  const Body = z.object({ notes: z.string().optional() });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { db } = await getDb();
  const [session] = await db
    .select()
    .from(schema.videoConsultations)
    .where(eq(schema.videoConsultations.id, req.params.id));
  if (!session) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  const ended = Date.now();
  const duration = session.startedAt ? (ended - session.startedAt) / 1000 : 0;
  await db
    .update(schema.videoConsultations)
    .set({
      status: 'completed',
      endedAt: ended,
      durationSec: duration,
      notes: parsed.data.notes ?? session.notes,
    })
    .where(eq(schema.videoConsultations.id, req.params.id))
    .run();
  res.json({ ok: true, durationSec: duration });
});

videoRouter.get('/patients/:patientId/video', async (req, res) => {
  const { db } = await getDb();
  const rows = await db
    .select()
    .from(schema.videoConsultations)
    .where(eq(schema.videoConsultations.patientId, req.params.patientId))
    .orderBy(desc(schema.videoConsultations.createdAt));
  res.json({ sessions: rows });
});
