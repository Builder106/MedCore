import { describe, expect, it } from 'vitest';
import { decryptField, encryptField, isEncrypted } from '../lib/crypto.js';
import { env } from '../lib/env.js';

describe('crypto lib', () => {
  it('handles null and undefined', () => {
    expect(encryptField(null)).toBeNull();
    expect(encryptField(undefined)).toBeNull();
    expect(decryptField(null)).toBeNull();
    expect(decryptField(undefined)).toBeNull();
  });

  it('passes through plaintext when not encrypted prefix', () => {
    expect(decryptField('plain text string')).toBe('plain text string');
  });

  it('correctly identifies encrypted strings', () => {
    expect(isEncrypted('enc:v1:abc:def:ghi')).toBe(true);
    expect(isEncrypted('plain text')).toBe(false);
    expect(isEncrypted(null)).toBe(false);
    expect(isEncrypted(undefined)).toBe(false);
  });

  it('encrypts and decrypts round-trip when key is configured', () => {
    const originalKey = env.DATABASE_ENCRYPTION_KEY;
    try {
      env.DATABASE_ENCRYPTION_KEY = 'test-secret-encryption-key-for-unit-tests';
      const text = 'Sensitive patient medical history';
      const encrypted = encryptField(text);
      expect(encrypted).not.toBeNull();
      expect(isEncrypted(encrypted)).toBe(true);
      expect(encrypted).not.toBe(text);

      const decrypted = decryptField(encrypted);
      expect(decrypted).toBe(text);
    } finally {
      env.DATABASE_ENCRYPTION_KEY = originalKey;
    }
  });

  it('handles corrupted encrypted payload or invalid auth tag', () => {
    const originalKey = env.DATABASE_ENCRYPTION_KEY;
    try {
      env.DATABASE_ENCRYPTION_KEY = 'test-secret-encryption-key-for-unit-tests';
      // Invalid tag length (not 16 bytes base64)
      const invalidTagPayload = 'enc:v1:AAAA:BBBB:CCCC';
      expect(decryptField(invalidTagPayload)).toBe(invalidTagPayload);

      // 16-byte dummy tag with corrupted data
      const dummy16ByteTag = Buffer.alloc(16, 0).toString('base64');
      const dummy12ByteIv = Buffer.alloc(12, 0).toString('base64');
      const corruptedPayload = `enc:v1:${dummy12ByteIv}:${dummy16ByteTag}:bm90dmFsaWQ=`;
      expect(decryptField(corruptedPayload)).toBe(corruptedPayload);
    } finally {
      env.DATABASE_ENCRYPTION_KEY = originalKey;
    }
  });

  it('returns plaintext if DATABASE_ENCRYPTION_KEY is not set', () => {
    const originalKey = env.DATABASE_ENCRYPTION_KEY;
    try {
      env.DATABASE_ENCRYPTION_KEY = undefined;
      const text = 'unencrypted payload';
      expect(encryptField(text)).toBe(text);
      expect(decryptField('enc:v1:abc:def:ghi')).toBe('enc:v1:abc:def:ghi');
    } finally {
      env.DATABASE_ENCRYPTION_KEY = originalKey;
    }
  });
});
