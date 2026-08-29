import { and, desc, eq, gte } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { getDb, schema } from '../db/index.js';
import {
  CHAT_SYSTEM_PROMPT,
  RISK_FLAGS_SYSTEM_PROMPT,
  SUMMARIZE_SYSTEM_PROMPT,
  formatPatientContext,
  type PatientContext,
} from '../lib/ai-prompts.js';
import { callClaude, callClaudeStream } from '../lib/ai.js';

export const aiRouter = Router();

async function buildPatientContext(patientId: string): Promise<PatientContext | null> {
  const { db } = await getDb();
  const [patient] = await db
    .select()
    .from(schema.patients)
    .where(eq(schema.patients.id, patientId));
  if (!patient) return null;

  const activeRx = await db
    .select()
    .from(schema.prescriptions)
    .where(
      and(eq(schema.prescriptions.patientId, patientId), eq(schema.prescriptions.status, 'active'))
    )
    .orderBy(desc(schema.prescriptions.createdAt));

  const thirtyDaysAgo = Date.now() - 1000 * 60 * 60 * 24 * 30;
  const recentEncounters = await db
    .select()
    .from(schema.encounters)
    .where(
      and(
        eq(schema.encounters.patientId, patientId),
        gte(schema.encounters.encounterDate, thirtyDaysAgo)
      )
    )
    .orderBy(desc(schema.encounters.encounterDate))
    .limit(5);

  const recentLabs = await db
    .select()
    .from(schema.labResults)
    .where(eq(schema.labResults.patientId, patientId))
    .orderBy(desc(schema.labResults.collectedAt))
    .limit(8);

  const adherenceEvents = await db
    .select()
    .from(schema.adherenceEvents)
    .where(eq(schema.adherenceEvents.patientId, patientId))
    .orderBy(desc(schema.adherenceEvents.recordedAt))
    .limit(30);
  const takenCount = adherenceEvents.filter(e => e.status === 'taken').length;
  const adherenceRate = adherenceEvents.length
    ? Math.round((takenCount / adherenceEvents.length) * 100)
    : undefined;

  return {
    id: patient.id,
    firstName: patient.firstName,
    lastName: patient.lastName,
    dob: patient.dob,
    allergies: safeJsonArray(patient.allergies),
    bloodType: patient.bloodType,
    insuranceScheme: patient.insuranceScheme,
    activeMedications: activeRx.map(r => ({
      drugName: r.drugName,
      dosage: r.dosage,
      frequency: r.frequency,
    })),
    recentEncounters: recentEncounters.map(e => ({
      date: new Date(e.encounterDate).toISOString().slice(0, 10),
      chiefComplaint: e.chiefComplaint,
      diagnosis: e.diagnosis,
    })),
    recentLabs: recentLabs.map(l => ({
      testName: l.testName,
      value: l.value,
      unit: l.unit,
      status: l.status,
    })),
    adherenceRate,
  };
}

function safeJsonArray(s: string | null | undefined): string[] {
  if (!s) return [];
  try {
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

const SummarizeBody = z.object({
  patientId: z.string(),
  stream: z.boolean().optional().default(false),
});

aiRouter.post('/ai/summarize', async (req, res) => {
  const parsed = SummarizeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const ctx = await buildPatientContext(parsed.data.patientId);
  if (!ctx) {
    res.status(404).json({ error: 'patient_not_found' });
    return;
  }
  const contextText = formatPatientContext(ctx);
  const userMsg = `Patient chart context:\n\n${contextText}\n\nProduce the pre-visit summary.`;

  if (parsed.data.stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const result = await callClaudeStream(
      {
        system: SUMMARIZE_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMsg }],
        maxTokens: 800,
        cachedSystem: true,
      },
      chunk => {
        res.write(`data: ${JSON.stringify({ type: 'delta', text: chunk })}\n\n`);
      }
    );
    res.write(`data: ${JSON.stringify({ type: 'done', provider: result.provider })}\n\n`);
    res.end();
    return;
  }

  const result = await callClaude({
    system: SUMMARIZE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMsg }],
    maxTokens: 800,
    cachedSystem: true,
  });
  res.json({ summary: result.text, provider: result.provider });
});

const ChatBody = z.object({
  patientId: z.string(),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .min(1),
  stream: z.boolean().optional().default(false),
});

aiRouter.post('/ai/chat', async (req, res) => {
  const parsed = ChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const ctx = await buildPatientContext(parsed.data.patientId);
  if (!ctx) {
    res.status(404).json({ error: 'patient_not_found' });
    return;
  }
  const system = `${CHAT_SYSTEM_PROMPT}\n\n--- Patient Chart ---\n${formatPatientContext(ctx)}\n--- End Chart ---`;

  if (parsed.data.stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const result = await callClaudeStream(
      {
        system,
        messages: parsed.data.messages,
        maxTokens: 1024,
        cachedSystem: true,
      },
      chunk => {
        res.write(`data: ${JSON.stringify({ type: 'delta', text: chunk })}\n\n`);
      }
    );
    res.write(`data: ${JSON.stringify({ type: 'done', provider: result.provider })}\n\n`);
    res.end();
    return;
  }

  const result = await callClaude({
    system,
    messages: parsed.data.messages,
    maxTokens: 1024,
    cachedSystem: true,
  });
  res.json({ reply: result.text, provider: result.provider });
});

const RiskBody = z.object({ patientId: z.string() });

aiRouter.post('/ai/risk-flags', async (req, res) => {
  const parsed = RiskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const ctx = await buildPatientContext(parsed.data.patientId);
  if (!ctx) {
    res.status(404).json({ error: 'patient_not_found' });
    return;
  }
  const result = await callClaude({
    system: RISK_FLAGS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Patient chart:\n\n${formatPatientContext(ctx)}` }],
    maxTokens: 600,
    cachedSystem: false,
  });
  let flags: unknown;
  try {
    flags = JSON.parse(result.text);
  } catch {
    flags = [];
  }
  res.json({ flags, provider: result.provider });
});
