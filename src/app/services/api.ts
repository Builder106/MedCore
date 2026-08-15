const base = '/api';

export async function apiFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(data?.error || `API ${res.status}`) as Error & {
      status?: number;
      payload?: unknown;
    };
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data as T;
}

export interface InteractionResult {
  level: 'critical' | 'warning' | 'info' | 'none';
  drugA: string;
  drugB: string;
  message: string;
  source: 'openfda' | 'rxnorm' | 'fallback' | 'none';
}

export async function checkInteraction(drug1: string, drug2: string) {
  return apiFetch<InteractionResult>(
    `/interactions?drug1=${encodeURIComponent(drug1)}&drug2=${encodeURIComponent(drug2)}`
  );
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  drugName: string;
  dosage: string;
  frequency: string;
  duration?: string | null;
  status: 'active' | 'completed' | 'discontinued';
  createdAt: number;
}

export async function listPrescriptions(patientId: string) {
  return apiFetch<{ prescriptions: Prescription[] }>(`/patients/${patientId}/prescriptions`);
}

export async function createPrescription(body: {
  patientId: string;
  doctorId: string;
  drugName: string;
  dosage: string;
  frequency: string;
  duration?: string;
  notes?: string;
  acknowledgedInteractions?: { drugB: string; level: 'critical' | 'warning' | 'info' }[];
  pin?: string;
}) {
  return apiFetch<{ id: string; interactions: InteractionResult[] }>(`/prescriptions`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export interface InteractionEvent {
  id: string;
  patientId: string;
  doctorId: string;
  drugA: string;
  drugB: string;
  level: 'critical' | 'warning' | 'info';
  message: string;
  source: string;
  overridden: number;
  overrideReason?: string | null;
  createdAt: number;
}

export async function listInteractionEvents(patientId: string) {
  return apiFetch<{ events: InteractionEvent[] }>(`/patients/${patientId}/interactions`);
}

export interface SmsMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  fromNumber: string;
  toNumber: string;
  body: string;
  command?: string | null;
  patientId?: string | null;
  doctorId?: string | null;
  responseSnippet?: string | null;
  status: 'received' | 'replied' | 'failed' | 'pin_invalid' | 'locked';
  createdAt: number;
}

export async function listSmsMessages(
  params: { doctorId?: string; patientId?: string; type?: string } = {}
) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) qs.set(k, v);
  });
  return apiFetch<{
    messages: SmsMessage[];
    mockOutbox: { to: string; body: string; at: number }[];
  }>(`/sms/messages${qs.size ? `?${qs}` : ''}`);
}

export async function simulateInboundSms(from: string, text: string) {
  return apiFetch<{ ok: boolean; reply?: string; error?: string }>('/sms/inbound', {
    method: 'POST',
    body: JSON.stringify({ from, text }),
  });
}

export interface AdherenceResponse {
  ratePct: number;
  streakDays: number;
  total: number;
  events: { doseDate: string; status: 'taken' | 'skipped' | 'missed' | 'unknown' }[];
}

export async function getAdherence(patientId: string) {
  return apiFetch<AdherenceResponse>(`/patients/${patientId}/adherence`);
}

export async function getReminders(patientId: string) {
  return apiFetch<{
    reminders: {
      id: string;
      scheduledTime: number;
      status: string;
      channel: string;
      prescriptionId: string;
    }[];
  }>(`/patients/${patientId}/reminders`);
}

export async function dispatchNow(patientId: string) {
  return apiFetch<{ ok: boolean; sent: number }>('/reminders/dispatch-now', {
    method: 'POST',
    body: JSON.stringify({ patientId }),
  });
}

export async function respondToReminder(id: string, response: 'TAKEN' | 'SKIP') {
  return apiFetch<{ ok: boolean }>(`/reminders/${id}/respond`, {
    method: 'POST',
    body: JSON.stringify({ response }),
  });
}

export async function createReminderSchedule(body: {
  prescriptionId: string;
  patientId: string;
  times: string[];
  startDate: string;
  endDate: string;
  channel: 'sms' | 'push';
}) {
  return apiFetch<{ created: number }>('/reminders', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getVapidKey() {
  return apiFetch<{ publicKey: string | null }>('/push/vapid');
}

export async function subscribePush(body: {
  userId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  return apiFetch<{ ok: boolean }>('/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function transcribe(
  audio: Blob,
  params: {
    patientId: string;
    doctorId?: string;
    source?: 'doctor_consult' | 'patient_message';
    durationSec?: number;
  }
) {
  const fd = new FormData();
  fd.append('audio', audio, 'consult.webm');
  fd.append('patientId', params.patientId);
  if (params.doctorId) fd.append('doctorId', params.doctorId);
  fd.append('source', params.source ?? 'doctor_consult');
  if (params.durationSec != null) fd.append('durationSec', String(params.durationSec));
  const res = await fetch(`${base}/transcribe`, {
    method: 'POST',
    body: fd,
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`transcribe ${res.status}`);
  return (await res.json()) as {
    id: string;
    transcript: string;
    provider: 'openai' | 'mock';
    audioExpiresAt: number;
  };
}

export async function listVoiceRecordings(patientId: string) {
  return apiFetch<{
    recordings: {
      id: string;
      transcript: string;
      createdAt: number;
      audioPath: string | null;
      source: string;
      durationSec?: number | null;
    }[];
  }>(`/patients/${patientId}/voice`);
}

export async function saveConsultationNote(body: {
  patientId: string;
  doctorId: string;
  recordingId?: string;
  transcript?: string;
  chiefComplaint?: string;
  history?: string;
  assessment?: string;
  plan?: string;
  followUp?: string;
}) {
  return apiFetch<{ id: string }>('/consultation-notes', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function createVideoSession(body: {
  patientId: string;
  doctorId: string;
  reason?: string;
}) {
  return apiFetch<{ id: string; room: { url: string; name: string; provider: 'daily' | 'mock' } }>(
    '/video/sessions',
    { method: 'POST', body: JSON.stringify(body) }
  );
}

export async function startVideoSession(id: string) {
  return apiFetch<{ ok: boolean }>(`/video/sessions/${id}/start`, { method: 'POST' });
}

export async function endVideoSession(id: string, notes?: string) {
  return apiFetch<{ ok: boolean; durationSec: number }>(`/video/sessions/${id}/end`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  phone: string;
  nationalId: string;
  bloodType?: string | null;
  allergies: string[];
  insuranceScheme?: string | null;
  createdAt: number;
}

export async function listPatients() {
  return apiFetch<{ patients: Patient[] }>('/patients');
}

export async function getPatient(id: string) {
  return apiFetch<{ patient: Patient }>(`/patients/${id}`);
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  facilityId?: string | null;
  scheduledFor: number;
  durationMin: number;
  reason?: string | null;
  status: 'scheduled' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';
  notes?: string | null;
  createdAt: number;
}

export async function listAppointments(
  params: { doctorId?: string; patientId?: string; from?: number } = {}
) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null) qs.set(k, String(v));
  });
  return apiFetch<{ appointments: Appointment[] }>(`/appointments${qs.size ? `?${qs}` : ''}`);
}

export async function listPatientAppointments(patientId: string) {
  return apiFetch<{ appointments: Appointment[] }>(`/patients/${patientId}/appointments`);
}

export async function createAppointment(body: {
  patientId: string;
  doctorId: string;
  scheduledFor: number;
  durationMin?: number;
  reason?: string;
  notes?: string;
  facilityId?: string;
}) {
  return apiFetch<{ id: string }>('/appointments', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateAppointment(
  id: string,
  patch: Partial<{ status: Appointment['status']; notes: string; scheduledFor: number }>
) {
  return apiFetch<{ ok: boolean }>(`/appointments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export interface LabResult {
  id: string;
  patientId: string;
  doctorId?: string | null;
  testName: string;
  value: string;
  unit?: string | null;
  referenceRange?: string | null;
  status: 'normal' | 'high' | 'low' | 'critical';
  collectedAt: number;
  reviewedByDoctor: number;
  plainEnglish?: string | null;
  createdAt: number;
}

export async function listLabs(patientId: string) {
  return apiFetch<{ labs: LabResult[] }>(`/patients/${patientId}/labs`);
}

export async function createLabResult(body: {
  patientId: string;
  doctorId?: string;
  testName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  status?: 'normal' | 'high' | 'low' | 'critical';
  collectedAt: number;
  plainEnglish?: string;
}) {
  return apiFetch<{ id: string }>('/labs', { method: 'POST', body: JSON.stringify(body) });
}

export async function reviewLab(id: string) {
  return apiFetch<{ ok: boolean }>(`/labs/${id}/review`, { method: 'PATCH' });
}

export interface Vaccination {
  id: string;
  patientId: string;
  vaccineName: string;
  doseNumber: number;
  batch?: string | null;
  site?: string | null;
  administeredAt: number;
  nextDueAt?: number | null;
  administeredBy?: string | null;
  createdAt: number;
}

export async function listVaccinations(patientId: string) {
  return apiFetch<{ vaccinations: Vaccination[] }>(`/patients/${patientId}/vaccinations`);
}

export async function createVaccination(body: {
  patientId: string;
  vaccineName: string;
  doseNumber?: number;
  batch?: string;
  site?: string;
  administeredAt: number;
  nextDueAt?: number;
  administeredBy?: string;
}) {
  return apiFetch<{ id: string }>('/vaccinations', { method: 'POST', body: JSON.stringify(body) });
}

export interface Referral {
  id: string;
  patientId: string;
  fromDoctorId: string;
  toDoctorId?: string | null;
  toFacility?: string | null;
  specialty?: string | null;
  urgency: 'routine' | 'urgent' | 'emergency';
  reason: string;
  status: 'pending' | 'accepted' | 'completed' | 'declined';
  createdAt: number;
  respondedAt?: number | null;
}

export async function listReferrals(params: { patientId?: string; doctorId?: string } = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) qs.set(k, v);
  });
  return apiFetch<{ referrals: Referral[] }>(`/referrals${qs.size ? `?${qs}` : ''}`);
}

export async function createReferral(body: {
  patientId: string;
  fromDoctorId: string;
  toDoctorId?: string;
  toFacility?: string;
  specialty?: string;
  urgency?: 'routine' | 'urgent' | 'emergency';
  reason: string;
}) {
  return apiFetch<{ id: string }>('/referrals', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateReferralStatus(
  id: string,
  status: 'accepted' | 'completed' | 'declined'
) {
  return apiFetch<{ ok: boolean }>(`/referrals/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export interface ConsentGrant {
  id: string;
  patientId: string;
  grantedTo: string;
  grantedToType: 'doctor' | 'facility';
  sections: string[];
  status: 'active' | 'revoked';
  grantedAt: number;
  revokedAt?: number | null;
  expiresAt?: number | null;
}

export async function listConsent(params: { patientId?: string; grantedTo?: string } = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) qs.set(k, v);
  });
  return apiFetch<{ grants: ConsentGrant[] }>(`/consent${qs.size ? `?${qs}` : ''}`);
}

export async function createConsent(body: {
  patientId: string;
  grantedTo: string;
  grantedToType?: 'doctor' | 'facility';
  sections: string[];
  expiresAt?: number;
}) {
  return apiFetch<{ id: string }>('/consent', { method: 'POST', body: JSON.stringify(body) });
}

export async function revokeConsent(id: string) {
  return apiFetch<{ ok: boolean }>(`/consent/${id}`, { method: 'DELETE' });
}

export interface AuditEntry {
  id: string;
  userId?: string | null;
  role?: string | null;
  patientId?: string | null;
  action: string;
  path: string;
  method: string;
  status: number;
  durationMs: number;
  ip?: string | null;
  createdAt: number;
}

export async function listAudit(
  params: { patientId?: string; userId?: string; from?: number; to?: number; limit?: number } = {}
) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null) qs.set(k, String(v));
  });
  return apiFetch<{ entries: AuditEntry[] }>(`/audit${qs.size ? `?${qs}` : ''}`);
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  specialty?: string | null;
  email?: string | null;
  phone?: string | null;
  status: 'active' | 'on_leave' | 'inactive';
  facilityId?: string | null;
  createdAt: number;
}

export async function listStaff() {
  return apiFetch<{ staff: StaffMember[] }>('/staff');
}

export interface InventoryItem {
  id: string;
  itemName: string;
  category?: string | null;
  sku?: string | null;
  quantity: number;
  reorderLevel: number;
  unit?: string | null;
  location?: string | null;
  expiresAt?: number | null;
  updatedAt: number;
  createdAt: number;
}

export async function listInventory() {
  return apiFetch<{ items: InventoryItem[]; lowStockCount: number }>('/inventory');
}

export async function updateInventory(
  id: string,
  patch: Partial<{ quantity: number; reorderLevel: number; location: string; expiresAt: number }>
) {
  return apiFetch<{ ok: boolean }>(`/inventory/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export interface Encounter {
  id: string;
  patientId: string;
  doctorId: string;
  encounterDate: number;
  type: 'consultation' | 'follow_up' | 'emergency' | 'telemedicine';
  chiefComplaint?: string | null;
  diagnosis?: string | null;
  notes?: string | null;
  createdAt: number;
}

export async function listEncounters(patientId: string) {
  return apiFetch<{ encounters: Encounter[] }>(`/patients/${patientId}/encounters`);
}

export async function listRecentEncounters(limit = 10) {
  return apiFetch<{ encounters: Encounter[] }>(`/encounters?limit=${limit}`);
}

export async function listCriticalLabs() {
  return apiFetch<{ labs: LabResult[] }>('/labs?status=critical');
}

export async function listOverdueVaccinations() {
  return apiFetch<{ vaccinations: Vaccination[] }>('/vaccinations?overdue=true');
}

export interface DailyStats {
  patientsToday: number;
  appointmentsToday: number;
  emergencies: number;
  admissions: number;
  discharges: number;
  topDiagnoses: { name: string; count: number }[];
  weeklyTrend: { day: string; patients: number }[];
}

export async function getDailyStats() {
  return apiFetch<DailyStats>('/stats/daily');
}

export interface Facility {
  id: string;
  name: string;
  level: string;
  location: string;
  beds: number;
  bedsOccupied: number;
}

export async function listFacilities() {
  return apiFetch<{ facilities: Facility[] }>('/facilities');
}

export async function createEncounter(body: {
  patientId: string;
  doctorId: string;
  encounterDate: number;
  type?: Encounter['type'];
  chiefComplaint?: string;
  diagnosis?: string;
  notes?: string;
}) {
  return apiFetch<{ id: string }>('/encounters', { method: 'POST', body: JSON.stringify(body) });
}

export async function aiSummarize(patientId: string) {
  return apiFetch<{ summary: string; provider: 'openrouter' | 'mock' }>('/ai/summarize', {
    method: 'POST',
    body: JSON.stringify({ patientId }),
  });
}

export interface AiRiskFlag {
  severity: 'high' | 'medium' | 'low';
  category: string;
  message: string;
  action: string;
}

export async function aiRiskFlags(patientId: string) {
  return apiFetch<{ flags: AiRiskFlag[]; provider: 'openrouter' | 'mock' }>('/ai/risk-flags', {
    method: 'POST',
    body: JSON.stringify({ patientId }),
  });
}

export async function aiChat(body: {
  patientId: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
}) {
  return apiFetch<{ reply: string; provider: 'openrouter' | 'mock' }>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function exportFhirBundle(patientId: string): Promise<string> {
  const data = await apiFetch<unknown>(
    `/fhir/Patient/${encodeURIComponent(patientId)}/$everything`
  );
  return JSON.stringify(data, null, 2);
}

export interface RegistryVerifyResult {
  verified: boolean;
  registry: string;
  status: 'verified' | 'not_found' | 'invalid_format';
  matchedName?: string;
  checkedAt: string;
  provider: 'mock' | 'live';
}

export async function verifyNationalId(body: { patientId?: string; nationalId?: string }) {
  return apiFetch<RegistryVerifyResult>('/registry/verify', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export interface InsuranceEligibilityResult {
  eligible: boolean;
  scheme: string;
  memberNumber: string;
  status: 'active' | 'inactive' | 'expired' | 'not_found';
  coverage?: { inpatient: boolean; outpatient: boolean; maternity: boolean };
  validThrough?: string;
  copayPercent?: number;
  checkedAt: string;
  provider: 'mock' | 'live';
}

export async function checkInsuranceEligibility(body: {
  patientId?: string;
  scheme?: string;
  memberNumber?: string;
}) {
  return apiFetch<InsuranceEligibilityResult>('/insurance/eligibility', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function importLabsCsv(csv: string) {
  return apiFetch<{ imported: number; errors: { row: number; reason: string }[]; total: number }>(
    '/labs/import',
    {
      method: 'POST',
      body: JSON.stringify({ csv }),
    }
  );
}

export async function aiChatStream(
  body: { patientId: string; messages: { role: 'user' | 'assistant'; content: string }[] },
  onDelta: (text: string) => void
): Promise<{ provider: 'openrouter' | 'mock' }> {
  const res = await fetch(`${base}/ai/chat`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, stream: true }),
  });
  if (!res.ok || !res.body) {
    throw new Error(`ai_chat_stream ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let provider: 'openrouter' | 'mock' = 'mock';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (!payload) continue;
      try {
        const evt = JSON.parse(payload) as {
          type: string;
          text?: string;
          provider?: 'openrouter' | 'mock';
        };
        if (evt.type === 'delta' && evt.text) onDelta(evt.text);
        if (evt.type === 'done' && evt.provider) provider = evt.provider;
      } catch {
        // ignore
      }
    }
  }
  return { provider };
}
