import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { getDb, schema } from '../db/index.js';
import { newId } from '../lib/ids.js';
import { checkInsuranceEligibility, parseCsv, verifyNationalId } from '../lib/integrations.js';
import { logger } from '../lib/logger.js';

export const integrationsRouter = Router();

integrationsRouter.post('/registry/verify', async (req, res) => {
  const { patientId, nationalId } = req.body as { patientId?: string; nationalId?: string };
  if (!patientId && !nationalId)
    return res.status(400).json({ error: 'patientId_or_nationalId_required' });

  let idToVerify = nationalId;
  let matchedName: string | undefined;

  if (patientId) {
    const { db } = await getDb();
    const [p] = await db.select().from(schema.patients).where(eq(schema.patients.id, patientId));
    if (!p) return res.status(404).json({ error: 'patient_not_found' });
    idToVerify = idToVerify ?? p.nationalId;
    matchedName = `${p.firstName} ${p.lastName}`;
  }

  const result = await verifyNationalId({ nationalId: idToVerify!, expectedName: matchedName });
  logger.info('registry_verify', { patientId, status: result.status, provider: result.provider });
  res.json(result);
});

integrationsRouter.post('/insurance/eligibility', async (req, res) => {
  const body = req.body as { patientId?: string; scheme?: string; memberNumber?: string };
  let { scheme, memberNumber } = body;

  if (body.patientId) {
    const { db } = await getDb();
    const [p] = await db
      .select()
      .from(schema.patients)
      .where(eq(schema.patients.id, body.patientId));
    if (!p) return res.status(404).json({ error: 'patient_not_found' });
    if (!scheme) scheme = (p.insuranceScheme ?? 'NHIF').split(' ')[0];
    if (!memberNumber) memberNumber = p.nationalId;
  }

  if (!scheme || !memberNumber)
    return res.status(400).json({ error: 'scheme_and_memberNumber_required' });

  const result = await checkInsuranceEligibility({ scheme, memberNumber });
  logger.info('insurance_eligibility', {
    patientId: body.patientId,
    scheme,
    status: result.status,
    provider: result.provider,
  });
  res.json(result);
});

integrationsRouter.post('/labs/import', async (req, res) => {
  const { csv } = req.body as { csv?: string };
  if (!csv || typeof csv !== 'string') return res.status(400).json({ error: 'csv_required' });

  const rows = parseCsv(csv);
  if (rows.length === 0) return res.status(400).json({ error: 'empty_or_invalid_csv' });

  const { db } = await getDb();
  const allowedStatuses = new Set(['normal', 'high', 'low', 'critical']);
  const errors: { row: number; reason: string }[] = [];
  let imported = 0;
  const now = Date.now();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const lineNo = i + 2;
    const patientId = r.patient_id || r.patientid;
    const testName = r.test_name || r.testname || r.test;
    const value = r.value || r.result;

    if (!patientId || !testName || !value) {
      errors.push({
        row: lineNo,
        reason: 'missing required fields (patient_id, test_name, value)',
      });
      continue;
    }

    const [p] = await db.select().from(schema.patients).where(eq(schema.patients.id, patientId));
    if (!p) {
      errors.push({ row: lineNo, reason: `patient ${patientId} not found` });
      continue;
    }

    const statusRaw = (r.status || 'normal').toLowerCase();
    const status = (allowedStatuses.has(statusRaw) ? statusRaw : 'normal') as
      'normal' | 'high' | 'low' | 'critical';
    const collectedAt = r.collected_at ? new Date(r.collected_at).getTime() : now;
    if (Number.isNaN(collectedAt)) {
      errors.push({ row: lineNo, reason: `invalid collected_at date: ${r.collected_at}` });
      continue;
    }

    await db.insert(schema.labResults).values({
      id: newId('LAB'),
      patientId,
      testName,
      value,
      unit: r.unit || null,
      referenceRange: r.reference_range || r.referencerange || null,
      status,
      collectedAt,
      reviewedByDoctor: 0,
      plainEnglish: r.plain_english || null,
      createdAt: now,
    });
    imported++;
  }

  logger.info('labs_csv_import', { imported, errors: errors.length, total: rows.length });
  res.json({ imported, errors, total: rows.length });
});
