// ============================================================
// MedCore — Centralised Digital Health Records Platform
// Mock Data Layer (simulates PostgreSQL + FHIR R4 store)
// ============================================================

export interface Patient {
  id: string;
  nationalId: string;
  firstName: string;
  lastName: string;
  phone: string;
  dob: string;
  gender: 'M' | 'F';
  bloodType: string;
  allergies: string[];
  language: 'en' | 'fr' | 'sw';
  insuranceScheme: string;
  photo?: string;
}

export interface Encounter {
  id: string;
  patientId: string;
  date: string;
  facilityName: string;
  doctorName: string;
  type: 'consultation' | 'emergency' | 'lab' | 'vaccination' | 'follow-up';
  diagnosis: string;
  notes: string;
  vitals?: { bp: string; temp: string; hr: string; weight: string };
}

export interface Prescription {
  id: string;
  patientId: string;
  encounterId: string;
  date: string;
  doctorName: string;
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    interactions?: string[];
  }[];
  status: 'active' | 'completed' | 'cancelled';
}

export interface LabResult {
  id: string;
  patientId: string;
  date: string;
  testName: string;
  result: string;
  referenceRange: string;
  status: 'normal' | 'abnormal' | 'critical';
  labName: string;
}

export interface Vaccination {
  id: string;
  patientId: string;
  date: string;
  vaccine: string;
  dose: string;
  batchNumber: string;
  site: string;
  nextDue?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  date: string;
  time: string;
  doctorName: string;
  facilityName: string;
  type: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  estimatedWait?: number;
}

export interface AuditEntry {
  id: string;
  patientId: string;
  accessedBy: string;
  role: string;
  action: string;
  section: string;
  timestamp: string;
  facility: string;
}

export interface ConsentRecord {
  id: string;
  patientId: string;
  providerName: string;
  facilityName: string;
  sections: string[];
  granted: boolean;
  grantedDate: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  facilityId: string;
  photo?: string;
}

export interface Facility {
  id: string;
  name: string;
  level: string;
  location: string;
  beds: number;
  bedsOccupied: number;
}

export interface Referral {
  id: string;
  patientId: string;
  fromDoctor: string;
  fromFacility: string;
  toDoctor: string;
  toFacility: string;
  reason: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  status: 'pending' | 'accepted' | 'completed';
  date: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  reorderLevel: number;
  unit: string;
  linkedPrescriptions: number;
}

// ----- MOCK DATA -----

export const patients: Patient[] = [
  {
    id: 'PAT-001',
    nationalId: 'KE-29384756',
    firstName: 'Amina',
    lastName: 'Okafor',
    phone: '+254712345678',
    dob: '1988-03-15',
    gender: 'F',
    bloodType: 'O+',
    allergies: ['Penicillin'],
    language: 'en',
    insuranceScheme: 'NHIF Kenya',
  },
  {
    id: 'PAT-002',
    nationalId: 'KE-84726153',
    firstName: 'Joseph',
    lastName: 'Kamau',
    phone: '+254723456789',
    dob: '1975-07-22',
    gender: 'M',
    bloodType: 'A+',
    allergies: [],
    language: 'sw',
    insuranceScheme: 'NHIF Kenya',
  },
  {
    id: 'PAT-003',
    nationalId: 'NG-56473829',
    firstName: 'Fatima',
    lastName: 'Bello',
    phone: '+2348012345678',
    dob: '1995-11-08',
    gender: 'F',
    bloodType: 'B+',
    allergies: ['Sulfa drugs'],
    language: 'en',
    insuranceScheme: 'NHIS Nigeria',
  },
  {
    id: 'PAT-004',
    nationalId: 'SN-73829156',
    firstName: 'Moussa',
    lastName: 'Diop',
    phone: '+221771234567',
    dob: '1962-01-30',
    gender: 'M',
    bloodType: 'AB-',
    allergies: ['Aspirin', 'Ibuprofen'],
    language: 'fr',
    insuranceScheme: 'CMU Sénégal',
  },
  {
    id: 'PAT-005',
    nationalId: 'TZ-19283746',
    firstName: 'Grace',
    lastName: 'Mwangi',
    phone: '+255784567890',
    dob: '2001-06-12',
    gender: 'F',
    bloodType: 'O-',
    allergies: [],
    language: 'sw',
    insuranceScheme: 'NHIF Tanzania',
  },
];

export const encounters: Encounter[] = [
  {
    id: 'ENC-001',
    patientId: 'PAT-001',
    date: '2026-04-10',
    facilityName: 'Kenyatta National Hospital',
    doctorName: 'Dr. Wanjiku Njeri',
    type: 'consultation',
    diagnosis: 'Type 2 Diabetes Mellitus',
    notes:
      'Patient presents with polyuria, polydipsia. Fasting glucose 11.2 mmol/L. Started on Metformin 500mg BD.',
    vitals: { bp: '138/88', temp: '36.7°C', hr: '82 bpm', weight: '78 kg' },
  },
  {
    id: 'ENC-002',
    patientId: 'PAT-001',
    date: '2026-03-05',
    facilityName: 'Kenyatta National Hospital',
    doctorName: 'Dr. Wanjiku Njeri',
    type: 'follow-up',
    diagnosis: 'Hypertension — controlled',
    notes: 'BP improving on current regimen. Continue Amlodipine 5mg OD.',
    vitals: { bp: '130/82', temp: '36.5°C', hr: '76 bpm', weight: '79 kg' },
  },
  {
    id: 'ENC-003',
    patientId: 'PAT-001',
    date: '2026-01-18',
    facilityName: "Nairobi Women's Hospital",
    doctorName: 'Dr. Otieno Odhiambo',
    type: 'lab',
    diagnosis: 'Routine blood work',
    notes: 'Annual screening. HbA1c elevated at 7.8%.',
    vitals: { bp: '142/90', temp: '36.8°C', hr: '80 bpm', weight: '80 kg' },
  },
  {
    id: 'ENC-004',
    patientId: 'PAT-002',
    date: '2026-04-14',
    facilityName: 'Moi Teaching Hospital',
    doctorName: 'Dr. Kimani Mwangi',
    type: 'emergency',
    diagnosis: 'Acute malaria (P. falciparum)',
    notes:
      'Rapid diagnostic test positive. Started on Artemether-Lumefantrine. IV fluids administered.',
    vitals: { bp: '100/60', temp: '39.4°C', hr: '110 bpm', weight: '72 kg' },
  },
  {
    id: 'ENC-005',
    patientId: 'PAT-002',
    date: '2026-02-20',
    facilityName: 'Moi Teaching Hospital',
    doctorName: 'Dr. Kimani Mwangi',
    type: 'consultation',
    diagnosis: 'Chronic kidney disease Stage 2',
    notes: 'eGFR 72 mL/min. Referred to nephrology for further evaluation.',
    vitals: { bp: '148/92', temp: '36.6°C', hr: '78 bpm', weight: '73 kg' },
  },
  {
    id: 'ENC-006',
    patientId: 'PAT-003',
    date: '2026-04-08',
    facilityName: 'Lagos University Teaching Hospital',
    doctorName: 'Dr. Adebayo Ogundimu',
    type: 'vaccination',
    diagnosis: 'COVID-19 Booster',
    notes: 'Pfizer bivalent booster administered. No adverse reactions.',
    vitals: { bp: '118/72', temp: '36.4°C', hr: '68 bpm', weight: '62 kg' },
  },
  {
    id: 'ENC-007',
    patientId: 'PAT-004',
    date: '2026-03-28',
    facilityName: 'Hôpital Principal de Dakar',
    doctorName: 'Dr. Aminata Sow',
    type: 'consultation',
    diagnosis: 'Congestive Heart Failure — NYHA Class II',
    notes: 'Echocardiogram shows EF 40%. Started on Enalapril 5mg BD and Furosemide 40mg OD.',
    vitals: { bp: '155/95', temp: '36.9°C', hr: '92 bpm', weight: '85 kg' },
  },
  {
    id: 'ENC-008',
    patientId: 'PAT-005',
    date: '2026-04-15',
    facilityName: 'Muhimbili National Hospital',
    doctorName: 'Dr. Baraka Lema',
    type: 'consultation',
    diagnosis: 'Iron deficiency anaemia',
    notes: 'Hb 9.2 g/dL. Started on Ferrous sulphate 200mg TDS. Diet counselling given.',
    vitals: { bp: '110/70', temp: '36.5°C', hr: '88 bpm', weight: '55 kg' },
  },
];

export const prescriptions: Prescription[] = [
  {
    id: 'RX-001',
    patientId: 'PAT-001',
    encounterId: 'ENC-001',
    date: '2026-04-10',
    doctorName: 'Dr. Wanjiku Njeri',
    medications: [
      { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', duration: '3 months' },
      {
        name: 'Amlodipine',
        dosage: '5mg',
        frequency: 'Once daily',
        duration: '3 months',
        interactions: ['Avoid grapefruit'],
      },
    ],
    status: 'active',
  },
  {
    id: 'RX-002',
    patientId: 'PAT-002',
    encounterId: 'ENC-004',
    date: '2026-04-14',
    doctorName: 'Dr. Kimani Mwangi',
    medications: [
      {
        name: 'Artemether-Lumefantrine',
        dosage: '80/480mg',
        frequency: '6 doses over 3 days',
        duration: '3 days',
      },
      { name: 'Paracetamol', dosage: '1g', frequency: 'Every 6 hours', duration: '3 days' },
    ],
    status: 'active',
  },
  {
    id: 'RX-003',
    patientId: 'PAT-004',
    encounterId: 'ENC-007',
    date: '2026-03-28',
    doctorName: 'Dr. Aminata Sow',
    medications: [
      {
        name: 'Enalapril',
        dosage: '5mg',
        frequency: 'Twice daily',
        duration: '6 months',
        interactions: ['Monitor potassium levels', 'Avoid NSAIDs'],
      },
      {
        name: 'Furosemide',
        dosage: '40mg',
        frequency: 'Once daily',
        duration: '6 months',
        interactions: ['Monitor electrolytes'],
      },
    ],
    status: 'active',
  },
  {
    id: 'RX-004',
    patientId: 'PAT-005',
    encounterId: 'ENC-008',
    date: '2026-04-15',
    doctorName: 'Dr. Baraka Lema',
    medications: [
      {
        name: 'Ferrous Sulphate',
        dosage: '200mg',
        frequency: 'Three times daily',
        duration: '3 months',
      },
      { name: 'Vitamin C', dosage: '250mg', frequency: 'Once daily', duration: '3 months' },
    ],
    status: 'active',
  },
];

export const labResults: LabResult[] = [
  {
    id: 'LAB-001',
    patientId: 'PAT-001',
    date: '2026-04-10',
    testName: 'Fasting Blood Glucose',
    result: '11.2 mmol/L',
    referenceRange: '3.9–5.5 mmol/L',
    status: 'critical',
    labName: 'KNH Lab',
  },
  {
    id: 'LAB-002',
    patientId: 'PAT-001',
    date: '2026-01-18',
    testName: 'HbA1c',
    result: '7.8%',
    referenceRange: '<5.7%',
    status: 'abnormal',
    labName: "Nairobi Women's Lab",
  },
  {
    id: 'LAB-003',
    patientId: 'PAT-001',
    date: '2026-01-18',
    testName: 'Complete Blood Count',
    result: 'WBC 6.8, Hb 13.2, Plt 245',
    referenceRange: 'Normal ranges',
    status: 'normal',
    labName: "Nairobi Women's Lab",
  },
  {
    id: 'LAB-004',
    patientId: 'PAT-002',
    date: '2026-04-14',
    testName: 'Malaria RDT (P. falciparum)',
    result: 'Positive',
    referenceRange: 'Negative',
    status: 'critical',
    labName: 'MTH Lab',
  },
  {
    id: 'LAB-005',
    patientId: 'PAT-002',
    date: '2026-02-20',
    testName: 'Serum Creatinine',
    result: '1.4 mg/dL',
    referenceRange: '0.7–1.2 mg/dL',
    status: 'abnormal',
    labName: 'MTH Lab',
  },
  {
    id: 'LAB-006',
    patientId: 'PAT-002',
    date: '2026-02-20',
    testName: 'eGFR',
    result: '72 mL/min',
    referenceRange: '>90 mL/min',
    status: 'abnormal',
    labName: 'MTH Lab',
  },
  {
    id: 'LAB-007',
    patientId: 'PAT-005',
    date: '2026-04-15',
    testName: 'Haemoglobin',
    result: '9.2 g/dL',
    referenceRange: '12.0–15.5 g/dL',
    status: 'abnormal',
    labName: 'MNH Lab',
  },
  {
    id: 'LAB-008',
    patientId: 'PAT-005',
    date: '2026-04-15',
    testName: 'Serum Ferritin',
    result: '8 ng/mL',
    referenceRange: '20–200 ng/mL',
    status: 'critical',
    labName: 'MNH Lab',
  },
];

export const vaccinations: Vaccination[] = [
  {
    id: 'VAX-001',
    patientId: 'PAT-001',
    date: '2025-09-12',
    vaccine: 'Influenza',
    dose: 'Annual',
    batchNumber: 'FLU-2025-A',
    site: 'Left deltoid',
    nextDue: '2026-09-12',
  },
  {
    id: 'VAX-002',
    patientId: 'PAT-001',
    date: '2024-03-10',
    vaccine: 'COVID-19 (Pfizer)',
    dose: '3rd dose',
    batchNumber: 'PFE-2024-K',
    site: 'Right deltoid',
  },
  {
    id: 'VAX-003',
    patientId: 'PAT-003',
    date: '2026-04-08',
    vaccine: 'COVID-19 Bivalent Booster',
    dose: '4th dose',
    batchNumber: 'PFE-2026-B',
    site: 'Left deltoid',
  },
  {
    id: 'VAX-004',
    patientId: 'PAT-005',
    date: '2025-06-20',
    vaccine: 'Tetanus Toxoid',
    dose: '2nd dose',
    batchNumber: 'TT-2025-C',
    site: 'Right deltoid',
    nextDue: '2026-06-20',
  },
  {
    id: 'VAX-005',
    patientId: 'PAT-005',
    date: '2025-01-15',
    vaccine: 'HPV (Gardasil 9)',
    dose: '1st dose',
    batchNumber: 'HPV-2025-A',
    site: 'Left deltoid',
    nextDue: '2025-07-15',
  },
];

export const appointments: Appointment[] = [
  {
    id: 'APT-001',
    patientId: 'PAT-001',
    date: '2026-04-18',
    time: '09:00',
    doctorName: 'Dr. Wanjiku Njeri',
    facilityName: 'Kenyatta National Hospital',
    type: 'Follow-up — Diabetes',
    status: 'scheduled',
    estimatedWait: 15,
  },
  {
    id: 'APT-002',
    patientId: 'PAT-001',
    date: '2026-05-10',
    time: '14:00',
    doctorName: 'Dr. Otieno Odhiambo',
    facilityName: "Nairobi Women's Hospital",
    type: 'Lab work — HbA1c',
    status: 'scheduled',
    estimatedWait: 30,
  },
  {
    id: 'APT-003',
    patientId: 'PAT-002',
    date: '2026-04-21',
    time: '10:30',
    doctorName: 'Dr. Kimani Mwangi',
    facilityName: 'Moi Teaching Hospital',
    type: 'Follow-up — Malaria recovery',
    status: 'scheduled',
    estimatedWait: 20,
  },
  {
    id: 'APT-004',
    patientId: 'PAT-004',
    date: '2026-04-25',
    time: '11:00',
    doctorName: 'Dr. Aminata Sow',
    facilityName: 'Hôpital Principal de Dakar',
    type: 'Cardiology follow-up',
    status: 'scheduled',
    estimatedWait: 45,
  },
  {
    id: 'APT-005',
    patientId: 'PAT-005',
    date: '2026-04-22',
    time: '08:30',
    doctorName: 'Dr. Baraka Lema',
    facilityName: 'Muhimbili National Hospital',
    type: 'Follow-up — Anaemia',
    status: 'scheduled',
    estimatedWait: 10,
  },
  {
    id: 'APT-006',
    patientId: 'PAT-001',
    date: '2026-03-05',
    time: '09:00',
    doctorName: 'Dr. Wanjiku Njeri',
    facilityName: 'Kenyatta National Hospital',
    type: 'Follow-up — Hypertension',
    status: 'completed',
  },
  {
    id: 'APT-007',
    patientId: 'PAT-003',
    date: '2026-04-17',
    time: '15:00',
    doctorName: 'Dr. Adebayo Ogundimu',
    facilityName: 'Lagos University Teaching Hospital',
    type: 'General check-up',
    status: 'scheduled',
    estimatedWait: 25,
  },
];

export const auditLog: AuditEntry[] = [
  {
    id: 'AUD-001',
    patientId: 'PAT-001',
    accessedBy: 'Dr. Wanjiku Njeri',
    role: 'Doctor',
    action: 'Viewed full record',
    section: 'All',
    timestamp: '2026-04-10T09:15:00Z',
    facility: 'Kenyatta National Hospital',
  },
  {
    id: 'AUD-002',
    patientId: 'PAT-001',
    accessedBy: 'Lab Tech — Mary Achieng',
    role: 'Lab Technician',
    action: 'Uploaded lab results',
    section: 'Lab Results',
    timestamp: '2026-04-10T11:30:00Z',
    facility: 'KNH Lab',
  },
  {
    id: 'AUD-003',
    patientId: 'PAT-001',
    accessedBy: 'Dr. Otieno Odhiambo',
    role: 'Doctor',
    action: 'Viewed lab results',
    section: 'Lab Results',
    timestamp: '2026-01-18T14:20:00Z',
    facility: "Nairobi Women's Hospital",
  },
  {
    id: 'AUD-004',
    patientId: 'PAT-001',
    accessedBy: 'Pharmacist — John Kiptoo',
    role: 'Pharmacist',
    action: 'Viewed prescriptions',
    section: 'Prescriptions',
    timestamp: '2026-04-10T10:00:00Z',
    facility: 'KNH Pharmacy',
  },
  {
    id: 'AUD-005',
    patientId: 'PAT-002',
    accessedBy: 'Dr. Kimani Mwangi',
    role: 'Doctor',
    action: 'Viewed full record',
    section: 'All',
    timestamp: '2026-04-14T08:00:00Z',
    facility: 'Moi Teaching Hospital',
  },
];

export const consentRecords: ConsentRecord[] = [
  {
    id: 'CON-001',
    patientId: 'PAT-001',
    providerName: 'Dr. Wanjiku Njeri',
    facilityName: 'Kenyatta National Hospital',
    sections: ['All'],
    granted: true,
    grantedDate: '2025-01-10',
  },
  {
    id: 'CON-002',
    patientId: 'PAT-001',
    providerName: 'Dr. Otieno Odhiambo',
    facilityName: "Nairobi Women's Hospital",
    sections: ['Lab Results', 'Prescriptions'],
    granted: true,
    grantedDate: '2025-06-15',
  },
  {
    id: 'CON-003',
    patientId: 'PAT-001',
    providerName: 'Pharmacy — MedPlus',
    facilityName: 'MedPlus Pharmacy',
    sections: ['Prescriptions'],
    granted: false,
    grantedDate: '2026-02-01',
  },
];

export const doctors: Doctor[] = [
  {
    id: 'DOC-001',
    name: 'Dr. Wanjiku Njeri',
    specialty: 'Internal Medicine',
    facilityId: 'FAC-001',
  },
  {
    id: 'DOC-002',
    name: 'Dr. Kimani Mwangi',
    specialty: 'General Medicine',
    facilityId: 'FAC-002',
  },
  { id: 'DOC-003', name: 'Dr. Otieno Odhiambo', specialty: 'Pathology', facilityId: 'FAC-003' },
  {
    id: 'DOC-004',
    name: 'Dr. Adebayo Ogundimu',
    specialty: 'Infectious Disease',
    facilityId: 'FAC-004',
  },
  { id: 'DOC-005', name: 'Dr. Aminata Sow', specialty: 'Cardiology', facilityId: 'FAC-005' },
  { id: 'DOC-006', name: 'Dr. Baraka Lema', specialty: 'Haematology', facilityId: 'FAC-006' },
];

export const facilities: Facility[] = [
  {
    id: 'FAC-001',
    name: 'Kenyatta National Hospital',
    level: 'Level 6 — National Referral',
    location: 'Nairobi, Kenya',
    beds: 1800,
    bedsOccupied: 1620,
  },
  {
    id: 'FAC-002',
    name: 'Moi Teaching Hospital',
    level: 'Level 6 — Teaching Hospital',
    location: 'Eldoret, Kenya',
    beds: 800,
    bedsOccupied: 680,
  },
  {
    id: 'FAC-003',
    name: "Nairobi Women's Hospital",
    level: 'Level 5 — County Referral',
    location: 'Nairobi, Kenya',
    beds: 200,
    bedsOccupied: 155,
  },
  {
    id: 'FAC-004',
    name: 'Lagos University Teaching Hospital',
    level: 'Level 6 — Federal Teaching',
    location: 'Lagos, Nigeria',
    beds: 761,
    bedsOccupied: 700,
  },
  {
    id: 'FAC-005',
    name: 'Hôpital Principal de Dakar',
    level: 'Level 6 — National',
    location: 'Dakar, Sénégal',
    beds: 500,
    bedsOccupied: 420,
  },
  {
    id: 'FAC-006',
    name: 'Muhimbili National Hospital',
    level: 'Level 6 — National Referral',
    location: 'Dar es Salaam, Tanzania',
    beds: 1500,
    bedsOccupied: 1280,
  },
];

export const referrals: Referral[] = [
  {
    id: 'REF-001',
    patientId: 'PAT-002',
    fromDoctor: 'Dr. Kimani Mwangi',
    fromFacility: 'Moi Teaching Hospital',
    toDoctor: 'Dr. Wanjiku Njeri',
    toFacility: 'Kenyatta National Hospital',
    reason: 'CKD Stage 2 — nephrology evaluation',
    urgency: 'routine',
    status: 'pending',
    date: '2026-02-20',
  },
  {
    id: 'REF-002',
    patientId: 'PAT-004',
    fromDoctor: 'Dr. Aminata Sow',
    fromFacility: 'Hôpital Principal de Dakar',
    toDoctor: 'Cardiac Surgery Team',
    toFacility: 'Hôpital Principal de Dakar',
    reason: 'CHF evaluation for possible intervention',
    urgency: 'urgent',
    status: 'accepted',
    date: '2026-03-28',
  },
];

export const inventory: InventoryItem[] = [
  {
    id: 'INV-001',
    name: 'Metformin 500mg',
    category: 'Oral Hypoglycaemics',
    quantity: 2400,
    reorderLevel: 500,
    unit: 'tablets',
    linkedPrescriptions: 12,
  },
  {
    id: 'INV-002',
    name: 'Amlodipine 5mg',
    category: 'Antihypertensives',
    quantity: 180,
    reorderLevel: 200,
    unit: 'tablets',
    linkedPrescriptions: 8,
  },
  {
    id: 'INV-003',
    name: 'Artemether-Lumefantrine',
    category: 'Antimalarials',
    quantity: 45,
    reorderLevel: 100,
    unit: 'courses',
    linkedPrescriptions: 15,
  },
  {
    id: 'INV-004',
    name: 'Enalapril 5mg',
    category: 'ACE Inhibitors',
    quantity: 800,
    reorderLevel: 200,
    unit: 'tablets',
    linkedPrescriptions: 6,
  },
  {
    id: 'INV-005',
    name: 'Furosemide 40mg',
    category: 'Diuretics',
    quantity: 1200,
    reorderLevel: 300,
    unit: 'tablets',
    linkedPrescriptions: 5,
  },
  {
    id: 'INV-006',
    name: 'Ferrous Sulphate 200mg',
    category: 'Haematinics',
    quantity: 90,
    reorderLevel: 150,
    unit: 'tablets',
    linkedPrescriptions: 10,
  },
  {
    id: 'INV-007',
    name: 'Paracetamol 1g',
    category: 'Analgesics',
    quantity: 5000,
    reorderLevel: 1000,
    unit: 'tablets',
    linkedPrescriptions: 25,
  },
  {
    id: 'INV-008',
    name: 'Amoxicillin 500mg',
    category: 'Antibiotics',
    quantity: 320,
    reorderLevel: 400,
    unit: 'capsules',
    linkedPrescriptions: 18,
  },
];

// Daily stats for admin dashboard
export const dailyStats = {
  patientsToday: 147,
  appointmentsToday: 62,
  emergencies: 8,
  admissions: 12,
  discharges: 9,
  topDiagnoses: [
    { name: 'Malaria', count: 28 },
    { name: 'Hypertension', count: 22 },
    { name: 'Type 2 Diabetes', count: 18 },
    { name: 'Upper RTI', count: 15 },
    { name: 'Anaemia', count: 12 },
    { name: 'UTI', count: 10 },
    { name: 'Pneumonia', count: 8 },
    { name: 'Gastritis', count: 7 },
  ],
  weeklyTrend: [
    { day: 'Mon', patients: 132 },
    { day: 'Tue', patients: 148 },
    { day: 'Wed', patients: 155 },
    { day: 'Thu', patients: 141 },
    { day: 'Fri', patients: 147 },
    { day: 'Sat', patients: 89 },
    { day: 'Sun', patients: 62 },
  ],
};
