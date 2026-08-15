// Maps MedCore DB rows to FHIR R4 resource objects (read-only export).

export interface FhirResource {
  resourceType: string;
  id: string;
  [key: string]: unknown;
}

export interface FhirBundle {
  resourceType: 'Bundle';
  id: string;
  type: 'collection';
  timestamp: string;
  total: number;
  entry: { fullUrl: string; resource: FhirResource }[];
}

export interface FhirExtension {
  url: string;
  valueString?: string;
  [key: string]: unknown;
}

export interface FhirIdentifier {
  system: string;
  value: string;
}

export interface FhirName {
  use?: string;
  family?: string;
  given?: string[];
}

export interface FhirTelecom {
  system: string;
  value: string;
  use?: string;
}

export interface FhirAllergyIntolerance {
  resourceType: 'AllergyIntolerance';
  id: string;
  patient: { reference: string };
  code: { text: string };
  clinicalStatus: { coding: Array<{ code: string }> };
}

export interface FhirPatient extends FhirResource {
  resourceType: 'Patient';
  id: string;
  meta: { lastUpdated: string };
  identifier: FhirIdentifier[];
  name: FhirName[];
  telecom: FhirTelecom[];
  birthDate: string;
  extension?: FhirExtension[];
  allergyIntolerance?: FhirAllergyIntolerance[];
}

export interface FhirMedicationRequest extends FhirResource {
  resourceType: 'MedicationRequest';
  id: string;
  status: string;
  intent: string;
  medicationCodeableConcept: { text: string };
  subject: { reference: string };
  authoredOn: string;
  dosageInstruction: Array<{ text: string }>;
  note?: Array<{ text: string }>;
}

export interface FhirObservation extends FhirResource {
  resourceType: 'Observation';
  id: string;
  status: string;
  category: Array<{ coding: Array<{ system: string; code: string; display: string }> }>;
  code: { text: string };
  subject: { reference: string };
  effectiveDateTime: string;
  valueString: string;
  referenceRange?: Array<{ text: string }>;
  interpretation?: Array<{ coding: Array<{ system: string; code: string; display: string }> }>;
}

export interface FhirImmunization extends FhirResource {
  resourceType: 'Immunization';
  id: string;
  status: string;
  vaccineCode: { text: string };
  patient: { reference: string };
  occurrenceDateTime: string;
  protocolApplied?: Array<{ doseNumberPositiveInt: number }>;
  lotNumber?: string;
  site?: { text: string };
  performer?: Array<{ actor: { display: string | null } }>;
}

export interface FhirEncounter extends FhirResource {
  resourceType: 'Encounter';
  id: string;
  status: string;
  class: { system: string; code: string; display: string };
  type: Array<{ text: string }>;
  subject: { reference: string };
  period: { start: string };
  reasonCode?: Array<{ text: string }>;
  diagnosis?: Array<{ condition: { display: string | null } }>;
}

type PatientRow = {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  phone: string;
  nationalId: string;
  bloodType: string | null;
  allergies: string;
  createdAt: number;
};
type PrescriptionRow = {
  id: string;
  patientId: string;
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string | null;
  status: string;
  notes: string | null;
  createdAt: number;
};
type LabRow = {
  id: string;
  patientId: string;
  testName: string;
  value: string;
  unit: string | null;
  referenceRange: string | null;
  status: string;
  collectedAt: number;
  reviewedByDoctor: number;
};
type VaxRow = {
  id: string;
  patientId: string;
  vaccineName: string;
  doseNumber: number;
  batch: string | null;
  site: string | null;
  administeredAt: number;
  administeredBy: string | null;
};
type EncounterRow = {
  id: string;
  patientId: string;
  encounterDate: number;
  type: string;
  chiefComplaint: string | null;
  diagnosis: string | null;
};

export function toFhirPatient(p: PatientRow): FhirPatient {
  const allergies = (() => {
    try {
      return JSON.parse(p.allergies) as string[];
    } catch {
      return [];
    }
  })();
  return {
    resourceType: 'Patient',
    id: p.id,
    meta: { lastUpdated: new Date(p.createdAt).toISOString() },
    identifier: [
      { system: 'urn:medcore:patient-id', value: p.id },
      { system: 'urn:medcore:national-id', value: p.nationalId },
    ],
    name: [{ use: 'official', family: p.lastName, given: [p.firstName] }],
    telecom: [{ system: 'phone', value: p.phone, use: 'mobile' }],
    birthDate: p.dob,
    ...(p.bloodType
      ? { extension: [{ url: 'urn:medcore:blood-type', valueString: p.bloodType }] }
      : {}),
    ...(allergies.length
      ? {
          allergyIntolerance: allergies.map((a, i) => ({
            resourceType: 'AllergyIntolerance' as const,
            id: `allergy-${p.id}-${i}`,
            patient: { reference: `Patient/${p.id}` },
            code: { text: a },
            clinicalStatus: { coding: [{ code: 'active' }] },
          })),
        }
      : {}),
  };
}

export function toFhirMedicationRequest(rx: PrescriptionRow): FhirMedicationRequest {
  const statusMap: Record<string, string> = {
    active: 'active',
    completed: 'completed',
    discontinued: 'stopped',
  };
  return {
    resourceType: 'MedicationRequest',
    id: rx.id,
    status: statusMap[rx.status] ?? 'unknown',
    intent: 'order',
    medicationCodeableConcept: { text: rx.drugName },
    subject: { reference: `Patient/${rx.patientId}` },
    authoredOn: new Date(rx.createdAt).toISOString().slice(0, 10),
    dosageInstruction: [
      {
        text: [rx.dosage, rx.frequency, rx.duration ? `for ${rx.duration}` : '']
          .filter(Boolean)
          .join(' '),
      },
    ],
    ...(rx.notes ? { note: [{ text: rx.notes }] } : {}),
  };
}

export function toFhirObservation(lab: LabRow): FhirObservation {
  const interpCode: Record<string, string> = { high: 'H', low: 'L', critical: 'AA', normal: 'N' };
  return {
    resourceType: 'Observation',
    id: lab.id,
    status: lab.reviewedByDoctor ? 'final' : 'preliminary',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'laboratory',
            display: 'Laboratory',
          },
        ],
      },
    ],
    code: { text: lab.testName },
    subject: { reference: `Patient/${lab.patientId}` },
    effectiveDateTime: new Date(lab.collectedAt).toISOString(),
    valueString: lab.unit ? `${lab.value} ${lab.unit}` : lab.value,
    ...(lab.referenceRange ? { referenceRange: [{ text: lab.referenceRange }] } : {}),
    ...(lab.status !== 'normal'
      ? {
          interpretation: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                  code: interpCode[lab.status] ?? 'U',
                  display: lab.status,
                },
              ],
            },
          ],
        }
      : {}),
  };
}

export function toFhirImmunization(vax: VaxRow): FhirImmunization {
  return {
    resourceType: 'Immunization',
    id: vax.id,
    status: 'completed',
    vaccineCode: { text: vax.vaccineName },
    patient: { reference: `Patient/${vax.patientId}` },
    occurrenceDateTime: new Date(vax.administeredAt).toISOString(),
    ...(vax.doseNumber > 1 ? { protocolApplied: [{ doseNumberPositiveInt: vax.doseNumber }] } : {}),
    ...(vax.batch ? { lotNumber: vax.batch } : {}),
    ...(vax.site ? { site: { text: vax.site } } : {}),
    ...(vax.administeredBy ? { performer: [{ actor: { display: vax.administeredBy } }] } : {}),
  };
}

export function toFhirEncounter(enc: EncounterRow): FhirEncounter {
  const classCode: Record<string, { code: string; display: string }> = {
    consultation: { code: 'AMB', display: 'ambulatory' },
    follow_up: { code: 'AMB', display: 'ambulatory' },
    emergency: { code: 'EMER', display: 'emergency' },
    telemedicine: { code: 'VR', display: 'virtual' },
  };
  const cls = classCode[enc.type] ?? { code: 'AMB', display: 'ambulatory' };
  return {
    resourceType: 'Encounter',
    id: enc.id,
    status: 'finished',
    class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', ...cls },
    type: [{ text: enc.type.replace('_', ' ') }],
    subject: { reference: `Patient/${enc.patientId}` },
    period: { start: new Date(enc.encounterDate).toISOString() },
    ...(enc.chiefComplaint ? { reasonCode: [{ text: enc.chiefComplaint }] } : {}),
    ...(enc.diagnosis ? { diagnosis: [{ condition: { display: enc.diagnosis } }] } : {}),
  };
}

export function toFhirBundle(patientId: string, resources: FhirResource[]): FhirBundle {
  return {
    resourceType: 'Bundle',
    id: `patient-${patientId}-everything`,
    type: 'collection',
    timestamp: new Date().toISOString(),
    total: resources.length,
    entry: resources.map(r => ({ fullUrl: `urn:uuid:${r.id}`, resource: r })),
  };
}
