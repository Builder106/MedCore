export interface PatientContext {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  allergies: string[];
  bloodType?: string | null;
  insuranceScheme?: string | null;
  activeMedications: { drugName: string; dosage: string; frequency: string }[];
  recentEncounters: { date: string; chiefComplaint?: string | null; diagnosis?: string | null }[];
  recentLabs: { testName: string; value: string; unit?: string | null; status: string }[];
  adherenceRate?: number;
}

export function formatPatientContext(ctx: PatientContext): string {
  const ageYears = (() => {
    try {
      const dob = new Date(ctx.dob);
      return Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    } catch {
      return '?';
    }
  })();
  const meds = ctx.activeMedications.length
    ? ctx.activeMedications.map(m => `- ${m.drugName} ${m.dosage} ${m.frequency}`).join('\n')
    : '- None on record';
  const allergies = ctx.allergies.length ? ctx.allergies.join(', ') : 'None recorded';
  const encounters = ctx.recentEncounters.length
    ? ctx.recentEncounters
        .map(e => `- ${e.date}: ${e.chiefComplaint ?? 'N/A'} — Dx: ${e.diagnosis ?? 'N/A'}`)
        .join('\n')
    : '- No recent encounters';
  const labs = ctx.recentLabs.length
    ? ctx.recentLabs
        .map(l => `- ${l.testName}: ${l.value}${l.unit ? ' ' + l.unit : ''} (${l.status})`)
        .join('\n')
    : '- No recent labs';
  return [
    `Patient ID: ${ctx.id}`,
    `Name: ${ctx.firstName} ${ctx.lastName}`,
    `Age: ${ageYears}`,
    `Blood type: ${ctx.bloodType ?? 'Unknown'}`,
    `Allergies: ${allergies}`,
    `Insurance: ${ctx.insuranceScheme ?? 'Unknown'}`,
    `Adherence (30d): ${ctx.adherenceRate != null ? ctx.adherenceRate + '%' : 'Unknown'}`,
    '',
    'Active medications:',
    meds,
    '',
    'Recent encounters:',
    encounters,
    '',
    'Recent labs:',
    labs,
  ].join('\n');
}

export const SUMMARIZE_SYSTEM_PROMPT = `You are a clinical assistant helping a doctor in an African primary-care setting review a patient's chart before a visit.

Produce a concise summary in 4 sections:
1. Key active issues (2-3 bullets)
2. Medication risks or adherence concerns
3. Overdue items (screenings, labs, vaccinations)
4. Suggested questions for this visit (2-3 bullets)

Constraints:
- Be specific. Reference dates, values, and drug names from the provided context.
- Do not invent information that is not in the context.
- Do not make a final diagnosis. Offer differentials only when explicitly requested.
- End with: "AI suggestions are advisory — verify clinically."`;

export const CHAT_SYSTEM_PROMPT = `You are a clinical assistant supporting a doctor in an African primary-care setting. You have the patient's chart context below.

Guidelines:
- Answer clinical questions grounded in the patient context.
- If information is missing, say so rather than guessing.
- Flag safety concerns (drug interactions, allergies) proactively.
- Keep responses concise and scannable.
- Always end clinical recommendations with a reminder that you are advisory.`;

export const RISK_FLAGS_SYSTEM_PROMPT = `You are a clinical risk screening assistant. Review the patient context and return a JSON array of risk flags.

Each flag has: { "severity": "high" | "medium" | "low", "category": string, "message": string, "action": string }

Categories to consider: adherence, overdue_screening, drug_interaction, uncontrolled_condition, missed_vaccination, lab_anomaly.

Return ONLY the JSON array, no prose. Maximum 5 flags, ordered by severity.`;
