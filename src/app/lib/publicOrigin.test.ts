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

  it('falls back when env empty', () => {
    expect(resolvePublicOrigin(undefined, 'http://localhost:5173')).toBe('http://localhost:5173');
  });

  it('strips trailing slash from env', () => {
    expect(normalizePublicOrigin('https://demo.example/')).toBe('https://demo.example');
  });
});

describe('isLikelyUnreachableForQrScan', () => {
  it('flags loopback and LAN', () => {
    expect(isLikelyUnreachableForQrScan('http://localhost:5173')).toBe(true);
    expect(isLikelyUnreachableForQrScan('http://192.168.1.5:5173')).toBe(true);
  });

  it('allows public hosts', () => {
    expect(isLikelyUnreachableForQrScan('https://abc.trycloudflare.com')).toBe(false);
  });
});
