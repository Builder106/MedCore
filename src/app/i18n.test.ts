import { beforeAll, describe, expect, it } from 'vitest';
import i18n, { SUPPORTED_LANGUAGES } from './i18n';

beforeAll(async () => {
  if (!i18n.isInitialized) await new Promise(r => setTimeout(r, 50));
});

describe('i18n multilingual support (F1)', () => {
  it('supports all five PRD languages', () => {
    const codes = SUPPORTED_LANGUAGES.map(l => l.code).sort();
    expect(codes).toEqual(['ar', 'en', 'fr', 'ha', 'sw']);
  });

  it('exposes native names and flags per language', () => {
    for (const l of SUPPORTED_LANGUAGES) {
      expect(l.nativeName).toBeTruthy();
      expect(l.flag).toBeTruthy();
    }
    expect(SUPPORTED_LANGUAGES.find(l => l.code === 'ar')?.nativeName).toBe('العربية');
    expect(SUPPORTED_LANGUAGES.find(l => l.code === 'sw')?.nativeName).toBe('Kiswahili');
  });

  it('marks Arabic as RTL and others as LTR', () => {
    expect(SUPPORTED_LANGUAGES.find(l => l.code === 'ar')?.dir).toBe('rtl');
    expect(SUPPORTED_LANGUAGES.find(l => l.code === 'en')?.dir).toBe('ltr');
    expect(SUPPORTED_LANGUAGES.find(l => l.code === 'fr')?.dir).toBe('ltr');
    expect(SUPPORTED_LANGUAGES.find(l => l.code === 'sw')?.dir).toBe('ltr');
    expect(SUPPORTED_LANGUAGES.find(l => l.code === 'ha')?.dir).toBe('ltr');
  });

  it('translates core navigation keys for each language', async () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      await i18n.changeLanguage(lang.code);
      const label = i18n.t('nav.prescriptions');
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toBe('nav.prescriptions');
    }
  });

  it('PRD French demo strings are present', async () => {
    await i18n.changeLanguage('fr');
    expect(i18n.t('nav.dashboard')).toBe('Tableau de bord');
    expect(i18n.t('nav.prescriptions')).toBe('Ordonnances');
    expect(i18n.t('common.save')).toBe('Enregistrer');
  });
});
