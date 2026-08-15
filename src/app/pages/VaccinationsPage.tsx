import { AlertTriangle, Syringe } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { vaccinations as mockVax, patients } from '../data/mock-data';
import { listVaccinations, type Vaccination } from '../services/api';

interface VaxRow {
  id: string;
  patientId: string;
  vaccine: string;
  dose: string;
  date: string;
  site: string;
  batchNumber: string;
  nextDue?: string;
}

function apiToRow(v: Vaccination): VaxRow {
  return {
    id: v.id,
    patientId: v.patientId,
    vaccine: v.vaccineName,
    dose: `Dose ${v.doseNumber}`,
    date: new Date(v.administeredAt).toISOString().slice(0, 10),
    site: v.site ?? '—',
    batchNumber: v.batch ?? '—',
    nextDue: v.nextDueAt ? new Date(v.nextDueAt).toISOString().slice(0, 10) : undefined,
  };
}

export function VaccinationsPage() {
  const { role, currentPatientId } = useApp();
  const [rows, setRows] = useState<VaxRow[]>([]);
  const [apiOk, setApiOk] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentPatientId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await listVaccinations(currentPatientId);
        if (cancelled) return;
        setRows(res.vaccinations.map(apiToRow));
        setApiOk(true);
      } catch {
        if (cancelled) return;
        setApiOk(false);
        const mocks = (
          role === 'patient' ? mockVax.filter(v => v.patientId === currentPatientId) : mockVax
        ).map(v => ({
          id: v.id,
          patientId: v.patientId,
          vaccine: v.vaccine,
          dose: v.dose,
          date: v.date,
          site: v.site,
          batchNumber: v.batchNumber,
          nextDue: v.nextDue,
        }));
        setRows(mocks);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentPatientId, role]);

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-[22px]">Vaccinations</h1>
      {!apiOk && (
        <div className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          API unreachable — showing legacy demo data.
        </div>
      )}
      <div className="space-y-3">
        {loading && <p className="text-[13px] text-gray-500">Loading vaccinations…</p>}
        {!loading && rows.length === 0 && (
          <p className="text-[13px] text-gray-500">No vaccinations on record.</p>
        )}
        {rows.map(v => {
          const patient = patients.find(p => p.id === v.patientId);
          const overdue = v.nextDue && new Date(v.nextDue) < new Date();
          return (
            <div
              key={v.id}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4"
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${overdue ? 'bg-red-100' : 'bg-green-100'}`}
              >
                <Syringe className={`w-5 h-5 ${overdue ? 'text-red-600' : 'text-green-600'}`} />
              </div>
              <div className="flex-1">
                <p className="text-[14px]">
                  {v.vaccine} — {v.dose}
                </p>
                {role !== 'patient' && patient && (
                  <p className="text-[12px] text-purple-600">
                    {patient.firstName} {patient.lastName}
                  </p>
                )}
                <p className="text-[12px] text-gray-500">
                  {v.date} • {v.site} • Batch: {v.batchNumber}
                </p>
              </div>
              {v.nextDue && (
                <span
                  className={`text-[11px] px-2 py-1 rounded-full shrink-0 ${overdue ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}
                >
                  {overdue ? (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> OVERDUE
                    </span>
                  ) : (
                    `Next: ${v.nextDue}`
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
