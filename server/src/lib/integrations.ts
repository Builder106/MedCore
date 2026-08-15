// External integrations — mock implementations with a clean interface so that
// swapping in a real registry/NHIF API in production is a one-line change.

export type RegistryVerifyResult = {
  verified: boolean;
  registry: string;
  status: 'verified' | 'not_found' | 'invalid_format';
  matchedName?: string;
  checkedAt: string;
  provider: 'mock' | 'live';
};

export async function verifyNationalId(opts: {
  nationalId: string;
  expectedName?: string;
}): Promise<RegistryVerifyResult> {
  const { nationalId, expectedName } = opts;
  const clean = nationalId.replace(/[^0-9A-Z]/gi, '').toUpperCase();
  const now = new Date().toISOString();

  // Valid formats: Kenya (8 digits), Nigeria NIN (11 digits), South Africa (13 digits).
  if (!/^\d{7,13}$/.test(clean)) {
    return {
      verified: false,
      registry: 'national-id-registry',
      status: 'invalid_format',
      checkedAt: now,
      provider: 'mock',
    };
  }
  // Mock rule: IDs starting with "0" simulate "not found in registry".
  if (clean.startsWith('0')) {
    return {
      verified: false,
      registry: 'national-id-registry',
      status: 'not_found',
      checkedAt: now,
      provider: 'mock',
    };
  }
  return {
    verified: true,
    registry: 'national-id-registry',
    status: 'verified',
    matchedName: expectedName,
    checkedAt: now,
    provider: 'mock',
  };
}

export type InsuranceEligibilityResult = {
  eligible: boolean;
  scheme: string;
  memberNumber: string;
  status: 'active' | 'inactive' | 'expired' | 'not_found';
  coverage?: { inpatient: boolean; outpatient: boolean; maternity: boolean };
  validThrough?: string;
  copayPercent?: number;
  checkedAt: string;
  provider: 'mock' | 'live';
};

export async function checkInsuranceEligibility(opts: {
  scheme: string;
  memberNumber: string;
}): Promise<InsuranceEligibilityResult> {
  const { scheme, memberNumber } = opts;
  const clean = memberNumber.replace(/\s/g, '');
  const now = new Date().toISOString();
  if (!clean || clean.length < 5) {
    return {
      eligible: false,
      scheme,
      memberNumber: clean,
      status: 'not_found',
      checkedAt: now,
      provider: 'mock',
    };
  }
  if (clean.startsWith('0')) {
    return {
      eligible: false,
      scheme,
      memberNumber: clean,
      status: 'inactive',
      checkedAt: now,
      provider: 'mock',
    };
  }
  const validThrough = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return {
    eligible: true,
    scheme,
    memberNumber: clean,
    status: 'active',
    coverage: {
      inpatient: true,
      outpatient: true,
      maternity: scheme.toLowerCase().includes('nhif'),
    },
    validThrough,
    copayPercent: 10,
    checkedAt: now,
    provider: 'mock',
  };
}

// Parses RFC-4180-ish CSV text into an array of header-keyed row objects.
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuote) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQuote = false;
        } else {
          cur += ch;
        }
      } else if (ch === ',') {
        out.push(cur);
        cur = '';
      } else if (ch === '"' && cur === '') {
        inQuote = true;
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  };

  const headers = parseLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return lines.slice(1).map(line => {
    const cells = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (cells[i] ?? '').trim();
    });
    return row;
  });
}
