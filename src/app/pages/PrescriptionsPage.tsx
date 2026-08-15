import { AlertTriangle, Info, Pill, Plus, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClinicalText } from '../components/clinical/ClinicalText';
import { PrescriptionFormModal } from '../components/clinical/PrescriptionFormModal';
import { useApp } from '../context/AppContext';
import { prescriptions as mockRx, patients } from '../data/mock-data';
import {
  listInteractionEvents,
  listPrescriptions,
  type InteractionEvent,
  type Prescription,
} from '../services/api';

const LEVEL_ICON = {
  critical: ShieldAlert,
  warning: AlertTriangle,
  info: Info,
} as const;

const LEVEL_COLOR = {
  critical: 'bg-red-50 text-red-800 border-red-300',
  warning: 'bg-amber-50 text-amber-800 border-amber-300',
  info: 'bg-sky-50 text-sky-800 border-sky-200',
} as const;

export function PrescriptionsPage() {
  const { t } = useTranslation();
  const { role, currentPatientId, currentUserId } = useApp();
  const [apiRx, setApiRx] = useState<Prescription[] | null>(null);
  const [events, setEvents] = useState<InteractionEvent[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const [rx, ev] = await Promise.all([
        listPrescriptions(currentPatientId),
        listInteractionEvents(currentPatientId),
      ]);
      setApiRx(rx.prescriptions);
      setEvents(ev.events);
      setError(null);
    } catch (err) {
      setApiRx(null);
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    refresh();
  }, [currentPatientId]);

  const liveRx = apiRx ?? [];
  const legacyRx =
    role === 'patient' ? mockRx.filter(r => r.patientId === currentPatientId) : mockRx;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-[22px] text-[#1F1B18]">{t('nav.prescriptions')}</h1>
        {role === 'doctor' && (
          <button
            onClick={() => setModalOpen(true)}
            className="af-press af-focus flex items-center gap-2 px-4 py-2 bg-[#214838] text-[#F7F1E6] rounded-lg hover:bg-[#1B3D30] transition-colors text-[14px]"
          >
            <Plus className="w-4 h-4" /> {t('prescriptions.addNew')}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-4 py-2 text-sm">
          API unreachable — showing legacy demo data. Start the API with{' '}
          <code className="bg-amber-100 px-1 rounded">npm run dev</code>.
        </div>
      )}

      {events.length > 0 && (
        <section className="af-elevate bg-white rounded-2xl border border-[#D9C8AE] p-5">
          <h2 className="text-sm uppercase tracking-widest text-[#5B5149] mb-3 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-600" />
            {t('interactions.flagged')}
          </h2>
          <ul className="space-y-2">
            {events.slice(0, 8).map(e => {
              const Icon = LEVEL_ICON[e.level];
              return (
                <li
                  key={e.id}
                  className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${LEVEL_COLOR[e.level]}`}
                >
                  <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p>
                      <span className="font-semibold uppercase text-[11px] mr-1">
                        {t(`interactions.${e.level}`)}
                      </span>
                      <ClinicalText>
                        {e.drugA} + {e.drugB}
                      </ClinicalText>
                      {e.overridden ? (
                        <span className="ml-2 text-[11px] text-red-700">[overridden]</span>
                      ) : null}
                    </p>
                    <p className="text-xs">{e.message}</p>
                    <p className="text-[11px] text-[#5B5149] mt-1">
                      {new Date(e.createdAt).toLocaleString()} · source: {e.source}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="space-y-4">
        {apiRx && liveRx.length > 0 && (
          <section>
            <h2 className="text-sm uppercase tracking-widest text-[#5B5149] mb-3">
              Active prescriptions
            </h2>
            <div className="space-y-3">
              {liveRx.map(rx => (
                <div
                  key={rx.id}
                  className="af-elevate bg-white rounded-xl border border-[#D9C8AE] p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full ${rx.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-[#F3ECE1] text-[#5B5149]'}`}
                      >
                        {rx.status}
                      </span>
                      <span className="text-[12px] text-[#5B5149]">
                        {new Date(rx.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#9B8E7F] notranslate">{rx.id}</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-[#FDFAF2] rounded-lg">
                    <Pill className="w-4 h-4 text-[#214838] mt-0.5 shrink-0" />
                    <div>
                      <ClinicalText className="text-[14px]" as="strong">
                        {rx.drugName} {rx.dosage}
                      </ClinicalText>
                      <p className="text-[12px] text-[#5B5149] notranslate" translate="no">
                        {rx.frequency}
                        {rx.duration ? ` · ${rx.duration}` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {apiRx === null &&
          legacyRx.map(rx => {
            const patient = patients.find(p => p.id === rx.patientId);
            return (
              <div key={rx.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full ${rx.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {rx.status}
                    </span>
                    {role !== 'patient' && patient && (
                      <span className="text-[13px]">
                        {patient.firstName} {patient.lastName}
                      </span>
                    )}
                    <span className="text-[12px] text-gray-500">
                      {rx.date} · {rx.doctorName}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400">{rx.id}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {rx.medications.map((med, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <Pill className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                      <div>
                        <ClinicalText as="strong" className="text-[14px]">
                          {med.name} {med.dosage}
                        </ClinicalText>
                        <p className="text-[12px] text-gray-500 notranslate" translate="no">
                          {med.frequency} · {med.duration}
                        </p>
                        {med.interactions?.map(int => (
                          <p
                            key={int}
                            className="text-[11px] text-amber-600 mt-1 flex items-center gap-1"
                          >
                            <AlertTriangle className="w-3 h-3" /> {int}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
      </div>

      <PrescriptionFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        patientId={currentPatientId}
        doctorId={currentUserId}
        onSaved={refresh}
      />
    </div>
  );
}
