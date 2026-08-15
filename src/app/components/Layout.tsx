import {
  Activity,
  Bell,
  Globe2,
  Hexagon,
  LogOut,
  Menu,
  Shield,
  Smartphone,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation } from 'react-router';
import { SUPPORTED_LANGUAGES, useApp } from '../context/AppContext';
import { BottomNav } from './BottomNav';
import { MobileDrawer } from './MobileDrawer';
import { Sidebar } from './Sidebar';

export function Layout() {
  const {
    offlineMode,
    role,
    lang,
    setLang,
    lowBandwidth,
    setLowBandwidth,
    setOfflineMode,
    sessionUser,
    signOut,
  } = useApp();
  const { t } = useTranslation();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const routeLabels: Record<string, string> = {
    '/': t('nav.dashboard'),
    '/health-id': t('nav.healthId'),
    '/records': t('nav.myRecords'),
    '/patients': t('nav.patients'),
    '/appointments': t('nav.appointments'),
    '/prescriptions': t('nav.prescriptions'),
    '/lab-results': t('nav.labResults'),
    '/vaccinations': t('nav.vaccinations'),
    '/consent': t('nav.consent'),
    '/ai-assistant': t('nav.aiAssistant'),
    '/referrals': t('nav.referrals'),
    '/audit-log': t('nav.auditLog'),
    '/inventory': t('nav.inventory'),
    '/staff': t('nav.staff'),
    '/reports': t('nav.reports'),
    '/video-consult': t('nav.videoConsult'),
    '/sms-inbox': t('nav.smsInbox'),
    '/reminders': t('reminders.title'),
    '/voice-consult': t('voice.record'),
  };

  const pageLabel = routeLabels[location.pathname] || '';
  const roleLabel =
    role === 'patient'
      ? t('role.patientPortal')
      : role === 'doctor'
        ? t('role.clinicalWorkspace')
        : t('role.facilityAdmin');
  const roleDot =
    role === 'patient' ? 'bg-teal-500' : role === 'doctor' ? 'bg-violet-500' : 'bg-amber-500';
  const roleAvatar =
    role === 'patient' ? 'bg-teal-700' : role === 'doctor' ? 'bg-violet-700' : 'bg-amber-700';
  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === lang) ?? SUPPORTED_LANGUAGES[0];

  return (
    <div className="flex min-h-screen items-stretch bg-[#F3ECE1]">
      <Sidebar />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="bg-[#F9F5ED] border-b border-[#D9C8AE] px-3 sm:px-4 lg:px-7 py-2 sm:py-3 sticky top-0 z-20"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 0.5rem)' }}
        >
          <div className="flex items-center justify-between gap-2 lg:gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open navigation"
                className="af-tap af-focus inline-flex lg:hidden h-11 w-11 items-center justify-center rounded-xl text-[#1F1B18] hover:bg-[#EFE4D1]"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="lg:hidden flex items-center gap-2 min-w-0">
                <div className="bg-[#214838] text-[#DAB776] p-1.5 rounded-xl shadow-sm">
                  <Hexagon className="w-4 h-4 fill-current" />
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-[#1F1B18] truncate">
                    {pageLabel || 'MedCore'}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-[#5B5149] truncate flex items-center gap-1">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${roleDot}`} />
                    {roleLabel}
                  </div>
                </div>
              </div>
              <div className="hidden lg:flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${roleDot}`} />
                <span className="text-[11px] text-[#5B5149] uppercase tracking-[0.14em]">
                  {roleLabel}
                </span>
                {pageLabel && (
                  <>
                    <span className="text-[#B8A589]">/</span>
                    <span className="text-[13px] text-[#1F1B18]">{pageLabel}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 lg:gap-2">
              <button
                onClick={() => setLowBandwidth(!lowBandwidth)}
                className={`af-press af-focus hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border ${lowBandwidth ? 'bg-[#E8D6BC] text-[#5C3A2E] border-[#D0B994]' : 'bg-[#F7F1E6] text-[#5B5149] border-[#D9C8AE]'}`}
              >
                <Smartphone className="w-3 h-3" />
                {t('common.lowBandwidth')}
              </button>
              <button
                onClick={() => setOfflineMode(!offlineMode)}
                className={`af-press af-focus hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border ${offlineMode ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}
              >
                {offlineMode ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
                {offlineMode ? t('common.offlineSync') : t('common.onlineSync')}
              </button>
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-[#EAF2FF] text-[#3D4C8A] rounded-full text-[11px] border border-[#C4CEE9]">
                <Globe2 className="w-3 h-3" />
                <span aria-hidden>{currentLang.flag}</span>
                <span>{currentLang.nativeName}</span>
              </div>
              <select
                aria-label={t('common.language')}
                value={lang}
                onChange={e => setLang(e.target.value as typeof lang)}
                className="af-focus hidden lg:block bg-white border border-[#D9C8AE] text-[12px] text-[#5B5149] rounded-lg px-2 py-1"
              >
                {SUPPORTED_LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.nativeName}
                  </option>
                ))}
              </select>
              <span
                className="hidden lg:inline max-w-[140px] truncate text-[12px] text-[#5B5149] border border-transparent px-1"
                title={sessionUser?.name}
              >
                {sessionUser?.name}
              </span>
              <button
                type="button"
                onClick={() => void signOut()}
                className="af-press af-focus hidden lg:inline-flex items-center gap-1.5 rounded-lg border border-[#D9C8AE] bg-white px-2.5 py-1 text-[12px] text-[#5B5149] hover:bg-[#EFE4D1]"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden />
                {t('auth.signOut')}
              </button>
              <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-[#F7F1E6] text-[#5B5149] rounded-full text-[11px] border border-[#D9C8AE]">
                <Smartphone className="w-3 h-3" />
                USSD *123#
              </div>
              <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-[#ECF7EE] text-[#2F6B4F] rounded-full text-[11px] border border-[#CDE4D4]">
                <Shield className="w-3 h-3" />
                AES-256
              </div>
              <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-[#EEF1FA] text-[#3D4C8A] rounded-full text-[11px] border border-[#D2D8EC]">
                <Activity className="w-3 h-3" />
                FHIR R4
              </div>
              <button
                aria-label={t('common.notifications', { defaultValue: 'Notifications' })}
                className="af-tap af-press af-focus relative inline-flex h-11 w-11 items-center justify-center rounded-xl hover:bg-[#EFE4D1] transition-colors"
              >
                <Bell className="w-[18px] h-[18px] text-[#5B5149]" />
                <span className="af-pulse-dot absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-[#A63D32] rounded-full" />
              </button>
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] ${roleAvatar}`}
              >
                {role === 'patient' ? 'AO' : role === 'doctor' ? 'WN' : 'AD'}
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] lg:p-6 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(195,154,61,0.1),_transparent_40%)]">
          <Outlet />
        </main>
        <BottomNav onOpenMore={() => setDrawerOpen(true)} />
      </div>
    </div>
  );
}
