import { and, desc, eq, gte } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { getDb, schema } from '../db/index.js';
import { newId } from '../lib/ids.js';
import { publicVapidKey, sendPush } from '../lib/push.js';
import { sms } from '../lib/sms.js';

export const remindersRouter = Router();

const CreateBody = z.object({
  prescriptionId: z.string(),
  patientId: z.string(),
  times: z.array(z.string().regex(/^\d{2}:\d{2}$/)).min(1),
  startDate: z.string(),
  endDate: z.string(),
  channel: z.enum(['sms', 'push']).default('sms'),
});

remindersRouter.post('/reminders', async (req, res) => {
  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { db } = await getDb();
  const start = new Date(parsed.data.startDate + 'T00:00:00Z');
  const end = new Date(parsed.data.endDate + 'T23:59:59Z');
  const created: string[] = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    for (const time of parsed.data.times) {
      const [hh, mm] = time.split(':').map(Number);
      const scheduled = new Date(d);
      scheduled.setUTCHours(hh, mm, 0, 0);
      const id = newId('REM');
      await db
        .insert(schema.medicationReminders)
        .values({
          id,
          prescriptionId: parsed.data.prescriptionId,
          patientId: parsed.data.patientId,
          scheduledTime: scheduled.getTime(),
          status: 'pending',
          channel: parsed.data.channel,
          createdAt: Date.now(),
        })
        .run();
      created.push(id);
    }
  }
  res.status(201).json({ created: created.length });
});

remindersRouter.get('/patients/:patientId/reminders', async (req, res) => {
  const { db } = await getDb();
  const Q = z.object({ from: z.coerce.number().optional() });
  const parsed = Q.parse(req.query);
  const rows = parsed.from
    ? await db
        .select()
        .from(schema.medicationReminders)
        .where(
          and(
            eq(schema.medicationReminders.patientId, req.params.patientId),
            gte(schema.medicationReminders.scheduledTime, parsed.from)
          )
        )
        .orderBy(desc(schema.medicationReminders.scheduledTime))
    : await db
        .select()
        .from(schema.medicationReminders)
        .where(eq(schema.medicationReminders.patientId, req.params.patientId))
        .orderBy(desc(schema.medicationReminders.scheduledTime))
        .limit(100);
  res.json({ reminders: rows });
});

remindersRouter.post('/reminders/:id/respond', async (req, res) => {
  const Body = z.object({ response: z.enum(['TAKEN', 'SKIP']) });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { db } = await getDb();
  const [reminder] = await db
    .select()
    .from(schema.medicationReminders)
    .where(eq(schema.medicationReminders.id, req.params.id));
  if (!reminder) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  const status = parsed.data.response === 'TAKEN' ? 'confirmed' : 'skipped';
  await db
    .update(schema.medicationReminders)
    .set({ status, response: parsed.data.response, respondedAt: Date.now() })
    .where(eq(schema.medicationReminders.id, req.params.id))
    .run();
  const adhStatus = parsed.data.response === 'TAKEN' ? 'taken' : 'skipped';
  const doseDate = new Date(reminder.scheduledTime).toISOString().slice(0, 10);
  await db
    .insert(schema.adherenceEvents)
    .values({
      id: newId('ADH'),
      prescriptionId: reminder.prescriptionId,
      patientId: reminder.patientId,
      doseDate,
      status: adhStatus,
      recordedAt: Date.now(),
    })
    .run();
  res.json({ ok: true, status });
});

remindersRouter.get('/patients/:patientId/adherence', async (req, res) => {
  const { db } = await getDb();
  const events = await db
    .select()
    .from(schema.adherenceEvents)
    .where(eq(schema.adherenceEvents.patientId, req.params.patientId))
    .orderBy(desc(schema.adherenceEvents.doseDate));
  const last30 = events.filter(e => {
    const eDate = new Date(e.doseDate).getTime();
    return Date.now() - eDate <= 1000 * 60 * 60 * 24 * 30;
  });
  const taken = last30.filter(e => e.status === 'taken').length;
  const total = last30.length || 1;
  const rate = Math.round((taken / total) * 100);
  let streak = 0;
  for (const e of events) {
    if (e.status === 'taken') streak++;
    else break;
  }
  res.json({ events: last30, ratePct: rate, streakDays: streak, total: last30.length });
});

remindersRouter.get('/push/vapid', (_req, res) => {
  res.json({ publicKey: publicVapidKey() });
});

remindersRouter.post('/push/subscribe', async (req, res) => {
  const Body = z.object({
    userId: z.string(),
    endpoint: z.string(),
    keys: z.object({ p256dh: z.string(), auth: z.string() }),
  });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { db } = await getDb();
  await db
    .insert(schema.pushSubscriptions)
    .values({
      id: newId('SUB'),
      userId: parsed.data.userId,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      createdAt: Date.now(),
    })
    .run();
  res.status(201).json({ ok: true });
});

remindersRouter.post('/reminders/dispatch-now', async (req, res) => {
  const Body = z.object({ patientId: z.string() });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { db } = await getDb();
  const [patient] = await db
    .select()
    .from(schema.patients)
    .where(eq(schema.patients.id, parsed.data.patientId));
  if (!patient) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  const meds = await db
    .select()
    .from(schema.prescriptions)
    .where(
      and(
        eq(schema.prescriptions.patientId, parsed.data.patientId),
        eq(schema.prescriptions.status, 'active')
      )
    );
  if (meds.length === 0) {
    res.json({ ok: true, sent: 0 });
    return;
  }
  const med = meds[0];
  await sms.send({
    to: patient.phone,
    body: `MedCore reminder: Time for your ${med.drugName} ${med.dosage}. Reply TAKEN to confirm or SKIP to log a skip.`,
  });
  const subs = await db
    .select()
    .from(schema.pushSubscriptions)
    .where(eq(schema.pushSubscriptions.userId, patient.id));
  for (const sub of subs) {
    await sendPush(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      { title: 'Time for your medication', body: `${med.drugName} ${med.dosage}`, tag: med.id }
    );
  }
  res.json({ ok: true, sent: subs.length + 1 });
});
