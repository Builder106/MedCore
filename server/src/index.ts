import cors from 'cors';
import { and, eq, lte } from 'drizzle-orm';
import express from 'express';
import helmet from 'helmet';
import cron from 'node-cron';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb, schema } from './db/index.js';
import { seedDemoData } from './db/seed.js';
import { env } from './lib/env.js';
import { logger } from './lib/logger.js';
import { sendPush } from './lib/push.js';
import { sms } from './lib/sms.js';
import { auditMiddleware } from './middleware/audit.js';
import { rateLimit } from './middleware/rate-limit.js';
import { requireApiSession, sessionMiddleware } from './middleware/session.js';
import { aiRouter } from './routes/ai.js';
import { appointmentsRouter } from './routes/appointments.js';
import { auditRouter } from './routes/audit.js';
import { authRouter } from './routes/auth.js';
import { consentRouter } from './routes/consent.js';
import { encountersRouter } from './routes/encounters.js';
import { facilitiesRouter } from './routes/facilities.js';
import { fhirRouter } from './routes/fhir.js';
import { healthRouter } from './routes/health.js';
import { integrationsRouter } from './routes/integrations.js';
import { interactionsRouter } from './routes/interactions.js';
import { inventoryRouter } from './routes/inventory.js';
import { labsRouter } from './routes/labs.js';
import { patientsRouter } from './routes/patients.js';
import { prescriptionsRouter } from './routes/prescriptions.js';
import { referralsRouter } from './routes/referrals.js';
import { remindersRouter } from './routes/reminders.js';
import { smsRouter } from './routes/sms.js';
import { staffRouter } from './routes/staff.js';
import { statsRouter } from './routes/stats.js';
import { vaccinationsRouter } from './routes/vaccinations.js';
import { videoRouter } from './routes/video.js';
import { purgeExpiredAudio, voiceRouter } from './routes/voice.js';

export async function createApp() {
  await getDb();
  await seedDemoData();

  const app = express();
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST;
  if (!isTest) {
    app.use('/api', rateLimit({ windowMs: 60_000, max: 200 }));
    app.use('/api/auth/login', rateLimit({ windowMs: 60_000, max: 10 }));
    app.use('/api/sms/inbound', rateLimit({ windowMs: 60_000, max: 20 }));
  }

  app.use('/api', sessionMiddleware);
  app.use('/api', requireApiSession);
  app.use('/api', auditMiddleware);
  app.use('/api', healthRouter);
  app.use('/api', authRouter);
  app.use('/api', patientsRouter);
  app.use('/api', interactionsRouter);
  app.use('/api', prescriptionsRouter);
  app.use('/api', smsRouter);
  app.use('/api', remindersRouter);
  app.use('/api', voiceRouter);
  app.use('/api', videoRouter);
  app.use('/api', aiRouter);
  app.use('/api', appointmentsRouter);
  app.use('/api', labsRouter);
  app.use('/api', vaccinationsRouter);
  app.use('/api', referralsRouter);
  app.use('/api', consentRouter);
  app.use('/api', auditRouter);
  app.use('/api', staffRouter);
  app.use('/api', inventoryRouter);
  app.use('/api', encountersRouter);
  app.use('/api', statsRouter);
  app.use('/api', facilitiesRouter);
  app.use('/api', fhirRouter);
  app.use('/api', integrationsRouter);

  const distDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../dist');
  if (existsSync(distDir)) {
    app.use(express.static(distDir, { maxAge: '1h', index: 'index.html' }));
    app.get(/^(?!\/api\/).*$/, (_req, res) => {
      res.sendFile(resolve(distDir, 'index.html'));
    });
  }

  app.use(
    (err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      logger.error('unhandled_error', { path: req.path, method: req.method, message: err.message });
      res.status(500).json({ error: 'internal_error' });
    }
  );

  return app;
}

async function dispatchDueReminders() {
  const { db } = await getDb();
  const now = Date.now();
  const due = await db
    .select()
    .from(schema.medicationReminders)
    .where(
      and(
        eq(schema.medicationReminders.status, 'pending'),
        lte(schema.medicationReminders.scheduledTime, now)
      )
    );
  for (const reminder of due) {
    const [patient] = await db
      .select()
      .from(schema.patients)
      .where(eq(schema.patients.id, reminder.patientId));
    if (!patient) continue;
    const [presc] = await db
      .select()
      .from(schema.prescriptions)
      .where(eq(schema.prescriptions.id, reminder.prescriptionId));
    if (!presc) continue;
    if (reminder.channel === 'sms') {
      await sms.send({
        to: patient.phone,
        body: `MedCore reminder: Time for your ${presc.drugName} ${presc.dosage}. Reply TAKEN to confirm or SKIP to log a skip.`,
      });
    } else {
      const subs = await db
        .select()
        .from(schema.pushSubscriptions)
        .where(eq(schema.pushSubscriptions.userId, patient.id));
      for (const sub of subs) {
        await sendPush(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          {
            title: 'Time for your medication',
            body: `${presc.drugName} ${presc.dosage}`,
            tag: presc.id,
          }
        );
      }
    }
    await db
      .update(schema.medicationReminders)
      .set({ status: 'sent' })
      .where(eq(schema.medicationReminders.id, reminder.id))
      .run();
  }
}

function isDirectEntry() {
  if (process.env.VITEST || process.env.NODE_ENV === 'test') return false;
  const argv = process.argv[1];
  if (!argv) return false;
  try {
    return resolve(fileURLToPath(import.meta.url)) === resolve(argv);
  } catch {
    return false;
  }
}

if (isDirectEntry()) {
  try {
    const app = await createApp();
    app.listen(env.PORT, () => {
      logger.info('api_listening', { port: env.PORT, url: `http://localhost:${env.PORT}` });
    });

    cron.schedule('* * * * *', () => {
      dispatchDueReminders().catch(err =>
        logger.error('cron_reminders_failed', { message: err?.message })
      );
    });
    cron.schedule('0 * * * *', () => {
      purgeExpiredAudio().catch(err =>
        logger.error('cron_audio_failed', { message: err?.message })
      );
    });
  } catch (err) {
    logger.error('api_start_failed', { message: (err as Error)?.message });
    process.exit(1);
  }
}
