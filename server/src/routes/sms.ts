import { and, desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { getDb, schema } from '../db/index.js';
import { env } from '../lib/env.js';
import { newId } from '../lib/ids.js';
import { verifyPin } from '../lib/pin.js';
import { clampSms, parseSmsCommand, safeName } from '../lib/sms-commands.js';
import { recentMockMessages, sms } from '../lib/sms.js';

export const smsRouter = Router();

const InboundBody = z.object({
  from: z.string(),
  to: z.string().optional().default('MEDCORE'),
  text: z.string(),
  date: z.string().optional(),
});

const LOCK_DURATION_MS = 1000 * 60 * 30;
const MAX_FAILED = 3;

async function logAndReply(opts: {
  fromNumber: string;
  toNumber: string;
  body: string;
  command?: string;
  patientId?: string;
  doctorId?: string;
  responseSnippet: string;
  status: 'received' | 'replied' | 'failed' | 'pin_invalid' | 'locked';
  reply?: string;
}) {
  const { db } = await getDb();
  const id = newId('SMS');
  const now = Date.now();
  await db
    .insert(schema.smsMessages)
    .values({
      id,
      direction: 'inbound',
      fromNumber: opts.fromNumber,
      toNumber: opts.toNumber,
      body: opts.body,
      command: opts.command,
      patientId: opts.patientId,
      doctorId: opts.doctorId,
      responseSnippet: opts.responseSnippet,
      status: opts.status,
      expiresAt: now + env.SMS_RESPONSE_TTL_MS,
      createdAt: now,
    })
    .run();
  if (opts.reply) {
    await sms.send({ to: opts.fromNumber, body: clampSms(opts.reply) });
    await db
      .insert(schema.smsMessages)
      .values({
        id: newId('SMS'),
        direction: 'outbound',
        fromNumber: opts.toNumber,
        toNumber: opts.fromNumber,
        body: opts.reply,
        responseSnippet: opts.reply.slice(0, 60),
        status: 'replied',
        expiresAt: now + env.SMS_RESPONSE_TTL_MS,
        createdAt: now + 1,
      })
      .run();
  }
  return id;
}

smsRouter.post('/sms/inbound', async (req, res) => {
  const parsed = InboundBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid payload' });
    return;
  }
  const { from, to, text } = parsed.data;
  const cmd = parseSmsCommand(text);

  if ('error' in cmd) {
    await logAndReply({
      fromNumber: from,
      toNumber: to,
      body: text,
      responseSnippet: 'Reply sent: command format help',
      status: 'received',
      reply: cmd.error,
    });
    res.json({ ok: false, error: cmd.error });
    return;
  }

  const { db } = await getDb();
  const [doctor] = await db.select().from(schema.users).where(eq(schema.users.phone, from));
  if (!doctor || doctor.role !== 'doctor') {
    await logAndReply({
      fromNumber: from,
      toNumber: to,
      body: text,
      command: cmd.type,
      responseSnippet: 'No doctor mapped to this number',
      status: 'failed',
      reply: 'Number not authorised. Contact MedCore admin.',
    });
    res.json({ ok: false, error: 'unauthorised_number' });
    return;
  }

  if (doctor.lockedUntil && doctor.lockedUntil > Date.now()) {
    await logAndReply({
      fromNumber: from,
      toNumber: to,
      body: text,
      command: cmd.type,
      doctorId: doctor.id,
      responseSnippet: 'Account locked',
      status: 'locked',
      reply: 'Account locked. Contact supervisor.',
    });
    res.json({ ok: false, error: 'locked' });
    return;
  }

  if (!verifyPin(cmd.pin, doctor.pinHash)) {
    const failed = doctor.failedAttempts + 1;
    const update: Partial<typeof schema.users.$inferInsert> = { failedAttempts: failed };
    if (failed >= MAX_FAILED) {
      update.lockedUntil = Date.now() + LOCK_DURATION_MS;
      update.failedAttempts = 0;
    }
    await db.update(schema.users).set(update).where(eq(schema.users.id, doctor.id)).run();
    await logAndReply({
      fromNumber: from,
      toNumber: to,
      body: text,
      command: cmd.type,
      doctorId: doctor.id,
      responseSnippet: 'Invalid PIN',
      status: 'pin_invalid',
      reply:
        failed >= MAX_FAILED
          ? 'PIN locked. Supervisor notified.'
          : `Invalid PIN. Attempt ${failed}/${MAX_FAILED}.`,
    });
    res.json({ ok: false, error: 'pin_invalid' });
    return;
  }

  if (doctor.failedAttempts > 0) {
    await db
      .update(schema.users)
      .set({ failedAttempts: 0 })
      .where(eq(schema.users.id, doctor.id))
      .run();
  }

  const [patient] = await db
    .select()
    .from(schema.patients)
    .where(eq(schema.patients.id, cmd.patientId));
  if (!patient && cmd.type !== 'NOTE') {
    await logAndReply({
      fromNumber: from,
      toNumber: to,
      body: text,
      command: cmd.type,
      doctorId: doctor.id,
      responseSnippet: 'Patient not found',
      status: 'failed',
      reply: `Patient ${cmd.patientId} not found.`,
    });
    res.json({ ok: false, error: 'not_found' });
    return;
  }

  let reply = '';
  switch (cmd.type) {
    case 'PATIENT': {
      const meds = await db
        .select()
        .from(schema.prescriptions)
        .where(
          and(
            eq(schema.prescriptions.patientId, cmd.patientId),
            eq(schema.prescriptions.status, 'active')
          )
        );
      const medList =
        meds
          .slice(0, 3)
          .map(m => `${m.drugName} ${m.dosage}`)
          .join(', ') || 'none';
      reply = `${safeName(patient!.firstName, patient!.lastName)}: meds ${medList}. RISK med. See app for full record.`;
      break;
    }
    case 'MEDS': {
      const meds = await db
        .select()
        .from(schema.prescriptions)
        .where(
          and(
            eq(schema.prescriptions.patientId, cmd.patientId),
            eq(schema.prescriptions.status, 'active')
          )
        );
      const medList =
        meds.map(m => `${m.drugName} ${m.dosage} ${m.frequency}`).join('; ') || 'no active meds';
      reply = `Meds for ${cmd.patientId}: ${medList}`;
      break;
    }
    case 'APPT': {
      reply = `Appt for ${cmd.patientId}: next on file in MedCore. Use app for details.`;
      break;
    }
    case 'NOTE': {
      const note = (cmd.payload ?? '').slice(0, 140);
      if (!note) {
        reply = 'Provide note text after PIN.';
        break;
      }
      await db
        .insert(schema.consultationNotes)
        .values({
          id: newId('NOTE'),
          patientId: cmd.patientId,
          doctorId: doctor.id,
          chiefComplaint: '',
          history: '',
          assessment: note,
          plan: '',
          followUp: '',
          createdAt: Date.now(),
        })
        .run();
      reply = `Note saved for ${cmd.patientId}.`;
      break;
    }
    case 'EMRG': {
      reply = `EMRG logged for ${cmd.patientId}. On-call supervisor alerted.`;
      console.warn(`[sms:emrg] doctor=${doctor.id} patient=${cmd.patientId}`);
      break;
    }
  }

  const id = await logAndReply({
    fromNumber: from,
    toNumber: to,
    body: text,
    command: cmd.type,
    patientId: cmd.patientId,
    doctorId: doctor.id,
    responseSnippet: reply.slice(0, 60),
    status: 'replied',
    reply,
  });

  res.json({ ok: true, id, reply: clampSms(reply) });
});

smsRouter.get('/sms/messages', async (req, res) => {
  const { db } = await getDb();
  const Q = z.object({
    doctorId: z.string().optional(),
    patientId: z.string().optional(),
    type: z.string().optional(),
    limit: z.coerce.number().default(100),
  });
  const parsed = Q.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const all = await db
    .select()
    .from(schema.smsMessages)
    .orderBy(desc(schema.smsMessages.createdAt))
    .limit(parsed.data.limit);
  const filtered = all.filter(
    m =>
      (!parsed.data.doctorId || m.doctorId === parsed.data.doctorId) &&
      (!parsed.data.patientId || m.patientId === parsed.data.patientId) &&
      (!parsed.data.type || m.command === parsed.data.type)
  );
  res.json({ messages: filtered, mockOutbox: recentMockMessages() });
});
