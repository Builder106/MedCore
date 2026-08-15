import { and, eq } from 'drizzle-orm';
import type { NextFunction, Request, Response } from 'express';
import { getDb, schema } from '../db/index.js';

type Role = 'doctor' | 'patient' | 'admin';

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    if (!roles.includes(req.auth.role as Role)) {
      res.status(403).json({ error: 'forbidden', requiredRole: roles });
      return;
    }
    next();
  };
}

export async function canAccessPatient(
  auth: { userId: string; role: string } | undefined,
  patientId: string
): Promise<boolean> {
  if (!auth) return false;
  if (auth.role === 'admin') return true;
  if (auth.role === 'patient') return auth.userId === patientId;
  if (auth.role === 'doctor') {
    const { db } = await getDb();
    const appts = await db
      .select()
      .from(schema.appointments)
      .where(
        and(
          eq(schema.appointments.doctorId, auth.userId),
          eq(schema.appointments.patientId, patientId)
        )
      )
      .limit(1);
    if (appts.length > 0) return true;
    const rx = await db
      .select()
      .from(schema.prescriptions)
      .where(
        and(
          eq(schema.prescriptions.doctorId, auth.userId),
          eq(schema.prescriptions.patientId, patientId)
        )
      )
      .limit(1);
    if (rx.length > 0) return true;
    const consent = await db
      .select()
      .from(schema.consentGrants)
      .where(
        and(
          eq(schema.consentGrants.patientId, patientId),
          eq(schema.consentGrants.grantedTo, auth.userId),
          eq(schema.consentGrants.status, 'active')
        )
      )
      .limit(1);
    if (consent.length > 0) return true;
    return false;
  }
  return false;
}

export function requirePatientAccess(paramName = 'patientId') {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    const rawParam = req.params[paramName];
    const patientId =
      (typeof rawParam === 'string' ? rawParam : undefined) ??
      (req.body?.patientId as string | undefined);
    if (!patientId) {
      res.status(400).json({ error: 'patient_id_required' });
      return;
    }
    const ok = await canAccessPatient(req.auth, patientId);
    if (!ok) {
      res.status(403).json({ error: 'no_patient_access' });
      return;
    }
    next();
  };
}
