import { describe, expect, it } from 'vitest';
import { lookupFallback } from '../lib/interactions.js';
import { clampSms, parseSmsCommand, safeName } from '../lib/sms-commands.js';

describe('SMS command parser', () => {
  it('parses PATIENT command', () => {
    const r = parseSmsCommand('PATIENT PAT-001 PIN:4242');
    expect(r).toEqual({ type: 'PATIENT', patientId: 'PAT-001', pin: '4242', payload: undefined });
  });
  it('parses NOTE with payload', () => {
    const r = parseSmsCommand('NOTE PAT-001 PIN:4242 increase metformin');
    expect(r).toMatchObject({ type: 'NOTE', payload: 'increase metformin' });
  });
  it('parses lower case command', () => {
    const r = parseSmsCommand('emrg PAT-001 PIN:1234');
    expect(r).toMatchObject({ type: 'EMRG' });
  });
  it('rejects malformed command', () => {
    const r = parseSmsCommand('hello world');
    expect('error' in r).toBe(true);
  });
});

describe('SMS safety', () => {
  it('safeName returns first name + initial only', () => {
    expect(safeName('Amina', 'Okafor')).toBe('Amina O.');
  });
  it('clampSms truncates to 160 chars', () => {
    const long = 'a'.repeat(200);
    expect(clampSms(long).length).toBeLessThanOrEqual(160);
  });
});

describe('Interaction fallback', () => {
  it('finds warfarin + aspirin as critical', () => {
    const r = lookupFallback('Warfarin', 'Aspirin');
    expect(r.level).toBe('critical');
  });
  it('finds reverse order', () => {
    const r = lookupFallback('Ibuprofen', 'Metformin');
    expect(r.level).toBe('warning');
  });
  it('returns none for unrelated', () => {
    const r = lookupFallback('Foo', 'Bar');
    expect(r.level).toBe('none');
  });
});
