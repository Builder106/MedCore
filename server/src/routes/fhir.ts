import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { getDb, schema } from '../db/index.js';
import {
  toFhirBundle,
  toFhirEncounter,
  toFhirImmunization,
  toFhirMedicationRequest,
  toFhirObservation,
  toFhirPatient,
  type FhirResource,
} from '../lib/fhir-mappers.js';

export const fhirRouter = Router();

const FHIR_JSON = 'application/fhir+json';

fhirRouter.get('/fhir/metadata', (_req, res) => {
  res.setHeader('Content-Type', FHIR_JSON);
  res.json({
    resourceType: 'CapabilityStatement',
    status: 'active',
    date: new Date().toISOString().slice(0, 10),
    kind: 'instance',
    software: { name: 'MedCore', version: '1.0.0' },
    fhirVersion: '4.0.1',
    format: [FHIR_JSON],
    rest: [
      {
        mode: 'server',
        resource: [
          { type: 'Patient', interaction: [{ code: 'read' }] },
          {
            type: 'MedicationRequest',
            interaction: [{ code: 'search-type' }],
            searchParam: [{ name: 'patient', type: 'reference' }],
          },
          {
            type: 'Observation',
            interaction: [{ code: 'search-type' }],
            searchParam: [
              { name: 'patient', type: 'reference' },
              { name: 'category', type: 'token' },
            ],
          },
          {
            type: 'Immunization',
            interaction: [{ code: 'search-type' }],
            searchParam: [{ name: 'patient', type: 'reference' }],
          },
          {
            type: 'Encounter',
            interaction: [{ code: 'search-type' }],
            searchParam: [{ name: 'patient', type: 'reference' }],
          },
        ],
        operation: [
          {
            name: 'everything',
            definition: 'http://hl7.org/fhir/OperationDefinition/Patient-everything',
          },
        ],
      },
    ],
  });
});

fhirRouter.get('/fhir/Patient/:id', async (req, res) => {
  const { db } = await getDb();
  const [patient] = await db
    .select()
    .from(schema.patients)
    .where(eq(schema.patients.id, req.params.id));
  if (!patient)
    return res.status(404).json({
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'not-found', diagnostics: 'Patient not found' }],
    });
  res.setHeader('Content-Type', FHIR_JSON);
  res.json(toFhirPatient(patient));
});

// FHIR $everything — regex handles the literal `$` in the path
fhirRouter.get(/^\/fhir\/Patient\/([^/]+)\/\$everything$/, async (req, res) => {
  const patientId = (req.params as Record<string, string>)[0];
  const { db } = await getDb();

  const [patient] = await db
    .select()
    .from(schema.patients)
    .where(eq(schema.patients.id, patientId));
  if (!patient)
    return res.status(404).json({
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'not-found', diagnostics: 'Patient not found' }],
    });

  const [rxs, labs, vaxs, encs] = await Promise.all([
    db.select().from(schema.prescriptions).where(eq(schema.prescriptions.patientId, patientId)),
    db.select().from(schema.labResults).where(eq(schema.labResults.patientId, patientId)),
    db.select().from(schema.vaccinations).where(eq(schema.vaccinations.patientId, patientId)),
    db.select().from(schema.encounters).where(eq(schema.encounters.patientId, patientId)),
  ]);

  const resources: FhirResource[] = [
    toFhirPatient(patient),
    ...rxs.map(toFhirMedicationRequest),
    ...labs.map(toFhirObservation),
    ...vaxs.map(toFhirImmunization),
    ...encs.map(toFhirEncounter),
  ];

  res.setHeader('Content-Type', FHIR_JSON);
  res.json(toFhirBundle(patientId, resources));
});

fhirRouter.get('/fhir/MedicationRequest', async (req, res) => {
  const patientId = req.query.patient as string | undefined;
  if (!patientId)
    return res.status(400).json({
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'required', diagnostics: '?patient= is required' }],
    });
  const { db } = await getDb();
  const rows = await db
    .select()
    .from(schema.prescriptions)
    .where(eq(schema.prescriptions.patientId, patientId));
  res.setHeader('Content-Type', FHIR_JSON);
  res.json({
    resourceType: 'Bundle',
    type: 'searchset',
    total: rows.length,
    entry: rows.map(r => ({ resource: toFhirMedicationRequest(r) })),
  });
});

fhirRouter.get('/fhir/Observation', async (req, res) => {
  const patientId = req.query.patient as string | undefined;
  if (!patientId)
    return res.status(400).json({
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'required', diagnostics: '?patient= is required' }],
    });
  const { db } = await getDb();
  const rows = await db
    .select()
    .from(schema.labResults)
    .where(eq(schema.labResults.patientId, patientId));
  res.setHeader('Content-Type', FHIR_JSON);
  res.json({
    resourceType: 'Bundle',
    type: 'searchset',
    total: rows.length,
    entry: rows.map(r => ({ resource: toFhirObservation(r) })),
  });
});

fhirRouter.get('/fhir/Immunization', async (req, res) => {
  const patientId = req.query.patient as string | undefined;
  if (!patientId)
    return res.status(400).json({
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'required', diagnostics: '?patient= is required' }],
    });
  const { db } = await getDb();
  const rows = await db
    .select()
    .from(schema.vaccinations)
    .where(eq(schema.vaccinations.patientId, patientId));
  res.setHeader('Content-Type', FHIR_JSON);
  res.json({
    resourceType: 'Bundle',
    type: 'searchset',
    total: rows.length,
    entry: rows.map(r => ({ resource: toFhirImmunization(r) })),
  });
});

fhirRouter.get('/fhir/Encounter', async (req, res) => {
  const patientId = req.query.patient as string | undefined;
  if (!patientId)
    return res.status(400).json({
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'required', diagnostics: '?patient= is required' }],
    });
  const { db } = await getDb();
  const rows = await db
    .select()
    .from(schema.encounters)
    .where(eq(schema.encounters.patientId, patientId));
  res.setHeader('Content-Type', FHIR_JSON);
  res.json({
    resourceType: 'Bundle',
    type: 'searchset',
    total: rows.length,
    entry: rows.map(r => ({ resource: toFhirEncounter(r) })),
  });
});
