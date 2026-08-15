import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadPrefs, PREFS_STORAGE_KEY, savePrefs } from './AppContext';

function makeMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

beforeEach(() => {
  vi.stubGlobal('window', { localStorage: makeMemoryStorage() } as unknown as Window);
});

describe('AppContext preference persistence', () => {
  it('returns empty object when nothing is stored', () => {
    expect(loadPrefs()).toEqual({});
  });

  it('round-trips lang and currentPatientId through localStorage', () => {
    savePrefs({ lang: 'fr', currentPatientId: 'PAT-042' });
    expect(loadPrefs()).toEqual({ lang: 'fr', currentPatientId: 'PAT-042' });
  });

  it('uses the versioned storage key', () => {
    savePrefs({ lang: 'ar' });
    const raw = (window as unknown as { localStorage: Storage }).localStorage.getItem(
      PREFS_STORAGE_KEY
    );
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toEqual({ lang: 'ar' });
  });

  it('ignores unknown languages when loading', () => {
    (window as unknown as { localStorage: Storage }).localStorage.setItem(
      PREFS_STORAGE_KEY,
      JSON.stringify({ lang: 'xx', currentPatientId: 'PAT-1' })
    );
    expect(loadPrefs()).toEqual({ currentPatientId: 'PAT-1' });
  });

  it('returns empty object for malformed JSON', () => {
    (window as unknown as { localStorage: Storage }).localStorage.setItem(
      PREFS_STORAGE_KEY,
      '{not json'
    );
    expect(loadPrefs()).toEqual({});
  });

  it('accepts all five supported languages', () => {
    for (const lang of ['en', 'fr', 'ar', 'sw', 'ha'] as const) {
      savePrefs({ lang });
      expect(loadPrefs().lang).toBe(lang);
    }
  });
});
