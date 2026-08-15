import { clsx } from 'clsx';
import {
  Activity,
  Barcode,
  Bell,
  CalendarCheck2,
  FileText,
  HeartPulse,
  Hexagon,
  KeyRound,
  LogOut,
  MessageSquare,
  Mic,
  Pill,
  Shield,
  Sparkles,
  Stethoscope,
  Syringe,
  TestTube2,
  UserCog,
  Users,
  Video,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
import { useApp } from '../context/AppContext';

function SidePattern() {
  return (
    <div className="absolute inset-0 pointer-events-none opacity-20">
      <svg width="100%" height="100%">
        <defs>
          <pattern id="medcore-side-grid" width="56" height="56" patternUnits="userSpaceOnUse">
            <path
              d="M0 28 L28 0 L56 28 L28 56 Z"
              fill="none"
              stroke="rgba(195,154,61,0.24)"
              strokeWidth="1.2"
            />
            <path
              d="M0 12 H56 M0 44 H56 M12 0 V56 M44 0 V56"
              stroke="rgba(247,241,230,0.06)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#medcore-side-grid)" />
      </svg>
    </div>
  );
}

export type NavItem = {
  to: string;
  labelKey: string;
  icon: ComponentType<{ className?: string }>;
};

export const doctorItems: NavItem[] = [
  { to: '/', labelKey: 'sidebar.clinicalHub', icon: Stethoscope },
  { to: '/patients', labelKey: 'sidebar.patientSearch', icon: Users },
  { to: '/appointments', labelKey: 'sidebar.queueAppointments', icon: CalendarCheck2 },
  { to: '/records', labelKey: 'sidebar.unifiedTimeline', icon: Activity },
  { to: '/prescriptions', labelKey: 'sidebar.prescriptionWriter', icon: Pill },
  { to: '/reminders', labelKey: 'reminders.title', icon: Bell },
  { to: '/lab-results', labelKey: 'sidebar.labSignals', icon: TestTube2 },
  { to: '/referrals', labelKey: 'nav.referrals', icon: HeartPulse },
  { to: '/video-consult', labelKey: 'sidebar.videoConsult', icon: Video },
  { to: '/voice-consult', labelKey: 'voice.record', icon: Mic },
  { to: '/sms-inbox', labelKey: 'sidebar.smsInbox', icon: MessageSquare },
  { to: '/ai-assistant', labelKey: 'sidebar.aiClinicalAssistant', icon: Sparkles },
];

export const patientItems: NavItem[] = [
  { to: '/', labelKey: 'sidebar.myHealthHub', icon: HeartPulse },
  { to: '/health-id', labelKey: 'sidebar.scannableHealthId', icon: Barcode },
  { to: '/records', labelKey: 'sidebar.medicalHistory', icon: FileText },
  { to: '/prescriptions', labelKey: 'nav.prescriptions', icon: Pill },
  { to: '/reminders', labelKey: 'reminders.title', icon: Bell },
  { to: '/appointments', labelKey: 'nav.appointments', icon: CalendarCheck2 },
  { to: '/video-consult', labelKey: 'sidebar.videoConsult', icon: Video },
  { to: '/vaccinations', labelKey: 'nav.vaccinations', icon: Syringe },
  { to: '/consent', labelKey: 'nav.consent', icon: KeyRound },
  { to: '/audit-log', labelKey: 'sidebar.recordAccessLog', icon: Shield },
];

export const adminItems: NavItem[] = [
  { to: '/', labelKey: 'sidebar.facilityCommand', icon: UserCog },
  { to: '/staff', labelKey: 'sidebar.staffManagement', icon: Users },
  { to: '/inventory', labelKey: 'sidebar.drugInventory', icon: Pill },
  { to: '/reports', labelKey: 'sidebar.ministryReports', icon: FileText },
  { to: '/sms-inbox', labelKey: 'sidebar.smsInbox', icon: MessageSquare },
  { to: '/audit-log', labelKey: 'sidebar.securityAudit', icon: Shield },
  { to: '/lab-results', labelKey: 'sidebar.labIntegrations', icon: TestTube2 },
];

export function Sidebar() {
  const { role } = useApp();
  const { t } = useTranslation();
  const roleTitle =
    role === 'doctor'
      ? t('sidebar.doctorWorkspace')
      : role === 'patient'
        ? t('sidebar.patientPortal')
        : t('sidebar.facilityAdmin');
  const navItems = role === 'doctor' ? doctorItems : role === 'patient' ? patientItems : adminItems;

  return (
    <aside className="w-76 bg-[#214838] text-[#F7F1E6] hidden lg:flex flex-col relative min-h-screen self-stretch z-20 flex-shrink-0 border-r border-[#315D4A]">
      <SidePattern />
      <div className="relative z-10 px-6 pt-6 pb-4">
        <div className="flex items-start gap-3">
          <div className="bg-[#C39A3D] text-[#1F1B18] p-2.5 rounded-2xl shadow-lg shadow-[#1F1B18]/20">
            <Hexagon className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h1 className="text-[28px] leading-none tracking-tight text-[#F7F1E6]">MedCore</h1>
            <p className="text-[11px] mt-1 uppercase tracking-[0.2em] text-[#DAB776]">
              {roleTitle}
            </p>
          </div>
        </div>
      </div>
      <div className="relative z-10 px-6 pb-4">
        <div className="rounded-2xl border border-[#3A6A54] bg-[#1B3D30]/75 px-3 py-2 text-[12px] text-[#EFDDBA]">
          {t('sidebar.offlineTagline')}
        </div>
      </div>
      <nav className="relative z-10 flex-1 px-4 pb-6 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'af-elevate af-press af-focus w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-[14px]',
                  isActive
                    ? 'bg-[#C39A3D]/18 text-[#F7F1E6] border border-[#C39A3D]/55 shadow-[0_10px_20px_-16px_rgba(195,154,61,0.9)]'
                    : 'text-[#F7F1E6]/78 hover:bg-[#F7F1E6]/8 hover:text-[#F7F1E6]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={clsx(
                      'w-4.5 h-4.5',
                      isActive ? 'text-[#DAB776]' : 'text-[#F7F1E6]/75'
                    )}
                  />
                  <span>{t(item.labelKey)}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
      <div className="relative z-10 p-4 border-t border-[#315D4A]">
        <button className="af-elevate af-press af-focus w-full flex items-center gap-3 px-4 py-3 text-[14px] text-[#F7F1E6]/80 hover:bg-[#F7F1E6]/8 hover:text-[#F7F1E6] rounded-2xl transition-colors">
          <LogOut className="w-4.5 h-4.5" />
          {t('sidebar.signOut')}
        </button>
      </div>
    </aside>
  );
}
