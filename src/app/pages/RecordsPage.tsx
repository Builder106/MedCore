import { Clock, FlaskConical, Pill, Syringe } from 'lucide-react';
import type { ComponentType } from 'react';
import { useEffect, useState } from 'react';
import { ResponsiveTable, type TableColumn } from '../components/ui/responsive-table';
import { useApp } from '../context/AppContext';
import {
  encounters as mockEncounters,
  labResults as mockLabs,
  prescriptions as mockPrescriptions,
  vaccinations as mockVax,
} from '../data/mock-data';
import { listEncounters, listLabs, listPrescriptions, listVaccinations } from '../services/api';

type Tab = 'timeline' | 'prescriptions' | 'labs' | 'vaccinations';

interface DisplayEncounter {
  id: string;
  type: string;
  date: string;
  facilityName: string;
  diagnosis: string;
  notes: string;
  doctorName: string;
}
interface DisplayRx {
  id: string;
  status: string;
  date: string;
  doctorName: string;
  medications: { name: string; dosage: string; frequency: string; duration: string }[];
}
interface DisplayLab {
  id: string;
  date: string;
  testName: string;
  result: string;
  referenceRange?: string;
  status: string;
}
interface DisplayVax {
  id: string;
  vaccine: string;
  dose: string;
  date: string;
  site?: string;
  nextDue?: string;
}

export function RecordsPage() {
  const { currentPatientId } = useApp();
  const [encounters, setEncounters] = useState<DisplayEncounter[]>([]);
  const [prescriptions, setPrescriptions] = useState<DisplayRx[]>([]);
  const [labs, setLabs] = useState<DisplayLab[]>([]);
  const [vaccinations, setVaccinations] = useState<DisplayVax[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('timeline');

  useEffect(() => {
    if (!currentPatientId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [enc, rx, lb, vx] = await Promise.all([
          listEncounters(currentPatientId),
          listPrescriptions(currentPatientId),
          listLabs(currentPatientId),
          listVaccinations(currentPatientId),
        ]);
        if (cancelled) return;
        setEncounters(
          enc.encounters
            .map(e => ({
              id: e.id,
              type: e.type,
              date: new Date(e.encounterDate).toISOString().slice(0, 10),
              facilityName: 'MedCore Clinic',
              diagnosis: e.diagnosis ?? e.chiefComplaint ?? '—',
              notes: e.notes ?? '',
              doctorName: e.doctorId,
            }))
            .sort((a, b) => b.date.localeCompare(a.date))
        );
        setPrescriptions(
          rx.prescriptions.map(r => ({
            id: r.id,
            status: r.status,
            date: new Date(r.createdAt).toISOString().slice(0, 10),
            doctorName: r.doctorId,
            medications: [
              {
                name: r.drugName,
                dosage: r.dosage,
                frequency: r.frequency,
                duration: r.duration ?? '',
              },
            ],
          }))
        );
        setLabs(
          lb.labs.map(l => ({
            id: l.id,
            date: new Date(l.collectedAt).toISOString().slice(0, 10),
            testName: l.testName,
            result: `${l.value}${l.unit ? ' ' + l.unit : ''}`,
            referenceRange: l.referenceRange ?? undefined,
            status: l.status,
          }))
        );
        setVaccinations(
          vx.vaccinations.map(v => ({
            id: v.id,
            vaccine: v.vaccineName,
            dose: `Dose ${v.doseNumber}`,
            date: new Date(v.administeredAt).toISOString().slice(0, 10),
            site: v.site ?? undefined,
            nextDue: v.nextDueAt ? new Date(v.nextDueAt).toISOString().slice(0, 10) : undefined,
          }))
        );
      } catch {
        if (cancelled) return;
        setEncounters(
          mockEncounters
            .filter(e => e.patientId === currentPatientId)
            .sort((a, b) => b.date.localeCompare(a.date))
        );
        setPrescriptions(
          mockPrescriptions
            .filter(r => r.patientId === currentPatientId)
            .map(r => ({
              id: r.id,
              status: r.status,
              date: r.date,
              doctorName: r.doctorName,
              medications: r.medications,
            }))
        );
        setLabs(
          mockLabs
            .filter(l => l.patientId === currentPatientId)
            .map(l => ({
              id: l.id,
              date: l.date,
              testName: l.testName,
              result: l.result,
              referenceRange: l.referenceRange,
              status: l.status,
            }))
        );
        setVaccinations(
          mockVax
            .filter(v => v.patientId === currentPatientId)
            .map(v => ({
              id: v.id,
              vaccine: v.vaccine,
              dose: v.dose,
              date: v.date,
              site: v.site,
              nextDue: v.nextDue,
            }))
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentPatientId]);

  const tabs: {
    key: Tab;
    label: string;
    icon: ComponentType<{ className?: string }>;
    count: number;
  }[] = [
    { key: 'timeline', label: 'Timeline', icon: Clock, count: encounters.length },
    { key: 'prescriptions', label: 'Prescriptions', icon: Pill, count: prescriptions.length },
    { key: 'labs', label: 'Lab Results', icon: FlaskConical, count: labs.length },
    { key: 'vaccinations', label: 'Vaccinations', icon: Syringe, count: vaccinations.length },
  ];

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-[22px]">My Medical Records</h1>
      {loading && <p className="text-[13px] text-gray-500">Loading records…</p>}

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        {tabs.map(tb => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`af-tap af-focus inline-flex items-center gap-2 px-4 py-2 rounded-md text-[13px] transition-colors whitespace-nowrap ${tab === tb.key ? 'bg-white shadow-sm text-teal-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <tb.icon className="w-4 h-4" /> {tb.label}{' '}
            <span className="text-[11px] bg-gray-200 px-1.5 py-0.5 rounded-full">{tb.count}</span>
          </button>
        ))}
      </div>

      {tab === 'timeline' && (
        <div className="relative pl-6">
          <div className="absolute left-2.5 top-0 bottom-0 w-px bg-teal-200" />
          <div className="space-y-4">
            {encounters.map(enc => (
              <div key={enc.id} className="relative">
                <div
                  className={`absolute -left-[14px] top-4 w-3 h-3 rounded-full border-2 border-white ${enc.type === 'emergency' ? 'bg-red-500' : enc.type === 'lab' ? 'bg-blue-500' : enc.type === 'vaccination' ? 'bg-green-500' : 'bg-teal-500'}`}
                />
                <div className="bg-white rounded-xl border border-gray-200 p-4 ml-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full capitalize ${enc.type === 'emergency' ? 'bg-red-100 text-red-700' : enc.type === 'lab' ? 'bg-blue-100 text-blue-700' : enc.type === 'vaccination' ? 'bg-green-100 text-green-700' : 'bg-teal-100 text-teal-700'}`}
                      >
                        {enc.type}
                      </span>
                      <span className="text-[13px] text-gray-500">{enc.date}</span>
                    </div>
                  </div>
                  <h3 className="text-[15px]">{enc.diagnosis}</h3>
                  <p className="text-[13px] text-gray-600 mt-1">{enc.notes}</p>
                  <p className="text-[12px] text-gray-400 mt-2">
                    {enc.doctorName} • {enc.facilityName}
                  </p>
                </div>
              </div>
            ))}
            {!loading && encounters.length === 0 && (
              <p className="text-[13px] text-gray-400">No encounters recorded.</p>
            )}
          </div>
        </div>
      )}

      {tab === 'prescriptions' && (
        <div className="space-y-4">
          {prescriptions.map(rx => (
            <div key={rx.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full ${rx.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                >
                  {rx.status}
                </span>
                <span className="text-[12px] text-gray-500">
                  {rx.date} • {rx.doctorName}
                </span>
              </div>
              {rx.medications.map((med, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg mb-2 last:mb-0"
                >
                  <Pill className="w-4 h-4 text-teal-500 mt-0.5" />
                  <div>
                    <p className="text-[14px]">
                      {med.name} {med.dosage}
                    </p>
                    <p className="text-[12px] text-gray-500">
                      {med.frequency}
                      {med.duration ? ` • ${med.duration}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {!loading && prescriptions.length === 0 && (
            <p className="text-[13px] text-gray-400">No prescriptions recorded.</p>
          )}
        </div>
      )}

      {tab === 'labs' && (
        <ResponsiveTable
          columns={
            [
              { key: 'date', header: 'Date', cell: l => l.date },
              { key: 'test', header: 'Test', cell: l => l.testName },
              { key: 'result', header: 'Result', cell: l => l.result },
              {
                key: 'status',
                header: 'Status',
                cell: l => (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full ${l.status === 'critical' ? 'bg-red-100 text-red-700' : l.status === 'high' || l.status === 'low' || l.status === 'abnormal' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}
                  >
                    {l.status}
                  </span>
                ),
              },
            ] as TableColumn<DisplayLab>[]
          }
          rows={labs}
          rowKey={l => l.id}
          emptyLabel={loading ? 'Loading…' : 'No lab results'}
          mobileTitle={l => l.testName}
          mobileSubtitle={l => `${l.date} · ${l.result}`}
        />
      )}

      {tab === 'vaccinations' && (
        <div className="space-y-3">
          {vaccinations.map(v => (
            <div
              key={v.id}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4"
            >
              <Syringe className="w-5 h-5 text-green-600" />
              <div className="flex-1">
                <p className="text-[14px]">
                  {v.vaccine} — {v.dose}
                </p>
                <p className="text-[12px] text-gray-500">
                  {v.date}
                  {v.site ? ` • ${v.site}` : ''}
                </p>
              </div>
              {v.nextDue && (
                <span
                  className={`text-[11px] px-2 py-1 rounded-full ${new Date(v.nextDue) < new Date() ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}
                >
                  {new Date(v.nextDue) < new Date() ? 'OVERDUE' : `Next: ${v.nextDue}`}
                </span>
              )}
            </div>
          ))}
          {!loading && vaccinations.length === 0 && (
            <p className="text-[13px] text-gray-400">No vaccinations recorded.</p>
          )}
        </div>
      )}
    </div>
  );
}
