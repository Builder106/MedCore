import { describe, expect, it } from 'vitest';
import {
  isLikelyUnreachableForQrScan,
  normalizePublicOrigin,
  resolvePublicOrigin,
} from './publicOrigin';

describe('resolvePublicOrigin', () => {
  it('uses env when valid https URL', () => {
    expect(resolvePublicOrigin('https://x.trycloudflare.com', 'http://localhost:5173')).toBe(
      'https://x.trycloudflare.com'
    );
  });

  it('falls back when env empty or invalid', () => {
    expect(resolvePublicOrigin(undefined, 'http://localhost:5173')).toBe('http://localhost:5173');
    expect(resolvePublicOrigin('', 'http://localhost:5173')).toBe('http://localhost:5173');
    expect(resolvePublicOrigin('   ', 'http://localhost:5173')).toBe('http://localhost:5173');
    expect(resolvePublicOrigin('http://[invalid-url', 'http://localhost:5173')).toBe(
      'http://localhost:5173'
    );
  });

  it('strips trailing slash from env', () => {
    expect(normalizePublicOrigin('https://demo.example/')).toBe('https://demo.example');
    expect(normalizePublicOrigin('https://demo.example///')).toBe('https://demo.example');
  });

  it('handles null/undefined/empty input', () => {
    expect(normalizePublicOrigin(undefined)).toBe('');
    expect(normalizePublicOrigin('')).toBe('');
  });
});

describe('isLikelyUnreachableForQrScan', () => {
  it('flags loopback and LAN', () => {
    expect(isLikelyUnreachableForQrScan('http://localhost:5173')).toBe(true);
    expect(isLikelyUnreachableForQrScan('http://127.0.0.1:5173')).toBe(true);
    expect(isLikelyUnreachableForQrScan('http://[::1]:5173')).toBe(true);
    expect(isLikelyUnreachableForQrScan('http://192.168.1.5:5173')).toBe(true);
    expect(isLikelyUnreachableForQrScan('http://10.0.0.1:5173')).toBe(true);
    expect(isLikelyUnreachableForQrScan('http://172.16.0.1:5173')).toBe(true);
    expect(isLikelyUnreachableForQrScan('http://172.20.0.1:5173')).toBe(true);
    expect(isLikelyUnreachableForQrScan('http://172.31.0.1:5173')).toBe(true);
    expect(isLikelyUnreachableForQrScan('http://172.32.0.1:5173')).toBe(false);
  });

  it('handles invalid URL gracefully', () => {
    expect(isLikelyUnreachableForQrScan('http://[invalid-url')).toBe(true);
  });

  it('allows public hosts', () => {
    expect(isLikelyUnreachableForQrScan('https://abc.trycloudflare.com')).toBe(false);
  });
});
