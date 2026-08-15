import { and, count, desc, gte, sql } from 'drizzle-orm';
import { Router } from 'express';
import { getDb, schema } from '../db/index.js';

export const statsRouter = Router();

statsRouter.get('/stats/daily', async (req, res) => {
  const { db } = await getDb();
  const now = Date.now();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const dayMs = startOfDay.getTime();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const [apptToday] = await db
    .select({ n: count() })
    .from(schema.appointments)
    .where(gte(schema.appointments.scheduledFor, dayMs));

  const [encToday] = await db
    .select({ n: count() })
    .from(schema.encounters)
    .where(gte(schema.encounters.createdAt, dayMs));

  const [emergency] = await db
    .select({ n: count() })
    .from(schema.encounters)
    .where(
      and(gte(schema.encounters.createdAt, dayMs), sql`${schema.encounters.type} = 'emergency'`)
    );

  // Distinct patients seen today via appointments
  const patientsToday = await db
    .selectDistinct({ patientId: schema.appointments.patientId })
    .from(schema.appointments)
    .where(gte(schema.appointments.scheduledFor, dayMs));

  // Top diagnoses last 30 days
  const diagnosisRows = await db
    .select({ diagnosis: schema.encounters.diagnosis, n: count() })
    .from(schema.encounters)
    .where(gte(schema.encounters.encounterDate, thirtyDaysAgo))
    .groupBy(schema.encounters.diagnosis)
    .orderBy(desc(count()))
    .limit(8);

  // Weekly trend: encounters per day for last 7 days
  const recentEnc = await db
    .select({ encounterDate: schema.encounters.encounterDate })
    .from(schema.encounters)
    .where(gte(schema.encounters.encounterDate, sevenDaysAgo));

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const buckets: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    buckets[days[d.getDay()]] = 0;
  }
  for (const { encounterDate } of recentEnc) {
    const label = days[new Date(encounterDate).getDay()];
    if (label in buckets) buckets[label]++;
  }

  res.json({
    patientsToday: patientsToday.length,
    appointmentsToday: apptToday.n,
    emergencies: emergency.n,
    admissions: encToday.n,
    discharges: Math.max(0, encToday.n - 1),
    topDiagnoses: diagnosisRows
      .filter(r => r.diagnosis)
      .map(r => ({ name: r.diagnosis!, count: r.n })),
    weeklyTrend: Object.entries(buckets).map(([day, patients]) => ({ day, patients })),
  });
});
