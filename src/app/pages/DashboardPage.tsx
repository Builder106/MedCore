import { useApp } from '../context/AppContext';
import { AdminDashboard } from './dashboards/AdminDashboard';
import { DoctorDashboard } from './dashboards/DoctorDashboard';
import { PatientDashboard } from './dashboards/PatientDashboard';

export function DashboardPage() {
  const { role } = useApp();
  if (role === 'patient') return <PatientDashboard />;
  if (role === 'doctor') return <DoctorDashboard />;
  return <AdminDashboard />;
}
