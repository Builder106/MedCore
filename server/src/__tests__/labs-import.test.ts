import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { getDb, resetDbCacheForTests, schema } from '../db/index.js';

process.env.DATABASE_URL = ':memory:';
process.env.DEMO_DOCTOR_PIN = '4242';
process.env.DEMO_DOCTOR_PHONE = '+254700000001';
process.env.DEMO_PATIENT_PHONE = '+254700000002';
process.env.SESSION_SECRET = 'test-session-secret-at-least-32-chars-long-ok';

let app: import('express').Express;
let agent: ReturnType<typeof request.agent>;

function csv(...lines: string[]) {
  return lines.join('\n');
}

beforeAll(async () => {
  await resetDbCacheForTests();
  const mod = await import('../index.js');
  app = await mod.createApp();
  agent = request.agent(app);
  const login = await agent.post('/api/auth/login').send({ userId: 'DOC-001', pin: '4242' });
  expect(login.status).toBe(200);
});

describe('POST /api/labs/import', () => {
  it('rejects missing csv body', async () => {
    const res = await agent.post('/api/labs/import').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('csv_required');
  });

  it('rejects empty CSV (header only)', async () => {
    const res = await agent.post('/api/labs/import').send({ csv: 'patient_id,test_name,value' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('empty_or_invalid_csv');
  });

  it('imports a valid row and returns imported count', async () => {
    const body = csv(
      'patient_id,test_name,value,unit,reference_range,status,collected_at',
      'PAT-001,HbA1c,7.2,%,< 5.7%,high,2024-01-15'
    );
    const res = await agent.post('/api/labs/import').send({ csv: body });
    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(1);
    expect(res.body.total).toBe(1);
    expect(res.body.errors).toHaveLength(0);
  });

  it('persists the imported lab to the database', async () => {
    const body = csv('patient_id,test_name,value,unit', 'PAT-001,Creatinine,0.9,mg/dL');
    await agent.post('/api/labs/import').send({ csv: body });
    const { db } = await getDb();
    const rows = await db.select().from(schema.labResults).all();
    const lab = rows.find(r => r.testName === 'Creatinine');
    expect(lab).toBeDefined();
    expect(lab?.value).toBe('0.9');
    expect(lab?.unit).toBe('mg/dL');
    expect(lab?.patientId).toBe('PAT-001');
  });

  it('defaults missing status to normal', async () => {
    const body = csv('patient_id,test_name,value', 'PAT-001,Glucose,5.0');
    const res = await agent.post('/api/labs/import').send({ csv: body });
    expect(res.body.imported).toBe(1);
    const { db } = await getDb();
    const rows = await db.select().from(schema.labResults).all();
    const lab = rows.find(r => r.testName === 'Glucose');
    expect(lab?.status).toBe('normal');
  });

  it('skips rows with unknown patient_id and reports error', async () => {
    const body = csv('patient_id,test_name,value', 'PAT-NOTEXIST,HbA1c,8.0');
    const res = await agent.post('/api/labs/import').send({ csv: body });
    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(0);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].reason).toContain('not found');
  });

  it('skips rows missing required fields', async () => {
    const body = csv(
      'patient_id,test_name,value',
      ',HbA1c,8.0', // missing patient_id
      'PAT-001,,8.0', // missing test_name
      'PAT-001,HbA1c,' // missing value
    );
    const res = await agent.post('/api/labs/import').send({ csv: body });
    expect(res.body.imported).toBe(0);
    expect(res.body.errors).toHaveLength(3);
  });

  it('processes mixed valid and invalid rows correctly', async () => {
    const body = csv(
      'patient_id,test_name,value',
      'PAT-001,WBC,7.5',
      'PAT-NOTEXIST,WBC,7.5',
      'PAT-001,RBC,5.0'
    );
    const res = await agent.post('/api/labs/import').send({ csv: body });
    expect(res.body.imported).toBe(2);
    expect(res.body.total).toBe(3);
    expect(res.body.errors).toHaveLength(1);
  });

  it('rejects an invalid collected_at date', async () => {
    const body = csv('patient_id,test_name,value,collected_at', 'PAT-001,HbA1c,7.0,not-a-date');
    const res = await agent.post('/api/labs/import').send({ csv: body });
    expect(res.body.imported).toBe(0);
    expect(res.body.errors[0].reason).toContain('invalid collected_at date');
  });

  it('normalises an invalid status value to normal', async () => {
    const body = csv('patient_id,test_name,value,status', 'PAT-001,Cholesterol,5.2,borderline');
    const res = await agent.post('/api/labs/import').send({ csv: body });
    expect(res.body.imported).toBe(1);
    const { db } = await getDb();
    const rows = await db.select().from(schema.labResults).all();
    const lab = rows.find(r => r.testName === 'Cholesterol');
    expect(lab?.status).toBe('normal');
  });

  it('returns row numbers in errors matching 1-based data line (header is row 1)', async () => {
    const body = csv(
      'patient_id,test_name,value',
      'PAT-001,Sodium,140', // row 2 — valid
      'PAT-NOPE,Sodium,140' // row 3 — error
    );
    const res = await agent.post('/api/labs/import').send({ csv: body });
    expect(res.body.errors[0].row).toBe(3);
  });

  it('requires authentication', async () => {
    const body = csv('patient_id,test_name,value', 'PAT-001,HbA1c,7.0');
    const res = await request(app).post('/api/labs/import').send({ csv: body });
    expect(res.status).toBe(401);
  });
});
