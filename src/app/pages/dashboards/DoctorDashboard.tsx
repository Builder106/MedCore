import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  Bot,
  CalendarClock,
  ClipboardList,
  Clock3,
  QrCode,
  Search,
  Shield,
  Sparkles,
  Stethoscope,
  Syringe,
  TestTube2,
  TriangleAlert,
  UserRoundSearch,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  appointments as mockAppointments,
  encounters as mockEncounters,
  labResults as mockLabResults,
  patients as mockPatients,
  referrals as mockReferrals,
  vaccinations as mockVaccinations,
} from '../../data/mock-data';
import {
  listAppointments,
  listCriticalLabs,
  listOverdueVaccinations,
  listPatients,
  listRecentEncounters,
  listReferrals,
  type Appointment,
  type Encounter,
  type Patient,
  type Referral,
} from '../../services/api';

interface DisplayAppt {
  id: string;
  patientId: string;
  time: string;
  type: string;
  estimatedWait: number;
}
interface DisplayRef {
  id: string;
  patientId: string;
  reason: string;
  urgency: string;
  toFacility: string;
}

function apptToDisplay(a: Appointment): DisplayAppt {
  const d = new Date(a.scheduledFor);
  return {
    id: a.id,
    patientId: a.patientId,
    time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type: a.reason ?? 'Consultation',
    estimatedWait: 0,
  };
}

function refToDisplay(r: Referral): DisplayRef {
  return {
    id: r.id,
    patientId: r.patientId,
    reason: r.reason,
    urgency: r.urgency,
    toFacility: r.toFacility ?? '—',
  };
}

export function DoctorDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appts, setAppts] = useState<DisplayAppt[]>([]);
  const [refs, setRefs] = useState<DisplayRef[]>([]);
  const [criticalLabCount, setCriticalLabCount] = useState(0);
  const [overdueVaxCount, setOverdueVaxCount] = useState(0);
  const [timeline, setTimeline] = useState<Encounter[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pl, al, rl, cl, ov, tl] = await Promise.all([
          listPatients(),
          listAppointments(),
          listReferrals(),
          listCriticalLabs(),
          listOverdueVaccinations(),
          listRecentEncounters(5),
        ]);
        if (cancelled) return;
        setPatients(pl.patients);
        setAppts(al.appointments.filter(a => a.status === 'scheduled').map(apptToDisplay));
        setRefs(rl.referrals.map(refToDisplay));
        setCriticalLabCount(cl.labs.length);
        setOverdueVaxCount(ov.vaccinations.length);
        setTimeline(tl.encounters);
      } catch {
        if (cancelled) return;
        setPatients(
          mockPatients.map(p => ({
            id: p.id,
            firstName: p.firstName,
            lastName: p.lastName,
            dob: p.dob,
            phone: p.phone,
            nationalId: p.nationalId,
            bloodType: p.bloodType,
            allergies: p.allergies,
            insuranceScheme: p.insuranceScheme,
            createdAt: 0,
          }))
        );
        setAppts(
          mockAppointments
            .filter(a => a.status === 'scheduled')
            .map(a => ({
              id: a.id,
              patientId: a.patientId,
              time: a.time,
              type: a.type,
              estimatedWait: a.estimatedWait ?? 0,
            }))
        );
        setRefs(
          mockReferrals
            .filter(r => r.status === 'pending')
            .map(r => ({
              id: r.id,
              patientId: r.patientId,
              reason: r.reason,
              urgency: r.urgency,
              toFacility: r.toFacility,
            }))
        );
        setCriticalLabCount(mockLabResults.filter(r => r.status === 'critical').length);
        setOverdueVaxCount(
          mockVaccinations.filter(v => v.nextDue && new Date(v.nextDue) < new Date()).length
        );
        setTimeline(
          mockEncounters
            .slice()
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 5)
            .map(e => ({
              id: e.id,
              patientId: e.patientId,
              doctorId: '',
              encounterDate: new Date(e.date).getTime(),
              type: e.type as Encounter['type'],
              diagnosis: e.diagnosis,
              notes: e.notes,
              createdAt: 0,
            }))
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pendingRefs = refs.filter(r => r.urgency !== 'routine');
  const highRiskSignals = [
    `${criticalLabCount} critical lab result${criticalLabCount === 1 ? '' : 's'} require callback`,
    `${refs.length} referral${refs.length === 1 ? '' : 's'} awaiting acceptance`,
    `${overdueVaxCount} overdue vaccination follow-up${overdueVaxCount === 1 ? '' : 's'}`,
  ];

  const searchResults =
    searchQuery.length > 1
      ? patients.filter(p =>
          `${p.firstName} ${p.lastName} ${p.phone} ${p.nationalId} ${p.id}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
        )
      : [];

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="af-elevate rounded-3xl border border-[#D9C8AE] bg-gradient-to-r from-[#F8F1E6] via-[#F5E9D8] to-[#EDE7D7] p-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <p className="text-[12px] uppercase tracking-[0.16em] text-[#5B5149]">
              Clinical Priorities
            </p>
            <h1 className="text-[30px] text-[#1F1B18]">Dr. Wanjiku Njeri</h1>
            <p className="text-[14px] text-[#5B5149] mt-1">
              Internal Medicine · Kenyatta National Hospital
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="af-elevate rounded-2xl bg-white border border-[#D9C8AE] px-3 py-2">
              <p className="text-[11px] text-[#5B5149] uppercase">Queue</p>
              <p className="text-[21px] text-[#1F1B18]">{appts.length}</p>
            </div>
            <div className="af-elevate rounded-2xl bg-white border border-[#D9C8AE] px-3 py-2">
              <p className="text-[11px] text-[#5B5149] uppercase">Critical Labs</p>
              <p className="text-[21px] text-[#A63D32]">{criticalLabCount}</p>
            </div>
            <div className="af-elevate rounded-2xl bg-white border border-[#D9C8AE] px-3 py-2">
              <p className="text-[11px] text-[#5B5149] uppercase">Referrals</p>
              <p className="text-[21px] text-[#3D4C8A]">{refs.length}</p>
            </div>
            <div className="af-elevate rounded-2xl bg-white border border-[#D9C8AE] px-3 py-2">
              <p className="text-[11px] text-[#5B5149] uppercase">AI Flags</p>
              <p className="text-[21px] text-[#B85C38]">{highRiskSignals.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">
          <div className="af-elevate bg-white rounded-2xl border border-[#D9C8AE] p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <h2 className="text-[15px] text-[#1F1B18] flex items-center gap-2">
                <UserRoundSearch className="w-4 h-4 text-teal-600" />
                Patient Lookup
              </h2>
              <div className="flex items-center gap-2">
                <button className="af-elevate af-press af-focus flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-[13px]">
                  <QrCode className="w-4 h-4" />
                  Scan QR
                </button>
                <Link
                  to="/ai-assistant"
                  className="af-elevate af-press af-focus flex items-center gap-2 px-3 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-[13px] border border-amber-200"
                >
                  <Bot className="w-4 h-4" />
                  AI Assistant
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="flex items-center gap-2 bg-[#F9F5ED] border border-[#D9C8AE] rounded-xl px-4 py-3 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-200 transition-all">
                <Search className="w-5 h-5 text-[#5B5149]" />
                <input
                  type="text"
                  placeholder="Search by name, phone, national ID…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="af-focus flex-1 bg-transparent outline-none text-[14px]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-[12px] text-[#5B5149] hover:text-[#1F1B18]"
                  >
                    Clear
                  </button>
                )}
              </div>
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#D9C8AE] rounded-xl shadow-lg z-20 overflow-hidden">
                  {searchResults.map(p => (
                    <Link
                      key={p.id}
                      to={`/patients/${p.id}`}
                      className="af-elevate flex items-center gap-3 px-4 py-3 hover:bg-[#F7F1E6] border-b border-[#EFE4D1] last:border-0"
                    >
                      <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center text-violet-700 text-[12px]">
                        {p.firstName[0]}
                        {p.lastName[0]}
                      </div>
                      <div className="flex-1">
                        <p className="text-[14px]">
                          {p.firstName} {p.lastName}
                        </p>
                        <p className="text-[11px] text-[#5B5149]">
                          {p.id} · {p.phone}
                        </p>
                      </div>
                      {p.allergies.length > 0 && (
                        <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-100">
                          {p.allergies[0]}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="af-elevate bg-white rounded-2xl border border-[#D9C8AE]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#EFE4D1]">
              <h2 className="text-[14px] text-[#1F1B18] uppercase tracking-wider flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-violet-600" />
                Appointment Queue
              </h2>
              <Link
                to="/appointments"
                className="text-violet-700 text-[12px] flex items-center gap-1 hover:underline"
              >
                Full schedule <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-[#EFE4D1]">
              {appts.slice(0, 6).map((apt, i) => {
                const patient = patients.find(p => p.id === apt.patientId);
                const isNext = i === 0;
                return (
                  <div
                    key={apt.id}
                    className={`af-elevate flex items-center gap-4 px-5 py-3 ${isNext ? 'bg-violet-50/60' : 'hover:bg-[#F7F1E6]/60'} transition-colors`}
                  >
                    <div className="w-20 text-[12px] text-[#5B5149] shrink-0">{apt.time}</div>
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] shrink-0 ${isNext ? 'bg-violet-600 text-white' : 'bg-[#EFE4D1] text-[#5B5149]'}`}
                    >
                      {patient ? `${patient.firstName[0]}${patient.lastName[0]}` : '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/patients/${apt.patientId}`}
                        className="text-[14px] text-violet-700 hover:underline"
                      >
                        {patient ? `${patient.firstName} ${patient.lastName}` : apt.patientId}
                      </Link>
                      <p className="text-[12px] text-[#5B5149]">{apt.type}</p>
                    </div>
                    <div className="flex items-center gap-1 text-[12px] text-[#5B5149] shrink-0">
                      <Clock3 className="w-3 h-3" /> ~{apt.estimatedWait}m
                    </div>
                    {isNext ? (
                      <span className="text-[11px] bg-violet-600 text-white px-2.5 py-1 rounded-full shrink-0">
                        Next
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#5B5149] bg-[#EFE4D1] px-2.5 py-1 rounded-full shrink-0">
                        Waiting
                      </span>
                    )}
                  </div>
                );
              })}
              {appts.length === 0 && (
                <p className="px-5 py-4 text-[13px] text-[#5B5149]">No appointments scheduled.</p>
              )}
            </div>
          </div>

          <div className="af-elevate bg-white rounded-2xl border border-[#D9C8AE] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] text-[#1F1B18] uppercase tracking-wider flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-teal-600" />
                Unified Timeline
              </h2>
              <Link to="/records" className="text-teal-700 text-[12px] hover:underline">
                Open full timeline
              </Link>
            </div>
            <div className="space-y-3">
              {timeline.map(item => (
                <div
                  key={item.id}
                  className="af-elevate rounded-xl border border-[#EFE4D1] px-3 py-2 bg-[#FCFAF6]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] text-[#1F1B18]">
                      {item.diagnosis ?? item.chiefComplaint ?? '—'}
                    </p>
                    <span className="text-[10px] uppercase tracking-wide text-[#5B5149]">
                      {item.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5B5149] mt-1">
                    {item.patientId} · {new Date(item.encounterDate).toISOString().slice(0, 10)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="af-elevate bg-[#FFF6E7] rounded-2xl border border-amber-200 p-4">
            <h3 className="text-[14px] text-amber-800 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Advisory
            </h3>
            <p className="text-[12px] text-amber-700 mt-2">
              Advisory only. Verify with clinical judgement before acting.
            </p>
            <div className="mt-3 space-y-2">
              {highRiskSignals.map(signal => (
                <div
                  key={signal}
                  className="af-elevate flex gap-2 text-[12px] text-amber-900 bg-white/75 border border-amber-200 rounded-lg px-2.5 py-2"
                >
                  <TriangleAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{signal}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="af-elevate bg-white rounded-2xl border border-[#D9C8AE] p-4">
            <h3 className="text-[14px] text-[#1F1B18] uppercase tracking-wider flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-violet-600" />
              Referral Tracker
            </h3>
            <div className="mt-3 space-y-2">
              {pendingRefs.slice(0, 4).map(ref => {
                const p = patients.find(pt => pt.id === ref.patientId);
                return (
                  <div
                    key={ref.id}
                    className="af-elevate rounded-xl border border-[#EFE4D1] p-3 bg-[#FDFBF6]"
                  >
                    <p className="text-[13px] text-[#1F1B18]">
                      {p ? `${p.firstName} ${p.lastName}` : ref.patientId}
                    </p>
                    <p className="text-[11px] text-[#5B5149] mt-1">{ref.reason}</p>
                    <div className="mt-2 flex items-center justify-between text-[10px]">
                      <span
                        className={`px-2 py-0.5 rounded-full ${ref.urgency === 'emergency' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}
                      >
                        {ref.urgency}
                      </span>
                      <span className="text-[#5B5149]">{ref.toFacility}</span>
                    </div>
                  </div>
                );
              })}
              {pendingRefs.length === 0 && (
                <p className="text-[12px] text-[#5B5149]">No urgent referrals.</p>
              )}
            </div>
          </div>

          <div className="af-elevate bg-white rounded-2xl border border-[#D9C8AE] p-4">
            <h3 className="text-[14px] text-[#1F1B18] uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-teal-700" />
              Safety Checklist
            </h3>
            <div className="mt-3 space-y-2 text-[12px]">
              <div className="flex items-center gap-2 text-[#1F1B18]">
                <Stethoscope className="w-3.5 h-3.5 text-teal-600" /> Verify allergies before
                prescribing
              </div>
              <div className="flex items-center gap-2 text-[#1F1B18]">
                <TestTube2 className="w-3.5 h-3.5 text-violet-600" /> Review latest critical labs
              </div>
              <div className="flex items-center gap-2 text-[#1F1B18]">
                <Syringe className="w-3.5 h-3.5 text-emerald-600" /> Check overdue
                screenings/vaccines
              </div>
              <div className="flex items-center gap-2 text-[#1F1B18]">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Confirm referral urgency tier
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-[11px]">
        <span className="px-2.5 py-1 rounded-full bg-teal-100 text-teal-700 border border-teal-200">
          Patient actions
        </span>
        <span className="px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
          Clinical tools
        </span>
        <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
          AI suggestions
        </span>
      </div>
    </div>
  );
}
