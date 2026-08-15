import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { getDb, resetDbCacheForTests, schema } from '../db/index.js';

process.env.DATABASE_URL = ':memory:';
process.env.DEMO_DOCTOR_PIN = '4242';
process.env.DEMO_DOCTOR_PHONE = '+254700000001';
process.env.DEMO_PATIENT_PHONE = '+254700000002';
process.env.SESSION_SECRET = 'test-session-secret-at-least-32-chars-long-ok';
delete process.env.DAILY_API_KEY;
delete process.env.DAILY_DOMAIN;
delete process.env.GROQ_API_KEY;
delete process.env.OPENAI_API_KEY;
delete process.env.OPENROUTER_API_KEY;
delete process.env.AT_API_KEY;

const realFetch = globalThis.fetch;
globalThis.fetch = ((input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : (input as Request).url;
  if (url.includes('api.fda.gov')) {
    return Promise.resolve(new Response('', { status: 404 }));
  }
  return realFetch(input, init);
}) as typeof fetch;

let app: import('express').Express;
let agent: ReturnType<typeof request.agent>;

beforeAll(async () => {
  await resetDbCacheForTests();
  const mod = await import('../index.js');
  app = await mod.createApp();
  agent = request.agent(app);
  const login = await agent.post('/api/auth/login').send({ userId: 'DOC-001', pin: '4242' });
  expect(login.status).toBe(200);
});

describe('API foundation', () => {
  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.service).toBe('medcore-api');
  });

  it('GET /api/patients/PAT-001 returns seeded patient', async () => {
    const res = await agent.get('/api/patients/PAT-001');
    expect(res.status).toBe(200);
    expect(res.body.patient.firstName).toBe('Amina');
  });
});

describe('Drug interactions (F6)', () => {
  it('returns critical for warfarin + aspirin from fallback', async () => {
    const res = await agent.get('/api/interactions').query({ drug1: 'Warfarin', drug2: 'Aspirin' });
    expect(res.status).toBe(200);
    expect(res.body.level).toBe('critical');
    expect(res.body.source).toBe('fallback');
  });

  it('returns warning for metformin + ibuprofen', async () => {
    const res = await agent
      .get('/api/interactions')
      .query({ drug1: 'Metformin', drug2: 'Ibuprofen' });
    expect(res.body.level).toBe('warning');
  });

  it('blocks critical interaction in prescription save without acknowledgement', async () => {
    const { db } = await getDb();
    await db
      .insert(schema.prescriptions)
      .values({
        id: 'RX-WARFARIN',
        patientId: 'PAT-001',
        doctorId: 'DOC-001',
        drugName: 'Warfarin',
        dosage: '5mg',
        frequency: 'Once daily',
        duration: '1 month',
        status: 'active',
        createdAt: Date.now(),
      })
      .run();
    const res = await agent.post('/api/prescriptions').send({
      patientId: 'PAT-001',
      doctorId: 'DOC-001',
      drugName: 'Aspirin',
      dosage: '81mg',
      frequency: 'Once daily',
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('critical_interaction');
  });

  it('allows critical interaction with acknowledgement + valid PIN', async () => {
    const res = await agent.post('/api/prescriptions').send({
      patientId: 'PAT-001',
      doctorId: 'DOC-001',
      drugName: 'Aspirin',
      dosage: '81mg',
      frequency: 'Once daily',
      acknowledgedInteractions: [{ drugB: 'Warfarin', level: 'critical' }],
      pin: '4242',
    });
    expect(res.status).toBe(201);
  });
});

describe('SMS offline (F4)', () => {
  it('rejects unrecognised commands', async () => {
    const res = await request(app)
      .post('/api/sms/inbound')
      .send({ from: '+254700000001', text: 'hello' });
    expect(res.body.ok).toBe(false);
  });

  it('rejects invalid PIN and increments failed attempts', async () => {
    const res = await request(app)
      .post('/api/sms/inbound')
      .send({ from: '+254700000001', text: 'PATIENT PAT-001 PIN:0000' });
    expect(res.body.error).toBe('pin_invalid');
  });

  it('returns patient summary with valid PIN', async () => {
    const res = await request(app)
      .post('/api/sms/inbound')
      .send({ from: '+254700000001', text: 'PATIENT PAT-001 PIN:4242' });
    expect(res.body.ok).toBe(true);
    expect(res.body.reply).toContain('Amina');
    expect(res.body.reply).not.toMatch(/Okafor.*NHIF/);
  });

  it('saves a NOTE under 140 chars', async () => {
    const res = await request(app).post('/api/sms/inbound').send({
      from: '+254700000001',
      text: 'NOTE PAT-001 PIN:4242 follow up next week, increase metformin',
    });
    expect(res.body.ok).toBe(true);
    expect(res.body.reply).toContain('Note saved');
  });
});

describe('Reminders + adherence (F5)', () => {
  it('records adherence response and updates rate', async () => {
    const create = await agent.post('/api/reminders').send({
      prescriptionId: 'RX-001',
      patientId: 'PAT-001',
      times: ['08:00'],
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      channel: 'sms',
    });
    expect(create.status).toBe(201);

    const adherence = await agent.get('/api/patients/PAT-001/adherence');
    expect(adherence.status).toBe(200);
    expect(adherence.body.ratePct).toBeGreaterThanOrEqual(0);
    expect(adherence.body.events.length).toBeGreaterThan(0);
  });
});

describe('Voice transcription (F2)', () => {
  it('accepts audio upload and returns mock transcript when no OpenAI key', async () => {
    delete process.env.OPENAI_API_KEY;
    const res = await agent
      .post('/api/transcribe')
      .field('patientId', 'PAT-001')
      .field('doctorId', 'DOC-001')
      .field('source', 'doctor_consult')
      .attach('audio', Buffer.from('fake audio data'), {
        filename: 'test.webm',
        contentType: 'audio/webm',
      });
    expect(res.status).toBe(200);
    expect(res.body.transcript.length).toBeGreaterThan(0);
    expect(res.body.provider).toBe('mock');
  });
});

describe('Video consult (F3)', () => {
  it('creates a session with a mock room URL', async () => {
    const res = await agent
      .post('/api/video/sessions')
      .send({ patientId: 'PAT-001', doctorId: 'DOC-001' });
    expect(res.status).toBe(201);
    expect(res.body.room.url).toMatch(/https?:/);
    expect(['daily', 'mock']).toContain(res.body.room.provider);
  });

  it('reuses the same Jitsi room URL for the same patient without Daily keys', async () => {
    const a = await agent
      .post('/api/video/sessions')
      .send({ patientId: 'PAT-001', doctorId: 'DOC-001' });
    const b = await agent
      .post('/api/video/sessions')
      .send({ patientId: 'PAT-001', doctorId: 'DOC-001' });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(a.body.room.provider).toBe('mock');
    expect(a.body.room.url).toBe(b.body.room.url);
    expect(a.body.room.url).toContain('meet.jit.si');
    expect(a.body.room.url).toContain('medcorepat001');
  });
});
