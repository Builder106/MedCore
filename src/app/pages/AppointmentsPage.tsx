import { Calendar, Clock, MapPin, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { appointments as mockAppointments, patients as mockPatients } from '../data/mock-data';
import { listAppointments, listPatientAppointments, type Appointment } from '../services/api';

interface Row {
  id: string;
  patientId: string;
  type: string;
  status: string;
  date: string;
  time: string;
  facilityName: string;
  doctorName: string;
  estimatedWait?: number;
}

function mapAppointment(a: Appointment): Row {
  const d = new Date(a.scheduledFor);
  return {
    id: a.id,
    patientId: a.patientId,
    type: a.reason ?? 'Consultation',
    status:
      a.status === 'no_show' ? 'cancelled' : a.status === 'checked_in' ? 'scheduled' : a.status,
    date: d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
    facilityName: a.facilityId ?? 'MedCore Clinic',
    doctorName: a.doctorId,
  };
}

export function AppointmentsPage() {
  const { role, currentPatientId, currentUserId } = useApp();
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'completed'>('all');
  const [rows, setRows] = useState<Row[]>([]);
  const [apiOk, setApiOk] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res =
          role === 'patient'
            ? await listPatientAppointments(currentPatientId)
            : await listAppointments({ doctorId: role === 'doctor' ? currentUserId : undefined });
        if (cancelled) return;
        setRows(res.appointments.map(mapAppointment));
        setApiOk(true);
      } catch {
        if (cancelled) return;
        setApiOk(false);
        const fallback = (
          role === 'patient'
            ? mockAppointments.filter(a => a.patientId === currentPatientId)
            : mockAppointments
        ).map(a => ({
          id: a.id,
          patientId: a.patientId,
          type: a.type,
          status: a.status,
          date: a.date,
          time: a.time,
          facilityName: a.facilityName,
          doctorName: a.doctorName,
          estimatedWait: a.estimatedWait,
        }));
        setRows(fallback);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role, currentPatientId, currentUserId]);

  const filtered = filter === 'all' ? rows : rows.filter(a => a.status === filter);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] text-slate-900">Appointments</h1>
        <button
          className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors text-[14px] ${role === 'patient' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-purple-600 hover:bg-purple-700'}`}
        >
          <Plus className="w-4 h-4" /> Book Appointment
        </button>
      </div>

      {!apiOk && (
        <div className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          API unreachable — showing legacy demo data.
        </div>
      )}

      <div className="flex gap-2">
        {(['all', 'scheduled', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-[13px] capitalize transition-colors ${filter === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading && <p className="text-[13px] text-gray-500">Loading appointments…</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-[13px] text-gray-500">No appointments.</p>
        )}
        {filtered.map(apt => {
          const patient = mockPatients.find(p => p.id === apt.patientId);
          return (
            <div
              key={apt.id}
              className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${apt.status === 'completed' ? 'bg-green-100' : apt.status === 'cancelled' ? 'bg-red-100' : 'bg-blue-100'}`}
              >
                <Calendar
                  className={`w-5 h-5 ${apt.status === 'completed' ? 'text-green-600' : apt.status === 'cancelled' ? 'text-red-600' : 'text-blue-600'}`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px]">{apt.type}</h3>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full ${apt.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : apt.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {apt.status}
                  </span>
                </div>
                {role !== 'patient' && patient && (
                  <p className="text-[13px] text-gray-600">
                    {patient.firstName} {patient.lastName} ({patient.id})
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-1 text-[12px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {apt.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {apt.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {apt.facilityName}
                  </span>
                </div>
                <p className="text-[12px] text-gray-500 mt-1">{apt.doctorName}</p>
              </div>
              {apt.estimatedWait && apt.status === 'scheduled' && (
                <div className="text-right">
                  <p className="text-[12px] text-gray-500">Est. wait</p>
                  <p className="text-[16px] text-amber-600">~{apt.estimatedWait} min</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
