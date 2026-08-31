import { describe, expect, it } from 'vitest';
import {
  toFhirBundle,
  toFhirEncounter,
  toFhirImmunization,
  toFhirMedicationRequest,
  toFhirObservation,
  toFhirPatient,
} from '../lib/fhir-mappers.js';

const BASE_PATIENT = {
  id: 'PAT-001',
  firstName: 'Amina',
  lastName: 'Wanjiru',
  dob: '1990-05-15',
  phone: '+254700000001',
  nationalId: '12345678',
  bloodType: 'O+',
  allergies: '["Penicillin","Sulfa"]',
  createdAt: 1_700_000_000_000,
};

const BASE_RX = {
  id: 'RX-001',
  patientId: 'PAT-001',
  drugName: 'Metformin',
  dosage: '500mg',
  frequency: 'Twice daily',
  duration: '3 months',
  status: 'active',
  notes: null,
  createdAt: 1_700_000_000_000,
};

const BASE_LAB = {
  id: 'LAB-001',
  patientId: 'PAT-001',
  testName: 'HbA1c',
  value: '7.2',
  unit: '%',
  referenceRange: '< 5.7%',
  status: 'high',
  collectedAt: 1_700_000_000_000,
  reviewedByDoctor: 1,
};

const BASE_VAX = {
  id: 'VAX-001',
  patientId: 'PAT-001',
  vaccineName: 'BCG',
  doseNumber: 1,
  batch: 'BATCH-42',
  site: 'Left arm',
  administeredAt: 1_700_000_000_000,
  administeredBy: 'Dr. Omondi',
};

const BASE_ENC = {
  id: 'ENC-001',
  patientId: 'PAT-001',
  encounterDate: 1_700_000_000_000,
  type: 'consultation',
  chiefComplaint: 'Headache',
  diagnosis: 'Tension headache',
};

// ── toFhirPatient ─────────────────────────────────────────────────────────────

describe('toFhirPatient', () => {
  it('returns resourceType Patient with correct id', () => {
    const r = toFhirPatient(BASE_PATIENT);
    expect(r.resourceType).toBe('Patient');
    expect(r.id).toBe('PAT-001');
  });

  it('maps name correctly', () => {
    const r = toFhirPatient(BASE_PATIENT);
    expect(r.name[0].family).toBe('Wanjiru');
    expect(r.name[0].given?.[0]).toBe('Amina');
  });

  it('includes both patient-id and national-id identifiers', () => {
    const r = toFhirPatient(BASE_PATIENT);
    const systems = r.identifier.map(i => i.system);
    expect(systems).toContain('urn:medcore:patient-id');
    expect(systems).toContain('urn:medcore:national-id');
  });

  it('includes blood type extension when present', () => {
    const r = toFhirPatient(BASE_PATIENT);
    expect(r.extension?.[0].url).toBe('urn:medcore:blood-type');
    expect(r.extension?.[0].valueString).toBe('O+');
  });

  it('omits extension when bloodType is null', () => {
    const r = toFhirPatient({ ...BASE_PATIENT, bloodType: null });
    expect(r.extension).toBeUndefined();
  });

  it('parses allergies array and includes allergyIntolerance resources', () => {
    const r = toFhirPatient(BASE_PATIENT);
    expect(r.allergyIntolerance).toHaveLength(2);
    expect(r.allergyIntolerance?.[0].code.text).toBe('Penicillin');
  });

  it('omits allergyIntolerance when allergies is empty array', () => {
    const r = toFhirPatient({ ...BASE_PATIENT, allergies: '[]' });
    expect(r.allergyIntolerance).toBeUndefined();
  });

  it('omits allergyIntolerance when allergies is malformed JSON', () => {
    const r = toFhirPatient({ ...BASE_PATIENT, allergies: 'not-json' });
    expect(r.allergyIntolerance).toBeUndefined();
  });

  it('includes telecom with phone value', () => {
    const r = toFhirPatient(BASE_PATIENT);
    expect(r.telecom[0].system).toBe('phone');
    expect(r.telecom[0].value).toBe('+254700000001');
  });

  it('sets birthDate from dob', () => {
    const r = toFhirPatient(BASE_PATIENT);
    expect(r.birthDate).toBe('1990-05-15');
  });
});

// ── toFhirMedicationRequest ───────────────────────────────────────────────────

describe('toFhirMedicationRequest', () => {
  it('returns resourceType MedicationRequest', () => {
    const r = toFhirMedicationRequest(BASE_RX);
    expect(r.resourceType).toBe('MedicationRequest');
    expect(r.id).toBe('RX-001');
  });

  it('maps active status correctly', () => {
    const r = toFhirMedicationRequest(BASE_RX);
    expect(r.status).toBe('active');
  });

  it('maps discontinued to stopped', () => {
    const r = toFhirMedicationRequest({ ...BASE_RX, status: 'discontinued' });
    expect(r.status).toBe('stopped');
  });

  it('maps completed status correctly', () => {
    const r = toFhirMedicationRequest({ ...BASE_RX, status: 'completed' });
    expect(r.status).toBe('completed');
  });

  it('maps unknown status to unknown', () => {
    const r = toFhirMedicationRequest({ ...BASE_RX, status: 'anything_else' });
    expect(r.status).toBe('unknown');
  });

  it('sets subject reference to Patient/id', () => {
    const r = toFhirMedicationRequest(BASE_RX);
    expect(r.subject.reference).toBe('Patient/PAT-001');
  });

  it('includes dosage instruction combining dosage, frequency, duration', () => {
    const r = toFhirMedicationRequest(BASE_RX);
    expect(r.dosageInstruction[0].text).toContain('500mg');
    expect(r.dosageInstruction[0].text).toContain('Twice daily');
    expect(r.dosageInstruction[0].text).toContain('for 3 months');
  });

  it('handles dosage instruction without duration', () => {
    const r = toFhirMedicationRequest({ ...BASE_RX, duration: '' });
    expect(r.dosageInstruction[0].text).toBe('500mg Twice daily');
  });

  it('omits note when notes is null', () => {
    const r = toFhirMedicationRequest(BASE_RX);
    expect(r.note).toBeUndefined();
  });

  it('includes note when notes is set', () => {
    const r = toFhirMedicationRequest({ ...BASE_RX, notes: 'Take with food' });
    expect(r.note?.[0].text).toBe('Take with food');
  });
});

// ── toFhirObservation ─────────────────────────────────────────────────────────

describe('toFhirObservation', () => {
  it('returns resourceType Observation', () => {
    const r = toFhirObservation(BASE_LAB);
    expect(r.resourceType).toBe('Observation');
    expect(r.id).toBe('LAB-001');
  });

  it('sets status to final when reviewedByDoctor = 1', () => {
    const r = toFhirObservation(BASE_LAB);
    expect(r.status).toBe('final');
  });

  it('sets status to preliminary when not reviewed', () => {
    const r = toFhirObservation({ ...BASE_LAB, reviewedByDoctor: 0 });
    expect(r.status).toBe('preliminary');
  });

  it('concatenates value and unit in valueString', () => {
    const r = toFhirObservation(BASE_LAB);
    expect(r.valueString).toBe('7.2 %');
  });

  it('uses value alone when unit is null', () => {
    const r = toFhirObservation({ ...BASE_LAB, unit: null });
    expect(r.valueString).toBe('7.2');
  });

  it('includes referenceRange when set', () => {
    const r = toFhirObservation(BASE_LAB);
    expect(r.referenceRange?.[0].text).toBe('< 5.7%');
  });

  it('omits referenceRange when null', () => {
    const r = toFhirObservation({ ...BASE_LAB, referenceRange: null });
    expect(r.referenceRange).toBeUndefined();
  });

  it('includes interpretation code H for high status', () => {
    const r = toFhirObservation(BASE_LAB);
    expect(r.interpretation?.[0].coding[0].code).toBe('H');
  });

  it('includes interpretation code L for low status', () => {
    const r = toFhirObservation({ ...BASE_LAB, status: 'low' });
    expect(r.interpretation?.[0].coding[0].code).toBe('L');
  });

  it('includes interpretation code AA for critical status', () => {
    const r = toFhirObservation({ ...BASE_LAB, status: 'critical' });
    expect(r.interpretation?.[0].coding[0].code).toBe('AA');
  });

  it('defaults interpretation code to U for unrecognized status', () => {
    const r = toFhirObservation({ ...BASE_LAB, status: 'indeterminate' });
    expect(r.interpretation?.[0].coding[0].code).toBe('U');
  });

  it('omits interpretation for normal status', () => {
    const r = toFhirObservation({ ...BASE_LAB, status: 'normal' });
    expect(r.interpretation).toBeUndefined();
  });

  it('includes laboratory category coding', () => {
    const r = toFhirObservation(BASE_LAB);
    expect(r.category[0].coding[0].code).toBe('laboratory');
  });
});

// ── toFhirImmunization ────────────────────────────────────────────────────────

describe('toFhirImmunization', () => {
  it('returns resourceType Immunization', () => {
    const r = toFhirImmunization(BASE_VAX);
    expect(r.resourceType).toBe('Immunization');
    expect(r.id).toBe('VAX-001');
  });

  it('always sets status to completed', () => {
    const r = toFhirImmunization(BASE_VAX);
    expect(r.status).toBe('completed');
  });

  it('sets patient reference', () => {
    const r = toFhirImmunization(BASE_VAX);
    expect(r.patient.reference).toBe('Patient/PAT-001');
  });

  it('includes lotNumber when batch is set', () => {
    const r = toFhirImmunization(BASE_VAX);
    expect(r.lotNumber).toBe('BATCH-42');
  });

  it('omits lotNumber when batch is null', () => {
    const r = toFhirImmunization({ ...BASE_VAX, batch: null });
    expect(r.lotNumber).toBeUndefined();
  });

  it('includes protocolApplied for dose > 1', () => {
    const r = toFhirImmunization({ ...BASE_VAX, doseNumber: 2 });
    expect(r.protocolApplied?.[0].doseNumberPositiveInt).toBe(2);
  });

  it('omits protocolApplied for dose 1', () => {
    const r = toFhirImmunization(BASE_VAX);
    expect(r.protocolApplied).toBeUndefined();
  });

  it('includes site when site is set', () => {
    const r = toFhirImmunization(BASE_VAX);
    expect(r.site?.text).toBe('Left arm');
  });

  it('omits site when site is null', () => {
    const r = toFhirImmunization({ ...BASE_VAX, site: null });
    expect(r.site).toBeUndefined();
  });

  it('includes performer when administeredBy is set', () => {
    const r = toFhirImmunization(BASE_VAX);
    expect(r.performer?.[0].actor.display).toBe('Dr. Omondi');
  });

  it('omits performer when administeredBy is null', () => {
    const r = toFhirImmunization({ ...BASE_VAX, administeredBy: null });
    expect(r.performer).toBeUndefined();
  });
});

// ── toFhirEncounter ───────────────────────────────────────────────────────────

describe('toFhirEncounter', () => {
  it('returns resourceType Encounter', () => {
    const r = toFhirEncounter(BASE_ENC);
    expect(r.resourceType).toBe('Encounter');
    expect(r.id).toBe('ENC-001');
  });

  it('always sets status to finished', () => {
    const r = toFhirEncounter(BASE_ENC);
    expect(r.status).toBe('finished');
  });

  it('maps consultation type to AMB class code', () => {
    const r = toFhirEncounter(BASE_ENC);
    expect(r.class.code).toBe('AMB');
  });

  it('maps emergency type to EMER class code', () => {
    const r = toFhirEncounter({ ...BASE_ENC, type: 'emergency' });
    expect(r.class.code).toBe('EMER');
  });

  it('maps telemedicine type to VR class code', () => {
    const r = toFhirEncounter({ ...BASE_ENC, type: 'telemedicine' });
    expect(r.class.code).toBe('VR');
  });

  it('defaults unknown type to AMB', () => {
    const r = toFhirEncounter({ ...BASE_ENC, type: 'other' });
    expect(r.class.code).toBe('AMB');
  });

  it('includes reasonCode when chiefComplaint is set', () => {
    const r = toFhirEncounter(BASE_ENC);
    expect(r.reasonCode?.[0].text).toBe('Headache');
  });

  it('omits reasonCode when chiefComplaint is null', () => {
    const r = toFhirEncounter({ ...BASE_ENC, chiefComplaint: null });
    expect(r.reasonCode).toBeUndefined();
  });

  it('includes diagnosis when set', () => {
    const r = toFhirEncounter(BASE_ENC);
    expect(r.diagnosis?.[0].condition.display).toBe('Tension headache');
  });

  it('omits diagnosis when diagnosis is null', () => {
    const r = toFhirEncounter({ ...BASE_ENC, diagnosis: null });
    expect(r.diagnosis).toBeUndefined();
  });
});

// ── toFhirBundle ──────────────────────────────────────────────────────────────

describe('toFhirBundle', () => {
  const patient = toFhirPatient(BASE_PATIENT);
  const rx = toFhirMedicationRequest(BASE_RX);

  it('returns resourceType Bundle of type collection', () => {
    const b = toFhirBundle('PAT-001', [patient, rx]);
    expect(b.resourceType).toBe('Bundle');
    expect(b.type).toBe('collection');
  });

  it('sets total to the number of resources', () => {
    const b = toFhirBundle('PAT-001', [patient, rx]);
    expect(b.total).toBe(2);
  });

  it('generates entry array with fullUrl and resource', () => {
    const b = toFhirBundle('PAT-001', [patient]);
    expect(b.entry[0].fullUrl).toBe('urn:uuid:PAT-001');
    expect(b.entry[0].resource.id).toBe('PAT-001');
  });

  it('includes a valid ISO timestamp', () => {
    const b = toFhirBundle('PAT-001', []);
    expect(b.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('returns empty entry array for empty resources', () => {
    const b = toFhirBundle('PAT-001', []);
    expect(b.entry).toHaveLength(0);
    expect(b.total).toBe(0);
  });

  it('sets id to patient-{id}-everything', () => {
    const b = toFhirBundle('PAT-001', []);
    expect(b.id).toBe('patient-PAT-001-everything');
  });
});
