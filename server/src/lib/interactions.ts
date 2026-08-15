export type InteractionLevel = 'critical' | 'warning' | 'info';

export interface InteractionResult {
  level: InteractionLevel | 'none';
  drugA: string;
  drugB: string;
  message: string;
  source: 'openfda' | 'rxnorm' | 'fallback' | 'none';
}

const norm = (s: string) => s.trim().toLowerCase();

interface FallbackEntry {
  a: string;
  b: string;
  level: InteractionLevel;
  message: string;
}

export const FALLBACK_INTERACTIONS: FallbackEntry[] = [
  {
    a: 'metformin',
    b: 'ibuprofen',
    level: 'warning',
    message: 'May reduce kidney function. Monitor creatinine levels.',
  },
  {
    a: 'metformin',
    b: 'alcohol',
    level: 'warning',
    message: 'Risk of lactic acidosis. Advise patient to avoid alcohol.',
  },
  {
    a: 'warfarin',
    b: 'aspirin',
    level: 'critical',
    message:
      'Significantly increased bleeding risk. Do not co-prescribe without haematology review.',
  },
  {
    a: 'lisinopril',
    b: 'potassium',
    level: 'warning',
    message: 'Risk of hyperkalaemia. Monitor potassium levels weekly.',
  },
  {
    a: 'amlodipine',
    b: 'simvastatin',
    level: 'info',
    message: 'Minor PK interaction. Limit simvastatin to 20mg/day.',
  },
  {
    a: 'metformin',
    b: 'contrast',
    level: 'warning',
    message: 'Hold metformin 48h before/after iodinated contrast.',
  },
];

export function lookupFallback(drugA: string, drugB: string): InteractionResult {
  const a = norm(drugA);
  const b = norm(drugB);
  for (const entry of FALLBACK_INTERACTIONS) {
    const matches =
      (a.includes(entry.a) && b.includes(entry.b)) || (a.includes(entry.b) && b.includes(entry.a));
    if (matches) {
      return {
        level: entry.level,
        drugA,
        drugB,
        message: entry.message,
        source: 'fallback',
      };
    }
  }
  return { level: 'none', drugA, drugB, message: '', source: 'none' };
}

export async function checkInteractionViaOpenFDA(
  drugA: string,
  drugB: string,
  fetchImpl: typeof fetch = fetch
): Promise<InteractionResult | null> {
  try {
    const url = `https://api.fda.gov/drug/label.json?search=drug_interactions:%22${encodeURIComponent(drugA)}%22+AND+drug_interactions:%22${encodeURIComponent(drugB)}%22&limit=1`;
    const res = await fetchImpl(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: Array<{ drug_interactions?: string[] }> };
    const text = data.results?.[0]?.drug_interactions?.join(' ') ?? '';
    if (!text) return null;
    const lower = text.toLowerCase();
    let level: InteractionLevel = 'info';
    if (/\b(contraindicated|fatal|life[- ]threatening|severe|do not)\b/.test(lower))
      level = 'critical';
    else if (/\b(monitor|caution|increase|decrease|avoid|risk)\b/.test(lower)) level = 'warning';
    return {
      level,
      drugA,
      drugB,
      message: text.slice(0, 280),
      source: 'openfda',
    };
  } catch {
    return null;
  }
}

export async function resolveInteraction(drugA: string, drugB: string): Promise<InteractionResult> {
  const fallback = lookupFallback(drugA, drugB);
  if (fallback.level !== 'none') return fallback;
  const remote = await checkInteractionViaOpenFDA(drugA, drugB);
  if (remote) return remote;
  return fallback;
}
