import { desc, eq, lt } from 'drizzle-orm';
import { Router } from 'express';
import multer from 'multer';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { getDb, schema } from '../db/index.js';
import { env } from '../lib/env.js';
import { newId } from '../lib/ids.js';
import { structureNoteFromTranscript, transcribeAudio } from '../lib/transcribe.js';

const here = dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = resolve(here, '../../data/audio');
// On Vercel (read-only deployment FS), we skip persisting audio to disk.
// The transcript is the source of truth; the audio replay endpoint just 404s.
// Locally and on the GCP VM, we still write audio for retention/replay.
const PERSIST_AUDIO = !process.env.VERCEL;
if (PERSIST_AUDIO) {
  try {
    mkdirSync(AUDIO_DIR, { recursive: true });
  } catch {
    // best-effort; if it fails we just won't persist.
  }
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

export const voiceRouter = Router();

voiceRouter.post('/transcribe', upload.single('audio'), async (req, res) => {
  const Body = z.object({
    patientId: z.string(),
    doctorId: z.string().optional(),
    source: z.enum(['doctor_consult', 'patient_message']).default('doctor_consult'),
    durationSec: z.coerce.number().optional(),
  });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: 'audio file required' });
    return;
  }
  const id = newId('VOI');
  let storedPath: string | null = null;
  if (PERSIST_AUDIO) {
    const filename = `${id}.webm`;
    const filepath = join(AUDIO_DIR, filename);
    try {
      writeFileSync(filepath, req.file.buffer);
      storedPath = filepath;
    } catch {
      // serverless or read-only FS — skip persistence
    }
  }
  const { text, provider } = await transcribeAudio({
    buffer: req.file.buffer,
    mime: req.file.mimetype,
  });
  const expires = Date.now() + env.AUDIO_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const { db } = await getDb();
  await db
    .insert(schema.voiceRecordings)
    .values({
      id,
      patientId: parsed.data.patientId,
      doctorId: parsed.data.doctorId,
      source: parsed.data.source,
      audioPath: storedPath,
      audioMime: req.file.mimetype,
      durationSec: parsed.data.durationSec,
      transcript: text,
      audioExpiresAt: expires,
      createdAt: Date.now(),
    })
    .run();
  res.json({ id, transcript: text, provider, audioExpiresAt: expires });
});

voiceRouter.get('/patients/:patientId/voice', async (req, res) => {
  const { db } = await getDb();
  const rows = await db
    .select()
    .from(schema.voiceRecordings)
    .where(eq(schema.voiceRecordings.patientId, req.params.patientId))
    .orderBy(desc(schema.voiceRecordings.createdAt));
  res.json({
    recordings: rows.map(r => ({
      ...r,
      audioPath: r.audioPath ? `/api/voice/${r.id}/audio` : null,
    })),
  });
});

voiceRouter.get('/voice/:id/audio', async (req, res) => {
  const { db } = await getDb();
  const [row] = await db
    .select()
    .from(schema.voiceRecordings)
    .where(eq(schema.voiceRecordings.id, req.params.id));
  if (!row || !row.audioPath || !existsSync(row.audioPath)) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  if (row.audioExpiresAt && row.audioExpiresAt < Date.now()) {
    res.status(410).json({ error: 'expired' });
    return;
  }
  res.setHeader('Content-Type', row.audioMime ?? 'audio/webm');
  res.sendFile(row.audioPath);
});

const NoteBody = z.object({
  patientId: z.string(),
  doctorId: z.string(),
  recordingId: z.string().optional(),
  transcript: z.string().optional(),
  chiefComplaint: z.string().optional(),
  history: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  followUp: z.string().optional(),
});

voiceRouter.post('/consultation-notes', async (req, res) => {
  const parsed = NoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const sections = parsed.data.transcript
    ? structureNoteFromTranscript(parsed.data.transcript)
    : null;
  const id = newId('NOTE');
  const { db } = await getDb();
  await db
    .insert(schema.consultationNotes)
    .values({
      id,
      patientId: parsed.data.patientId,
      doctorId: parsed.data.doctorId,
      recordingId: parsed.data.recordingId,
      chiefComplaint: parsed.data.chiefComplaint ?? sections?.chiefComplaint ?? '',
      history: parsed.data.history ?? sections?.history ?? '',
      assessment: parsed.data.assessment ?? sections?.assessment ?? '',
      plan: parsed.data.plan ?? sections?.plan ?? '',
      followUp: parsed.data.followUp ?? sections?.followUp ?? '',
      createdAt: Date.now(),
    })
    .run();
  res.status(201).json({ id });
});

voiceRouter.get('/patients/:patientId/notes', async (req, res) => {
  const { db } = await getDb();
  const rows = await db
    .select()
    .from(schema.consultationNotes)
    .where(eq(schema.consultationNotes.patientId, req.params.patientId))
    .orderBy(desc(schema.consultationNotes.createdAt));
  res.json({ notes: rows });
});

export async function purgeExpiredAudio() {
  const { db } = await getDb();
  const expired = await db
    .select()
    .from(schema.voiceRecordings)
    .where(lt(schema.voiceRecordings.audioExpiresAt, Date.now()));
  for (const row of expired) {
    if (row.audioPath && existsSync(row.audioPath)) {
      try {
        unlinkSync(row.audioPath);
      } catch {
        /* ignore */
      }
    }
    await db
      .update(schema.voiceRecordings)
      .set({ audioPath: null })
      .where(eq(schema.voiceRecordings.id, row.id))
      .run();
  }
}
