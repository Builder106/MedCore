import { ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18nInstance, { SUPPORTED_LANGUAGES, applyDirection } from '../i18n';

export type UserRole = 'patient' | 'doctor' | 'admin';
export type Language = 'en' | 'fr' | 'ar' | 'sw' | 'ha';

export interface SessionUser {
  id: string;
  name: string;
  role: UserRole;
}

interface AppState {
  role: UserRole;
  lang: Language;
  setLang: (l: Language) => void;
  currentPatientId: string;
  setCurrentPatientId: (id: string) => void;
  offlineMode: boolean;
  setOfflineMode: (v: boolean) => void;
  lowBandwidth: boolean;
  setLowBandwidth: (v: boolean) => void;
  currentUserId: string;
  sessionUser: SessionUser | null;
  sessionLoading: boolean;
  login: (userId: string, pin: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export const PREFS_STORAGE_KEY = 'medcore.prefs.v1';
const VALID_LANGS: Language[] = ['en', 'fr', 'ar', 'sw', 'ha'];

export interface PersistedPrefs {
  lang?: Language;
  currentPatientId?: string;
}

export function loadPrefs(): PersistedPrefs {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: PersistedPrefs = {};
    const lang = parsed.lang;
    if (typeof lang === 'string' && VALID_LANGS.includes(lang as Language))
      out.lang = lang as Language;
    if (typeof parsed.currentPatientId === 'string' && parsed.currentPatientId.length > 0) {
      out.currentPatientId = parsed.currentPatientId;
    }
    return out;
  } catch {
    return {};
  }
}

export function savePrefs(prefs: PersistedPrefs) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* quota or private mode — ignore */
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const initial = loadPrefs();
  const initialLang: Language = initial.lang ?? ((i18nInstance.language as Language) || 'en');

  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [role, setRoleState] = useState<UserRole>('doctor');
  const [lang, setLangState] = useState<Language>(initialLang);
  const [currentPatientId, setCurrentPatientIdState] = useState(
    initial.currentPatientId ?? 'PAT-001'
  );
  const [offlineMode, setOfflineMode] = useState(false);
  const [lowBandwidth, setLowBandwidth] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data?.user?.id && data?.user?.role) {
          const u = data.user as SessionUser;
          setSessionUser(u);
          setRoleState(u.role);
        } else {
          setSessionUser(null);
        }
      } catch {
        if (!cancelled) setSessionUser(null);
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (initial.lang && i18nInstance.language !== initial.lang) {
      i18nInstance.changeLanguage(initial.lang);
    }
    applyDirection(initialLang);
  }, []);

  const setLang = (l: Language) => {
    setLangState(l);
    i18nInstance.changeLanguage(l);
    applyDirection(l);
    savePrefs({ lang: l, currentPatientId });
  };

  const setCurrentPatientId = (id: string) => {
    setCurrentPatientIdState(id);
    savePrefs({ lang, currentPatientId: id });
  };

  useEffect(() => {
    applyDirection(lang);
  }, [lang]);

  const login = useCallback(async (userId: string, pin: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, pin }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = data?.error === 'locked' ? 'locked' : 'invalid';
      throw new Error(err);
    }
    const u = data.user as SessionUser;
    setSessionUser(u);
    setRoleState(u.role);
  }, []);

  const signOut = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setSessionUser(null);
    setRoleState('doctor');
  }, []);

  const currentUserId =
    sessionUser?.id ?? (role === 'doctor' ? 'DOC-001' : role === 'admin' ? 'ADM-001' : 'PAT-001');

  return (
    <AppContext.Provider
      value={{
        role,
        lang,
        setLang,
        currentPatientId,
        setCurrentPatientId,
        offlineMode,
        setOfflineMode,
        lowBandwidth,
        setLowBandwidth,
        currentUserId,
        sessionUser,
        sessionLoading,
        login,
        signOut,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}

const legacyMap: Record<string, string> = {
  'nav.dashboard': 'nav.dashboard',
  'nav.patients': 'nav.patients',
  'nav.appointments': 'nav.appointments',
  'nav.prescriptions': 'nav.prescriptions',
  'nav.labResults': 'nav.labResults',
  'nav.vaccinations': 'nav.vaccinations',
  'nav.referrals': 'nav.referrals',
  'nav.inventory': 'nav.inventory',
  'nav.staff': 'nav.staff',
  'nav.reports': 'nav.reports',
  'nav.aiAssistant': 'nav.aiAssistant',
  'nav.consent': 'nav.consent',
  'nav.auditLog': 'nav.auditLog',
  'nav.myRecords': 'nav.myRecords',
  'nav.healthId': 'nav.healthId',
  'nav.settings': 'nav.settings',
  'common.search': 'common.search',
  'common.offline': 'common.offline',
  'common.online': 'common.online',
};

export function t(key: string, lang: Language): string {
  const mapped = legacyMap[key] ?? key;
  const value = i18nInstance.getResource(lang, 'translation', mapped);
  if (typeof value === 'string') return value;
  return i18nInstance.t(mapped, { lng: lang }) ?? key;
}

export { SUPPORTED_LANGUAGES };
export function useT() {
  return useTranslation();
}
