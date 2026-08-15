import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import ar from '../locales/ar/translation.json';
import en from '../locales/en/translation.json';
import fr from '../locales/fr/translation.json';
import ha from '../locales/ha/translation.json';
import sw from '../locales/sw/translation.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', dir: 'ltr' as const },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr' as const },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇪🇬', dir: 'rtl' as const },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪', dir: 'ltr' as const },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa', flag: '🇳🇬', dir: 'ltr' as const },
];

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export function applyDirection(lang: string) {
  if (typeof document === 'undefined') return;
  const entry = SUPPORTED_LANGUAGES.find(l => l.code === lang);
  const dir = entry?.dir ?? 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lang;
  document.documentElement.dataset.dir = dir;
}

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        fr: { translation: fr },
        ar: { translation: ar },
        sw: { translation: sw },
        ha: { translation: ha },
      },
      fallbackLng: 'en',
      supportedLngs: SUPPORTED_LANGUAGES.map(l => l.code),
      interpolation: { escapeValue: false },
      detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
    })
    .then(() => applyDirection(i18n.language));

  i18n.on('languageChanged', lng => applyDirection(lng));
}

export default i18n;
