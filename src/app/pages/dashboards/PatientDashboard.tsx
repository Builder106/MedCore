import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Clock,
  Heart,
  KeyRound,
  Pill,
  QrCode,
  Shield,
  Smartphone,
  Syringe,
  WifiOff,
} from 'lucide-react';
import { Link } from 'react-router';
import { useApp } from '../../context/AppContext';
import {
  appointments,
  auditLog,
  consentRecords,
  encounters,
  patients,
  prescriptions,
  vaccinations,
} from '../../data/mock-data';

export function PatientDashboard() {
  const { currentPatientId, lowBandwidth } = useApp();
  const patient = patients.find(p => p.id === currentPatientId)!;
  const upcoming = appointments.filter(
    a => a.patientId === currentPatientId && a.status === 'scheduled'
  );
  const activeRx = prescriptions.filter(
    p => p.patientId === currentPatientId && p.status === 'active'
  );
  const recentVisits = encounters.filter(e => e.patientId === currentPatientId).slice(0, 3);
  const overdueVax = vaccinations.filter(
    v => v.patientId === currentPatientId && v.nextDue && new Date(v.nextDue) < new Date()
  );
  const consents = consentRecords.filter(c => c.patientId === currentPatientId);
  const accessLog = auditLog.filter(a => a.patientId === currentPatientId).slice(0, 3);
  const approvedConsents = consents.filter(c => c.granted).length;
  const revokedConsents = consents.filter(c => !c.granted).length;

  const nextAppt = upcoming[0];

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="af-elevate rounded-3xl border border-[#D9C8AE] bg-gradient-to-r from-[#F8F1E6] via-[#F6EFE4] to-[#E7F2EE] p-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-[12px] uppercase tracking-[0.16em] text-[#5B5149]">
              Personal Health Overview
            </p>
            <h1 className="text-[30px] text-[#1F1B18]">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-[13px] text-[#5B5149] mt-1">
              {patient.insuranceScheme} · {patient.phone}
            </p>
          </div>
          <div className="flex items-center gap-2 text-[12px]">
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md border border-blue-100">
              {patient.bloodType}
            </span>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100">
              {patient.insuranceScheme}
            </span>
            <span
              className={`px-2.5 py-1 rounded-md border ${lowBandwidth ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}
            >
              {lowBandwidth ? 'Low-bandwidth mode on' : 'Standard mode'}
            </span>
            {patient.allergies.length > 0 && (
              <span className="px-2.5 py-1 bg-red-50 text-red-600 rounded-md border border-red-100 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {patient.allergies.join(', ')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Alerts banner */}
      {overdueVax.length > 0 && (
        <div className="af-elevate bg-amber-50 border-l-4 border-amber-400 rounded-r-lg px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] text-amber-900">
              Overdue vaccinations require your attention
            </p>
            <p className="text-[12px] text-amber-700 mt-0.5">
              {overdueVax.map(v => `${v.vaccine} (due ${v.nextDue})`).join(' · ')}
            </p>
          </div>
          <Link
            to="/vaccinations"
            className="ml-auto text-[12px] text-amber-700 underline whitespace-nowrap shrink-0"
          >
            View
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="af-elevate bg-white rounded-2xl border border-[#D9C8AE] p-4">
          <h2 className="text-[14px] text-[#1F1B18] uppercase tracking-wider mb-3">
            Scannable Health ID
          </h2>
          <div className="rounded-xl bg-[#F4FAF6] border border-[#CDE4D4] p-4 text-center">
            <div className="w-20 h-20 rounded-lg bg-white border border-[#CDE4D4] mx-auto grid place-items-center">
              <QrCode className="w-9 h-9 text-teal-700" />
            </div>
            <p className="text-[12px] text-[#1F1B18] mt-2">{patient.id}</p>
            <Link to="/health-id" className="text-[12px] text-teal-700 hover:underline">
              Open Health ID
            </Link>
          </div>
        </div>
        <div className="af-elevate bg-white rounded-2xl border border-[#D9C8AE] p-4">
          <h2 className="text-[14px] text-[#1F1B18] uppercase tracking-wider mb-3">
            Health Access Channels
          </h2>
          <div className="space-y-2 text-[12px]">
            <div className="rounded-xl border border-[#EFE4D1] px-3 py-2 flex items-center gap-2 text-[#1F1B18]">
              <Smartphone className="w-4 h-4 text-teal-600" />
              Android app + PWA
            </div>
            <div className="rounded-xl border border-[#EFE4D1] px-3 py-2 flex items-center gap-2 text-[#1F1B18]">
              <WifiOff className="w-4 h-4 text-amber-600" />
              Offline cache with sync
            </div>
            <div className="rounded-xl border border-[#EFE4D1] px-3 py-2 flex items-center gap-2 text-[#1F1B18]">
              <KeyRound className="w-4 h-4 text-violet-600" />
              USSD *123# access
            </div>
          </div>
        </div>
        <div className="af-elevate bg-white rounded-2xl border border-[#D9C8AE] p-4">
          <h2 className="text-[14px] text-[#1F1B18] uppercase tracking-wider mb-3">
            Consent Snapshot
          </h2>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="rounded-xl bg-[#F4FAF6] border border-[#CDE4D4] p-2.5">
              <p className="text-[10px] text-[#2F6B4F] uppercase">Granted</p>
              <p className="text-[18px] text-[#1F1B18]">{approvedConsents}</p>
            </div>
            <div className="rounded-xl bg-[#FCEEEE] border border-[#E7C1BA] p-2.5">
              <p className="text-[10px] text-[#A63D32] uppercase">Revoked</p>
              <p className="text-[18px] text-[#1F1B18]">{revokedConsents}</p>
            </div>
          </div>
          <Link to="/consent" className="text-[12px] text-violet-700 hover:underline">
            Manage permissions
          </Link>
        </div>
      </div>

      {/* Top cards - asymmetric layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Next appointment - prominent */}
        <div className="af-elevate lg:col-span-3 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] text-slate-500 uppercase tracking-wider">
              Next Appointment
            </h2>
            <Link
              to="/appointments"
              className="text-teal-600 text-[12px] flex items-center gap-1 hover:underline"
            >
              All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {nextAppt ? (
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-teal-50 rounded-xl flex flex-col items-center justify-center border border-teal-100 shrink-0">
                <span className="text-[16px] text-teal-700">{nextAppt.date.split('-')[2]}</span>
                <span className="text-[10px] text-teal-500 uppercase">
                  {new Date(nextAppt.date).toLocaleString('en', { month: 'short' })}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] text-slate-900">{nextAppt.type}</p>
                <p className="text-[13px] text-slate-500 mt-1">{nextAppt.doctorName}</p>
                <p className="text-[12px] text-slate-400 mt-0.5">
                  {nextAppt.facilityName} · {nextAppt.time}
                </p>
              </div>
              {nextAppt.estimatedWait && (
                <div className="text-right shrink-0">
                  <p className="text-[20px] text-teal-600">~{nextAppt.estimatedWait}</p>
                  <p className="text-[10px] text-slate-400 uppercase">min wait</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[13px] text-slate-400">No upcoming appointments</p>
          )}
          {upcoming.length > 1 && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              {upcoming.slice(1).map(apt => (
                <div key={apt.id} className="flex items-center gap-3 text-[13px]">
                  <span className="text-slate-400 w-16 shrink-0">{apt.date.slice(5)}</span>
                  <span className="text-slate-700 truncate">{apt.type}</span>
                  <span className="text-slate-400 ml-auto text-[12px] shrink-0">{apt.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-3">
          <div className="af-elevate bg-white rounded-xl border border-slate-200 p-4 flex flex-col">
            <Pill className="w-5 h-5 text-teal-500 mb-3" />
            <p className="text-[24px] text-slate-900">
              {activeRx.flatMap(r => r.medications).length}
            </p>
            <p className="text-[11px] text-slate-400 mt-auto">Active medications</p>
          </div>
          <div className="af-elevate bg-white rounded-xl border border-slate-200 p-4 flex flex-col">
            <Clock className="w-5 h-5 text-slate-400 mb-3" />
            <p className="text-[24px] text-slate-900">{recentVisits.length}</p>
            <p className="text-[11px] text-slate-400 mt-auto">Recent visits</p>
          </div>
          <div className="af-elevate bg-white rounded-xl border border-slate-200 p-4 flex flex-col">
            <Calendar className="w-5 h-5 text-blue-500 mb-3" />
            <p className="text-[24px] text-slate-900">{upcoming.length}</p>
            <p className="text-[11px] text-slate-400 mt-auto">Upcoming appts</p>
          </div>
          <div
            className={`af-elevate rounded-xl border p-4 flex flex-col ${overdueVax.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}
          >
            <Syringe
              className={`w-5 h-5 mb-3 ${overdueVax.length > 0 ? 'text-red-500' : 'text-emerald-500'}`}
            />
            <p
              className={`text-[24px] ${overdueVax.length > 0 ? 'text-red-700' : 'text-slate-900'}`}
            >
              {overdueVax.length}
            </p>
            <p
              className={`text-[11px] mt-auto ${overdueVax.length > 0 ? 'text-red-500' : 'text-slate-400'}`}
            >
              Overdue vaccines
            </p>
          </div>
        </div>
      </div>

      {/* Recent Visits timeline */}
      <div className="af-elevate bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] text-slate-500 uppercase tracking-wider">Recent Visits</h2>
          <Link
            to="/records"
            className="text-teal-600 text-[12px] flex items-center gap-1 hover:underline"
          >
            Full history <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="space-y-0">
          {recentVisits.map((enc, idx) => (
            <div
              key={enc.id}
              className={`flex gap-4 py-3 ${idx < recentVisits.length - 1 ? 'border-b border-slate-100' : ''}`}
            >
              <div className="w-16 shrink-0 text-right">
                <p className="text-[13px] text-slate-700">{enc.date.slice(5)}</p>
                <p className="text-[10px] text-slate-400">{enc.date.slice(0, 4)}</p>
              </div>
              <div
                className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${enc.type === 'emergency' ? 'bg-red-500' : enc.type === 'lab' ? 'bg-blue-500' : 'bg-teal-500'}`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[14px] text-slate-900">{enc.diagnosis}</p>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${enc.type === 'emergency' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {enc.type}
                  </span>
                </div>
                <p className="text-[12px] text-slate-500 mt-0.5">
                  {enc.doctorName} · {enc.facilityName}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="af-elevate bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] text-slate-500 uppercase tracking-wider">
            Recent Access Activity
          </h2>
          <Link to="/audit-log" className="text-violet-700 text-[12px] hover:underline">
            Open audit log
          </Link>
        </div>
        <div className="space-y-2">
          {accessLog.map(entry => (
            <div key={entry.id} className="rounded-lg border border-slate-100 px-3 py-2">
              <p className="text-[13px] text-slate-800">
                {entry.accessedBy} · {entry.action}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {entry.section} · {new Date(entry.timestamp).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Active Medications */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] text-slate-500 uppercase tracking-wider">
            Active Medications
          </h2>
          <Link
            to="/prescriptions"
            className="text-teal-600 text-[12px] flex items-center gap-1 hover:underline"
          >
            All prescriptions <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeRx.flatMap(rx =>
            rx.medications.map((med, i) => (
              <div
                key={`${rx.id}-${i}`}
                className="p-3 rounded-lg border border-slate-100 hover:border-teal-200 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-teal-400 rounded-full" />
                  <p className="text-[14px] text-slate-900">{med.name}</p>
                </div>
                <p className="text-[13px] text-slate-500 pl-4">
                  {med.dosage} · {med.frequency}
                </p>
                <p className="text-[11px] text-slate-400 pl-4 mt-0.5">{med.duration}</p>
                {med.interactions && med.interactions.length > 0 && (
                  <p className="text-[11px] text-amber-600 mt-2 pl-4 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {med.interactions[0]}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            to: '/health-id',
            label: 'Health ID',
            icon: Heart,
            color: 'text-teal-600 bg-teal-50 border-teal-100',
          },
          {
            to: '/consent',
            label: 'Privacy',
            icon: Shield,
            color: 'text-slate-600 bg-slate-50 border-slate-200',
          },
          {
            to: '/vaccinations',
            label: 'Vaccines',
            icon: Syringe,
            color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
          },
          {
            to: '/lab-results',
            label: 'Lab Results',
            icon: Clock,
            color: 'text-blue-600 bg-blue-50 border-blue-100',
          },
        ].map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={`flex items-center gap-3 p-3 rounded-xl border ${link.color} hover:shadow-sm transition-shadow`}
          >
            <link.icon className="w-5 h-5" />
            <span className="text-[13px]">{link.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
