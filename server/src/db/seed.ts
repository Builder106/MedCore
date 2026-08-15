import { eq } from 'drizzle-orm';
import { env } from '../lib/env.js';
import { hashPin } from '../lib/pin.js';
import { getDb, schema } from './index.js';

type DemoDb = Awaited<ReturnType<typeof getDb>>['db'];

function shouldSyncDemoIdentityUsers() {
  if (process.env.NODE_ENV === 'test') return true;
  if (process.env.NODE_ENV !== 'production') return true;
  return process.env.MEDCORE_SYNC_DEMO_USERS === '1';
}

export async function syncDemoIdentityUsers(db: DemoDb, now: number) {
  if (!shouldSyncDemoIdentityUsers()) return;

  const defs = [
    {
      id: 'DOC-001',
      name: 'Dr. Wanjiku Njeri',
      role: 'doctor' as const,
      phone: env.DEMO_DOCTOR_PHONE ?? '+254700000001',
      pin: env.DEMO_DOCTOR_PIN,
    },
    {
      id: 'PAT-001',
      name: 'Amina Okafor',
      role: 'patient' as const,
      phone: env.DEMO_PATIENT_PHONE ?? '+254700000002',
      pin: env.DEMO_PATIENT_PIN,
    },
    {
      id: 'ADM-001',
      name: 'Facility Admin',
      role: 'admin' as const,
      phone: env.DEMO_ADMIN_PHONE ?? '+254700000003',
      pin: env.DEMO_ADMIN_PIN,
    },
  ];

  for (const u of defs) {
    const h = hashPin(u.pin);
    const [row] = await db.select().from(schema.users).where(eq(schema.users.id, u.id));
    if (row) {
      await db
        .update(schema.users)
        .set({
          name: u.name,
          role: u.role,
          phone: u.phone,
          pinHash: h,
          pinRotatedAt: now,
          failedAttempts: 0,
          lockedUntil: null,
        })
        .where(eq(schema.users.id, u.id))
        .run();
    } else {
      await db
        .insert(schema.users)
        .values({
          id: u.id,
          name: u.name,
          role: u.role,
          phone: u.phone,
          pinHash: h,
          pinRotatedAt: now,
          failedAttempts: 0,
          lockedUntil: null,
          createdAt: now,
        })
        .run();
    }
  }
}

export async function seedDemoData() {
  const { db } = await getDb();
  const now = Date.now();
  await syncDemoIdentityUsers(db, now);

  const [patientRow] = await db
    .select()
    .from(schema.patients)
    .where(eq(schema.patients.id, 'PAT-001'));
  if (patientRow) return;

  await db
    .insert(schema.patients)
    .values({
      id: 'PAT-001',
      firstName: 'Amina',
      lastName: 'Okafor',
      dob: '1987-03-12',
      phone: env.DEMO_PATIENT_PHONE ?? '+254700000002',
      nationalId: 'KE-887412',
      bloodType: 'O+',
      allergies: JSON.stringify(['Penicillin']),
      insuranceScheme: 'NHIF Kenya',
      createdAt: now,
    })
    .run();

  await db
    .insert(schema.prescriptions)
    .values([
      {
        id: 'RX-001',
        patientId: 'PAT-001',
        doctorId: 'DOC-001',
        drugName: 'Metformin',
        dosage: '500mg',
        frequency: 'Twice daily',
        duration: '3 months',
        status: 'active',
        createdAt: now - 1000 * 60 * 60 * 24 * 30,
      },
      {
        id: 'RX-002',
        patientId: 'PAT-001',
        doctorId: 'DOC-001',
        drugName: 'Amlodipine',
        dosage: '5mg',
        frequency: 'Once daily',
        duration: '3 months',
        status: 'active',
        createdAt: now - 1000 * 60 * 60 * 24 * 60,
      },
    ])
    .run();

  const today = new Date();
  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const d = new Date(today);
    d.setDate(today.getDate() - dayOffset);
    const iso = d.toISOString().slice(0, 10);
    let status: 'taken' | 'skipped' | 'missed' | 'unknown' = 'taken';
    if (dayOffset >= 17 && dayOffset <= 19) status = 'missed';
    if (dayOffset === 5) status = 'unknown';
    await db
      .insert(schema.adherenceEvents)
      .values({
        id: `ADH-${iso}-RX-001`,
        prescriptionId: 'RX-001',
        patientId: 'PAT-001',
        doseDate: iso,
        status,
        recordedAt: d.getTime(),
      })
      .onConflictDoNothing()
      .run();
  }

  const day = 1000 * 60 * 60 * 24;
  await db
    .insert(schema.appointments)
    .values([
      {
        id: 'APT-001',
        patientId: 'PAT-001',
        doctorId: 'DOC-001',
        scheduledFor: now + day * 2,
        durationMin: 20,
        reason: 'Routine follow-up for hypertension',
        status: 'scheduled',
        createdAt: now,
      },
      {
        id: 'APT-002',
        patientId: 'PAT-001',
        doctorId: 'DOC-001',
        scheduledFor: now - day * 30,
        durationMin: 30,
        reason: 'Initial diabetes assessment',
        status: 'completed',
        notes: 'Started on Metformin 500mg BD.',
        createdAt: now - day * 30,
      },
    ])
    .onConflictDoNothing()
    .run();

  await db
    .insert(schema.encounters)
    .values([
      {
        id: 'ENC-001',
        patientId: 'PAT-001',
        doctorId: 'DOC-001',
        encounterDate: now - day * 30,
        type: 'consultation',
        chiefComplaint: 'Fatigue and increased thirst',
        diagnosis: 'Type 2 diabetes mellitus (newly diagnosed)',
        notes: 'HbA1c 8.2. Started Metformin. Diet and exercise counselling given.',
        createdAt: now - day * 30,
      },
      {
        id: 'ENC-002',
        patientId: 'PAT-001',
        doctorId: 'DOC-001',
        encounterDate: now - day * 60,
        type: 'consultation',
        chiefComplaint: 'Headache and elevated BP readings',
        diagnosis: 'Essential hypertension',
        notes: 'BP 152/94. Started Amlodipine 5mg daily.',
        createdAt: now - day * 60,
      },
    ])
    .onConflictDoNothing()
    .run();

  await db
    .insert(schema.labResults)
    .values([
      {
        id: 'LAB-001',
        patientId: 'PAT-001',
        doctorId: 'DOC-001',
        testName: 'HbA1c',
        value: '7.4',
        unit: '%',
        referenceRange: '<6.5',
        status: 'high',
        collectedAt: now - day * 14,
        reviewedByDoctor: 1,
        plainEnglish: 'Your blood sugar is higher than target. We will review medication dose.',
        createdAt: now - day * 14,
      },
      {
        id: 'LAB-002',
        patientId: 'PAT-001',
        doctorId: 'DOC-001',
        testName: 'Fasting glucose',
        value: '142',
        unit: 'mg/dL',
        referenceRange: '70-100',
        status: 'high',
        collectedAt: now - day * 14,
        reviewedByDoctor: 1,
        createdAt: now - day * 14,
      },
      {
        id: 'LAB-003',
        patientId: 'PAT-001',
        doctorId: 'DOC-001',
        testName: 'Creatinine',
        value: '0.9',
        unit: 'mg/dL',
        referenceRange: '0.6-1.2',
        status: 'normal',
        collectedAt: now - day * 14,
        reviewedByDoctor: 1,
        createdAt: now - day * 14,
      },
      {
        id: 'LAB-004',
        patientId: 'PAT-001',
        testName: 'Total cholesterol',
        value: '215',
        unit: 'mg/dL',
        referenceRange: '<200',
        status: 'high',
        collectedAt: now - day * 3,
        reviewedByDoctor: 0,
        createdAt: now - day * 3,
      },
    ])
    .onConflictDoNothing()
    .run();

  await db
    .insert(schema.vaccinations)
    .values([
      {
        id: 'VAC-001',
        patientId: 'PAT-001',
        vaccineName: 'Tetanus (Td)',
        doseNumber: 1,
        batch: 'TD-2024-A12',
        site: 'Left deltoid',
        administeredAt: now - day * 365,
        nextDueAt: now + day * 365 * 9,
        administeredBy: 'DOC-001',
        createdAt: now - day * 365,
      },
      {
        id: 'VAC-002',
        patientId: 'PAT-001',
        vaccineName: 'Influenza',
        doseNumber: 1,
        batch: 'FLU-2024-B07',
        site: 'Right deltoid',
        administeredAt: now - day * 400,
        nextDueAt: now - day * 35,
        administeredBy: 'DOC-001',
        createdAt: now - day * 400,
      },
      {
        id: 'VAC-003',
        patientId: 'PAT-001',
        vaccineName: 'Hepatitis B',
        doseNumber: 3,
        batch: 'HBV-2023-C21',
        site: 'Left deltoid',
        administeredAt: now - day * 540,
        administeredBy: 'DOC-001',
        createdAt: now - day * 540,
      },
    ])
    .onConflictDoNothing()
    .run();

  await db
    .insert(schema.referrals)
    .values([
      {
        id: 'REF-001',
        patientId: 'PAT-001',
        fromDoctorId: 'DOC-001',
        toFacility: 'Kenyatta National Hospital — Endocrinology',
        specialty: 'Endocrinology',
        urgency: 'routine',
        reason: 'Poorly controlled type 2 diabetes — specialist review for insulin initiation.',
        status: 'pending',
        createdAt: now - day * 7,
      },
    ])
    .onConflictDoNothing()
    .run();

  await db
    .insert(schema.staff)
    .values([
      {
        id: 'STF-001',
        name: 'Dr. Wanjiku Njeri',
        role: 'Physician',
        specialty: 'Family medicine',
        email: 'wanjiku@medcore.local',
        phone: env.DEMO_DOCTOR_PHONE ?? '+254700000001',
        status: 'active',
        facilityId: 'FAC-001',
        createdAt: now,
      },
      {
        id: 'STF-002',
        name: 'Nurse Grace Kamau',
        role: 'Registered Nurse',
        email: 'grace@medcore.local',
        phone: '+254700000010',
        status: 'active',
        facilityId: 'FAC-001',
        createdAt: now,
      },
      {
        id: 'STF-003',
        name: 'Dr. Samuel Otieno',
        role: 'Physician',
        specialty: 'Internal medicine',
        email: 'samuel@medcore.local',
        phone: '+254700000011',
        status: 'on_leave',
        facilityId: 'FAC-001',
        createdAt: now,
      },
    ])
    .onConflictDoNothing()
    .run();

  await db
    .insert(schema.inventory)
    .values([
      {
        id: 'INV-001',
        itemName: 'Metformin 500mg',
        category: 'Medication',
        sku: 'MED-MET-500',
        quantity: 240,
        reorderLevel: 50,
        unit: 'tablets',
        location: 'Pharmacy shelf A',
        updatedAt: now,
        createdAt: now,
      },
      {
        id: 'INV-002',
        itemName: 'Amlodipine 5mg',
        category: 'Medication',
        sku: 'MED-AML-5',
        quantity: 32,
        reorderLevel: 50,
        unit: 'tablets',
        location: 'Pharmacy shelf A',
        updatedAt: now,
        createdAt: now,
      },
      {
        id: 'INV-003',
        itemName: 'Glucose test strips',
        category: 'Supply',
        sku: 'SUP-GLU-100',
        quantity: 8,
        reorderLevel: 20,
        unit: 'boxes',
        location: 'Lab',
        updatedAt: now,
        createdAt: now,
      },
      {
        id: 'INV-004',
        itemName: 'Blood pressure cuff (adult)',
        category: 'Equipment',
        sku: 'EQP-BPC-A',
        quantity: 6,
        reorderLevel: 2,
        unit: 'each',
        location: 'Exam rooms',
        updatedAt: now,
        createdAt: now,
      },
      {
        id: 'INV-005',
        itemName: 'Disposable syringes 5ml',
        category: 'Supply',
        sku: 'SUP-SYR-5',
        quantity: 600,
        reorderLevel: 100,
        unit: 'each',
        location: 'Supply room',
        updatedAt: now,
        createdAt: now,
      },
    ])
    .onConflictDoNothing()
    .run();

  await db
    .insert(schema.consentGrants)
    .values([
      {
        id: 'CNT-001',
        patientId: 'PAT-001',
        grantedTo: 'DOC-001',
        grantedToType: 'doctor',
        sections: JSON.stringify(['medications', 'labs', 'encounters', 'vaccinations']),
        status: 'active',
        grantedAt: now - day * 90,
      },
    ])
    .onConflictDoNothing()
    .run();
}
