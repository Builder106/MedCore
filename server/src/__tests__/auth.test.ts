import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { resetDbCacheForTests } from '../db/index.js';

process.env.DATABASE_URL = ':memory:';
process.env.DEMO_DOCTOR_PIN = '4242';
process.env.DEMO_PATIENT_PIN = '1212';
process.env.DEMO_ADMIN_PIN = '3434';
process.env.DEMO_DOCTOR_PHONE = '+254700000001';
process.env.DEMO_PATIENT_PHONE = '+254700000002';
process.env.SESSION_SECRET = 'test-session-secret-at-least-32-chars-long-ok';

let app: import('express').Express;

beforeAll(async () => {
  await resetDbCacheForTests();
  const mod = await import('../index.js');
  app = await mod.createApp();
});

function extractCookie(res: request.Response, name: string): string | undefined {
  const set = res.headers['set-cookie'];
  if (!set) return undefined;
  const flat = Array.isArray(set) ? set.join(';') : set;
  const m = flat.match(new RegExp(`${name}=([^;]+)`));
  return m?.[1];
}

describe('Auth', () => {
  it('POST /api/auth/login returns 400 for invalid body', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/login rejects wrong PIN', async () => {
    const res = await request(app).post('/api/auth/login').send({ userId: 'DOC-001', pin: '0000' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_credentials');
  });

  it('POST /api/auth/login sets cookie and GET /api/auth/me returns user', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ userId: 'DOC-001', pin: '4242' });
    expect(login.status).toBe(200);
    expect(login.body.user.id).toBe('DOC-001');
    expect(login.body.user.role).toBe('doctor');
    const cookie = extractCookie(login, 'mc_session');
    expect(cookie).toBeTruthy();

    const me = await request(app).get('/api/auth/me').set('Cookie', `mc_session=${cookie}`);
    expect(me.status).toBe(200);
    expect(me.body.user.id).toBe('DOC-001');
    expect(me.body.user.role).toBe('doctor');
    expect(me.body.user.name).toContain('Wanjiku');
  });

  it('GET /api/auth/me returns 401 without cookie', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/patients is 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/patients');
    expect(res.status).toBe(401);
  });

  it('patient can log in with seeded PIN', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ userId: 'PAT-001', pin: '1212' });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe('patient');
  });

  it('admin can log in with seeded PIN', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ userId: 'ADM-001', pin: '3434' });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe('admin');
  });

  it('POST /api/auth/logout clears session', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ userId: 'DOC-001', pin: '4242' });
    expect((await agent.get('/api/auth/me')).status).toBe(200);
    await agent.post('/api/auth/logout');
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });
});
