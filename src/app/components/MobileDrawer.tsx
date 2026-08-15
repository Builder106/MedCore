import { clsx } from 'clsx';
import { Activity, Hexagon, LogOut, Shield, Smartphone, Wifi, WifiOff, X } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
import { SUPPORTED_LANGUAGES, useApp } from '../context/AppContext';
import { adminItems, doctorItems, patientItems } from './Sidebar';

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const {
    role,
    lang,
    setLang,
    offlineMode,
    setOfflineMode,
    lowBandwidth,
    setLowBandwidth,
    sessionUser,
    signOut,
  } = useApp();
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const navItems = role === 'doctor' ? doctorItems : role === 'patient' ? patientItems : adminItems;
  const roleTitle =
    role === 'doctor'
      ? t('sidebar.doctorWorkspace')
      : role === 'patient'
        ? t('sidebar.patientPortal')
        : t('sidebar.facilityAdmin');

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
      <button
        type="button"
        aria-label="Close navigation"
        data-testid="mobile-drawer-backdrop"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className="relative z-10 flex h-full w-[86%] max-w-[340px] flex-col bg-[#214838] text-[#F7F1E6] shadow-2xl"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="flex items-start gap-3">
            <div className="bg-[#C39A3D] text-[#1F1B18] p-2.5 rounded-2xl shadow-lg shadow-[#1F1B18]/20">
              <Hexagon className="w-6 h-6 fill-current" />
            </div>
            <div>
              <h1 className="text-[26px] leading-none tracking-tight text-[#F7F1E6]">MedCore</h1>
              <p className="text-[11px] mt-1 uppercase tracking-[0.2em] text-[#DAB776]">
                {roleTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="af-tap af-focus -mr-1 -mt-1 inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#F7F1E6]/80 hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pb-3">
          <div className="rounded-2xl border border-[#3A6A54] bg-[#1B3D30]/75 px-3 py-2 text-[12px] text-[#EFDDBA]">
            {t('sidebar.offlineTagline')}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Drawer navigation">
          <div className="space-y-1">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  clsx(
                    'af-tap af-press af-focus flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] transition-colors',
                    isActive
                      ? 'bg-[#C39A3D]/18 text-[#F7F1E6] border border-[#C39A3D]/55'
                      : 'text-[#F7F1E6]/80 hover:bg-white/8 hover:text-[#F7F1E6]'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={clsx('w-5 h-5', isActive ? 'text-[#DAB776]' : 'text-[#F7F1E6]/75')}
                    />
                    <span>{t(item.labelKey)}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="border-t border-[#315D4A] px-5 py-4 space-y-3 text-[#F7F1E6]/90">
          <p className="text-[13px] font-medium text-[#F7F1E6] truncate" title={sessionUser?.name}>
            {sessionUser?.name}
          </p>

          <label
            htmlFor="drawer-lang"
            className="block text-[11px] uppercase tracking-[0.14em] text-[#DAB776]"
          >
            {t('common.language')}
          </label>
          <select
            id="drawer-lang"
            aria-label={t('common.language')}
            value={lang}
            onChange={e => setLang(e.target.value as typeof lang)}
            className="af-tap af-focus w-full rounded-xl border border-[#3A6A54] bg-[#1B3D30] px-3 py-2 text-[14px] text-[#F7F1E6]"
          >
            {SUPPORTED_LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>
                {l.flag} {l.nativeName}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setLowBandwidth(!lowBandwidth)}
              className={clsx(
                'af-tap af-focus flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[12px]',
                lowBandwidth
                  ? 'bg-[#C39A3D]/20 text-[#F7F1E6] border-[#C39A3D]/60'
                  : 'bg-[#1B3D30] text-[#F7F1E6]/80 border-[#3A6A54]'
              )}
            >
              <Smartphone className="w-3.5 h-3.5" />
              {t('common.lowBandwidth')}
            </button>
            <button
              type="button"
              onClick={() => setOfflineMode(!offlineMode)}
              className={clsx(
                'af-tap af-focus flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[12px]',
                offlineMode
                  ? 'bg-amber-400/20 text-amber-100 border-amber-400/40'
                  : 'bg-[#1B3D30] text-[#F7F1E6]/80 border-[#3A6A54]'
              )}
            >
              {offlineMode ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
              {offlineMode ? t('common.offlineSync') : t('common.onlineSync')}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-full border border-[#3A6A54] bg-[#1B3D30]/75 px-2.5 py-1 text-[#EFDDBA]">
              <Smartphone className="w-3 h-3" /> USSD *123#
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-900/30 px-2.5 py-1 text-emerald-100">
              <Shield className="w-3 h-3" /> AES-256
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-400/30 bg-indigo-900/30 px-2.5 py-1 text-indigo-100">
              <Activity className="w-3 h-3" /> FHIR R4
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              void signOut();
            }}
            className="af-tap af-press af-focus mt-2 flex w-full items-center gap-3 rounded-2xl border border-[#3A6A54] bg-[#1B3D30]/80 px-4 py-3 text-[14px] text-[#F7F1E6]/90 hover:bg-white/5"
          >
            <LogOut className="w-4 h-4" />
            {t('auth.signOut')}
          </button>
        </div>
      </aside>
    </div>
  );
}
