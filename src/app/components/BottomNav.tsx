import { clsx } from 'clsx';
import {
  Barcode,
  Bell,
  FileText,
  HeartPulse,
  Mic,
  MoreHorizontal,
  Pill,
  Stethoscope,
  UserCog,
  Users,
  Video,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
import { useApp } from '../context/AppContext';

type TabItem = {
  to: string;
  labelKey: string;
  icon: ComponentType<{ className?: string }>;
};

const patientTabs: TabItem[] = [
  { to: '/', labelKey: 'nav.dashboard', icon: HeartPulse },
  { to: '/reminders', labelKey: 'reminders.title', icon: Bell },
  { to: '/health-id', labelKey: 'nav.healthId', icon: Barcode },
  { to: '/video-consult', labelKey: 'nav.videoConsult', icon: Video },
];

const doctorTabs: TabItem[] = [
  { to: '/', labelKey: 'nav.dashboard', icon: Stethoscope },
  { to: '/patients', labelKey: 'nav.patients', icon: Users },
  { to: '/prescriptions', labelKey: 'nav.prescriptions', icon: Pill },
  { to: '/voice-consult', labelKey: 'voice.record', icon: Mic },
];

const adminTabs: TabItem[] = [
  { to: '/', labelKey: 'nav.dashboard', icon: UserCog },
  { to: '/staff', labelKey: 'sidebar.staffManagement', icon: Users },
  { to: '/inventory', labelKey: 'sidebar.drugInventory', icon: Pill },
  { to: '/reports', labelKey: 'sidebar.ministryReports', icon: FileText },
];

interface BottomNavProps {
  onOpenMore: () => void;
}

export function BottomNav({ onOpenMore }: BottomNavProps) {
  const { role } = useApp();
  const { t } = useTranslation();
  const tabs = role === 'doctor' ? doctorTabs : role === 'admin' ? adminTabs : patientTabs;

  return (
    <nav
      aria-label="Primary"
      className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-[#D9C8AE] bg-[#F9F5ED]/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-5 items-stretch">
        {tabs.map(tab => (
          <li key={tab.to} className="flex">
            <NavLink
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'af-tap af-focus flex w-full flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] leading-tight',
                  isActive ? 'text-[#214838]' : 'text-[#5B5149]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={clsx(
                      'flex h-6 w-12 items-center justify-center rounded-full transition-colors',
                      isActive ? 'bg-[#C39A3D]/25' : 'bg-transparent'
                    )}
                  >
                    <tab.icon
                      className={clsx('w-5 h-5', isActive ? 'text-[#214838]' : 'text-[#5B5149]')}
                    />
                  </span>
                  <span className="truncate max-w-full">{t(tab.labelKey)}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
        <li className="flex">
          <button
            type="button"
            aria-label="More"
            onClick={onOpenMore}
            className="af-tap af-focus flex w-full flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] leading-tight text-[#5B5149]"
          >
            <span className="flex h-6 w-12 items-center justify-center">
              <MoreHorizontal className="w-5 h-5" />
            </span>
            <span>{t('common.more', { defaultValue: 'More' })}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}

export { adminTabs, doctorTabs, patientTabs };
