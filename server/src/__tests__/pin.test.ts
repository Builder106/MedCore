import * as crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { hashPin, isLegacyHash, pinNeedsRotation, verifyPin } from '../lib/pin.js';

describe('pin lib', () => {
  it('hashes and verifies scrypt PINs', () => {
    const pin = '4242';
    const hash = hashPin(pin);
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(isLegacyHash(hash)).toBe(false);

    expect(verifyPin(pin, hash)).toBe(true);
    expect(verifyPin('0000', hash)).toBe(false);
  });

  it('verifies legacy SHA256 hashes', () => {
    const pin = '1212';
    const legacyHashVal = crypto
      .createHash('sha256')
      .update(`medcore-demo-salt-v1:${pin}`)
      .digest('hex');

    expect(isLegacyHash(legacyHashVal)).toBe(true);
    expect(verifyPin(pin, legacyHashVal)).toBe(true);
    expect(verifyPin('9999', legacyHashVal)).toBe(false);
  });

  it('handles invalid or empty hash formats safely', () => {
    expect(verifyPin('4242', null)).toBe(false);
    expect(verifyPin('4242', undefined)).toBe(false);
    expect(verifyPin('4242', '')).toBe(false);
    expect(verifyPin('4242', 'scrypt$')).toBe(false);
    expect(verifyPin('4242', 'scrypt$bad')).toBe(false);
    expect(verifyPin('4242', 'scrypt$invalid$length')).toBe(false);
    expect(verifyPin('4242', 'shortlegacyhex')).toBe(false);
    // Invalid argument type to trigger catch block in scrypt verify
    expect(verifyPin(undefined as any, 'scrypt$YWJj$ZGVm')).toBe(false);
  });

  it('identifies legacy hash checks', () => {
    expect(isLegacyHash(null)).toBe(false);
    expect(isLegacyHash(undefined)).toBe(false);
    expect(isLegacyHash('')).toBe(false);
    expect(isLegacyHash('abc123hex')).toBe(true);
  });

  it('checks pin rotation threshold correctly', () => {
    expect(pinNeedsRotation(null)).toBe(true);
    expect(pinNeedsRotation(undefined)).toBe(true);
    expect(pinNeedsRotation(0)).toBe(true);

    const recent = Date.now() - 1000 * 60 * 60; // 1 hr ago
    expect(pinNeedsRotation(recent)).toBe(false);

    const thirtyOneDaysAgo = Date.now() - 1000 * 60 * 60 * 24 * 31;
    expect(pinNeedsRotation(thirtyOneDaysAgo)).toBe(true);
  });
});
