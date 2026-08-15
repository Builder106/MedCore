import { describe, expect, it } from 'vitest';
import { checkInsuranceEligibility, parseCsv, verifyNationalId } from '../lib/integrations.js';

// ── parseCsv ──────────────────────────────────────────────────────────────────

describe('parseCsv', () => {
  it('parses a basic two-column CSV', () => {
    const rows = parseCsv('name,age\nAlice,30\nBob,25');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ name: 'Alice', age: '30' });
    expect(rows[1]).toEqual({ name: 'Bob', age: '25' });
  });

  it('returns empty array for header-only input', () => {
    expect(parseCsv('name,age')).toHaveLength(0);
  });

  it('returns empty array for blank input', () => {
    expect(parseCsv('')).toHaveLength(0);
    expect(parseCsv('  \n  ')).toHaveLength(0);
  });

  it('handles quoted fields with commas inside', () => {
    const rows = parseCsv('a,b\n"hello, world",2');
    expect(rows[0].a).toBe('hello, world');
  });

  it('handles double-quote escaping inside quoted fields', () => {
    const rows = parseCsv('a,b\n"say ""hi""",ok');
    expect(rows[0].a).toBe('say "hi"');
  });

  it('normalises headers to lowercase with underscores', () => {
    const rows = parseCsv('First Name,Last Name\nJohn,Doe');
    expect(rows[0]).toHaveProperty('first_name', 'John');
    expect(rows[0]).toHaveProperty('last_name', 'Doe');
  });

  it('handles CRLF line endings', () => {
    const rows = parseCsv('a,b\r\n1,2\r\n3,4');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ a: '1', b: '2' });
  });

  it('trims leading/trailing whitespace from values', () => {
    const rows = parseCsv('a,b\n  hello  , world ');
    expect(rows[0].a).toBe('hello');
    expect(rows[0].b).toBe('world');
  });

  it('fills missing columns with empty string', () => {
    const rows = parseCsv('a,b,c\n1,2');
    expect(rows[0].c).toBe('');
  });

  it('skips blank lines between data rows', () => {
    const rows = parseCsv('a,b\n1,2\n\n3,4\n');
    expect(rows).toHaveLength(2);
  });
});

// ── verifyNationalId ──────────────────────────────────────────────────────────

describe('verifyNationalId', () => {
  it('verifies a valid 8-digit ID', async () => {
    const r = await verifyNationalId({ nationalId: '12345678' });
    expect(r.status).toBe('verified');
    expect(r.verified).toBe(true);
    expect(r.provider).toBe('mock');
  });

  it('includes expectedName in matchedName when provided', async () => {
    const r = await verifyNationalId({ nationalId: '12345678', expectedName: 'Amina Wanjiru' });
    expect(r.matchedName).toBe('Amina Wanjiru');
  });

  it('returns not_found for ID starting with 0', async () => {
    const r = await verifyNationalId({ nationalId: '01234567' });
    expect(r.status).toBe('not_found');
    expect(r.verified).toBe(false);
  });

  it('returns invalid_format for too-short ID', async () => {
    const r = await verifyNationalId({ nationalId: '123456' });
    expect(r.status).toBe('invalid_format');
    expect(r.verified).toBe(false);
  });

  it('returns invalid_format for ID with letters', async () => {
    const r = await verifyNationalId({ nationalId: 'ABCDE123' });
    // ABCDE123 → after stripping non-alphanumeric: ABCDE123, fails /^\d{7,13}$/
    expect(r.status).toBe('invalid_format');
  });

  it('accepts 11-digit Nigerian NIN', async () => {
    const r = await verifyNationalId({ nationalId: '12345678901' });
    expect(r.status).toBe('verified');
  });

  it('accepts 13-digit South African ID', async () => {
    const r = await verifyNationalId({ nationalId: '1234567890123' });
    expect(r.status).toBe('verified');
  });

  it('rejects 14-digit ID as invalid format', async () => {
    const r = await verifyNationalId({ nationalId: '12345678901234' });
    expect(r.status).toBe('invalid_format');
  });

  it('always returns a valid ISO checkedAt timestamp', async () => {
    const r = await verifyNationalId({ nationalId: '12345678' });
    expect(() => new Date(r.checkedAt)).not.toThrow();
    expect(r.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ── checkInsuranceEligibility ─────────────────────────────────────────────────

describe('checkInsuranceEligibility', () => {
  it('returns active for a valid member number', async () => {
    const r = await checkInsuranceEligibility({ scheme: 'NHIF', memberNumber: '12345678' });
    expect(r.status).toBe('active');
    expect(r.eligible).toBe(true);
    expect(r.provider).toBe('mock');
  });

  it('sets maternity coverage for NHIF scheme', async () => {
    const r = await checkInsuranceEligibility({ scheme: 'NHIF', memberNumber: '12345678' });
    expect(r.coverage?.maternity).toBe(true);
  });

  it('sets maternity = false for non-NHIF scheme', async () => {
    const r = await checkInsuranceEligibility({ scheme: 'AAR', memberNumber: '12345678' });
    expect(r.coverage?.maternity).toBe(false);
  });

  it('returns not_found for member number shorter than 5 chars', async () => {
    const r = await checkInsuranceEligibility({ scheme: 'NHIF', memberNumber: '123' });
    expect(r.status).toBe('not_found');
    expect(r.eligible).toBe(false);
  });

  it('returns not_found for empty member number', async () => {
    const r = await checkInsuranceEligibility({ scheme: 'NHIF', memberNumber: '' });
    expect(r.status).toBe('not_found');
  });

  it('returns inactive for member number starting with 0', async () => {
    const r = await checkInsuranceEligibility({ scheme: 'NHIF', memberNumber: '012345678' });
    expect(r.status).toBe('inactive');
    expect(r.eligible).toBe(false);
  });

  it('sets copayPercent to 10 for active members', async () => {
    const r = await checkInsuranceEligibility({ scheme: 'NHIF', memberNumber: '12345678' });
    expect(r.copayPercent).toBe(10);
  });

  it('trims whitespace from member number before evaluating', async () => {
    const r = await checkInsuranceEligibility({ scheme: 'NHIF', memberNumber: '  12345678  ' });
    expect(r.status).toBe('active');
    expect(r.memberNumber).toBe('12345678');
  });

  it('returns a valid ISO checkedAt timestamp', async () => {
    const r = await checkInsuranceEligibility({ scheme: 'NHIF', memberNumber: '12345678' });
    expect(r.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
