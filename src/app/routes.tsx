import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { RequireAuth } from './components/RequireAuth';
import { AiAssistantPage } from './pages/AiAssistantPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { ConsentPage } from './pages/ConsentPage';
import { DashboardPage } from './pages/DashboardPage';
import { HealthIdPage } from './pages/HealthIdPage';
import { InventoryPage } from './pages/InventoryPage';
import { LabResultsPage } from './pages/LabResultsPage';
import { LoginPage } from './pages/LoginPage';
import { PatientDetailPage } from './pages/PatientDetailPage';
import { PatientsListPage } from './pages/PatientsListPage';
import { PrescriptionsPage } from './pages/PrescriptionsPage';
import { RecordsPage } from './pages/RecordsPage';
import { ReferralsPage } from './pages/ReferralsPage';
import { RemindersPage } from './pages/RemindersPage';
import { ReportsPage } from './pages/ReportsPage';
import { SmsInboxPage } from './pages/SmsInboxPage';
import { StaffPage } from './pages/StaffPage';
import { VaccinationsPage } from './pages/VaccinationsPage';
import { VideoConsultPage } from './pages/VideoConsultPage';
import { VoiceConsultPage } from './pages/VoiceConsultPage';

export const router = createBrowserRouter([
  { path: '/login', Component: LoginPage },
  {
    path: '/',
    Component: RequireAuth,
    children: [
      {
        Component: Layout,
        children: [
          { index: true, Component: DashboardPage },
          { path: 'health-id', Component: HealthIdPage },
          { path: 'records', Component: RecordsPage },
          { path: 'patients', Component: PatientsListPage },
          { path: 'patients/:id', Component: PatientDetailPage },
          { path: 'appointments', Component: AppointmentsPage },
          { path: 'prescriptions', Component: PrescriptionsPage },
          { path: 'lab-results', Component: LabResultsPage },
          { path: 'vaccinations', Component: VaccinationsPage },
          { path: 'consent', Component: ConsentPage },
          { path: 'ai-assistant', Component: AiAssistantPage },
          { path: 'referrals', Component: ReferralsPage },
          { path: 'audit-log', Component: AuditLogPage },
          { path: 'inventory', Component: InventoryPage },
          { path: 'staff', Component: StaffPage },
          { path: 'reports', Component: ReportsPage },
          { path: 'sms-inbox', Component: SmsInboxPage },
          { path: 'video-consult', Component: VideoConsultPage },
          { path: 'reminders', Component: RemindersPage },
          { path: 'voice-consult', Component: VoiceConsultPage },
          {
            path: '*',
            Component: () => <div className="text-center py-12 text-gray-500">Page not found</div>,
          },
        ],
      },
    ],
  },
]);
