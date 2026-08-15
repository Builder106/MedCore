import { AlertTriangle, Info, ShieldAlert, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  checkInteraction,
  createPrescription,
  listPrescriptions,
  type InteractionResult,
  type Prescription,
} from '../../services/api';
import { ClinicalBanner, ClinicalText } from './ClinicalText';

interface Props {
  open: boolean;
  onClose: () => void;
  patientId: string;
  doctorId: string;
  onSaved?: () => void;
}

type LiveCheckState = {
  loading: boolean;
  results: InteractionResult[];
};

const LEVEL_THEME = {
  critical: {
    bg: 'bg-red-50 border-red-300 text-red-800',
    icon: ShieldAlert,
    labelKey: 'interactions.critical',
  },
  warning: {
    bg: 'bg-amber-50 border-amber-300 text-amber-800',
    icon: AlertTriangle,
    labelKey: 'interactions.warning',
  },
  info: {
    bg: 'bg-sky-50 border-sky-200 text-sky-800',
    icon: Info,
    labelKey: 'interactions.info',
  },
} as const;

export function PrescriptionFormModal({ open, onClose, patientId, doctorId, onSaved }: Props) {
  const { t } = useTranslation();
  const [drugName, setDrugName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('Once daily');
  const [duration, setDuration] = useState('1 month');
  const [notes, setNotes] = useState('');
  const [currentMeds, setCurrentMeds] = useState<Prescription[]>([]);
  const [check, setCheck] = useState<LiveCheckState>({ loading: false, results: [] });
  const [ackWarnings, setAckWarnings] = useState<Record<string, boolean>>({});
  const [ackCritical, setAckCritical] = useState(false);
  const [pin, setPin] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    listPrescriptions(patientId).then(r =>
      setCurrentMeds(r.prescriptions.filter(p => p.status === 'active'))
    );
    setError(null);
  }, [open, patientId]);

  useEffect(() => {
    if (!open) return;
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    if (drugName.trim().length < 3) {
      setCheck({ loading: false, results: [] });
      return;
    }
    setCheck(s => ({ ...s, loading: true }));
    debounceTimer.current = window.setTimeout(async () => {
      const results: InteractionResult[] = [];
      for (const med of currentMeds) {
        try {
          const r = await checkInteraction(drugName, med.drugName);
          if (r.level !== 'none') results.push(r);
        } catch {
          // ignore per-drug errors
        }
      }
      setCheck({ loading: false, results });
    }, 400);
  }, [drugName, open, currentMeds]);

  if (!open) return null;

  const criticalResults = check.results.filter(r => r.level === 'critical');
  const warningResults = check.results.filter(r => r.level === 'warning');
  const infoResults = check.results.filter(r => r.level === 'info');
  const hasCritical = criticalResults.length > 0;
  const hasWarning = warningResults.length > 0;

  const blockedByWarnings = warningResults.some(r => !ackWarnings[`${r.drugB.toLowerCase()}`]);
  const blockedByCritical = hasCritical && (!ackCritical || pin.length < 4);
  const canSubmit =
    !blockedByCritical &&
    !blockedByWarnings &&
    drugName.length >= 3 &&
    dosage.length > 0 &&
    !submitting;

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const ack = [
        ...criticalResults.map(r => ({ drugB: r.drugB, level: 'critical' as const })),
        ...warningResults.map(r => ({ drugB: r.drugB, level: 'warning' as const })),
      ];
      await createPrescription({
        patientId,
        doctorId,
        drugName,
        dosage,
        frequency,
        duration,
        notes: overrideReason ? `${notes}\nOverride reason: ${overrideReason}` : notes,
        acknowledgedInteractions: ack,
        pin: hasCritical ? pin : undefined,
      });
      onSaved?.();
      onClose();
      setDrugName('');
      setDosage('');
      setPin('');
      setOverrideReason('');
      setAckWarnings({});
      setAckCritical(false);
    } catch (err) {
      const e = err as { payload?: { error?: string; message?: string } };
      setError(e.payload?.message ?? e.payload?.error ?? (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-3"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-2 pb-1" aria-hidden>
          <div className="h-1.5 w-10 rounded-full bg-[#E1D3B8]" />
        </div>
        <div className="px-5 py-4 sm:p-5 border-b border-[#E7D9BB] flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-lg text-[#1F1B18]">{t('prescriptions.addNew')}</h2>
          <button
            onClick={onClose}
            className="af-tap af-press af-focus inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-[#F3ECE1]"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5 text-[#5B5149]" />
          </button>
        </div>

        <ClinicalBanner message={t('interactions.banner')} />

        <div className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs text-[#5B5149] flex flex-col gap-1">
              {t('prescriptions.drug')}
              <input
                className="af-focus rounded-lg border border-[#D9C8AE] px-3 py-2 text-sm notranslate"
                value={drugName}
                onChange={e => setDrugName(e.target.value)}
                placeholder={t('prescriptions.drugPlaceholder')}
                translate="no"
                autoFocus
              />
            </label>
            <label className="text-xs text-[#5B5149] flex flex-col gap-1">
              {t('prescriptions.dosage')}
              <input
                className="af-focus rounded-lg border border-[#D9C8AE] px-3 py-2 text-sm notranslate"
                value={dosage}
                onChange={e => setDosage(e.target.value)}
                placeholder="500mg"
                translate="no"
              />
            </label>
            <label className="text-xs text-[#5B5149] flex flex-col gap-1">
              {t('prescriptions.frequency')}
              <input
                className="af-focus rounded-lg border border-[#D9C8AE] px-3 py-2 text-sm"
                value={frequency}
                onChange={e => setFrequency(e.target.value)}
              />
            </label>
            <label className="text-xs text-[#5B5149] flex flex-col gap-1">
              {t('prescriptions.duration')}
              <input
                className="af-focus rounded-lg border border-[#D9C8AE] px-3 py-2 text-sm"
                value={duration}
                onChange={e => setDuration(e.target.value)}
              />
            </label>
          </div>
          <label className="text-xs text-[#5B5149] flex flex-col gap-1">
            {t('prescriptions.notes')}
            <textarea
              rows={2}
              className="af-focus rounded-lg border border-[#D9C8AE] px-3 py-2 text-sm"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </label>

          <div>
            <p className="text-[11px] text-[#5B5149] uppercase tracking-widest mb-2">
              Current medications
            </p>
            {currentMeds.length === 0 && <p className="text-xs text-[#5B5149]">None.</p>}
            <ul className="flex flex-wrap gap-2">
              {currentMeds.map(m => (
                <li
                  key={m.id}
                  className="text-xs rounded-full bg-[#F3ECE1] border border-[#D9C8AE] px-2 py-1"
                >
                  <ClinicalText>
                    {m.drugName} {m.dosage}
                  </ClinicalText>
                </li>
              ))}
            </ul>
          </div>

          <div aria-live="polite" className="space-y-2">
            {check.loading && (
              <p className="text-xs text-[#5B5149]">{t('prescriptions.checking')}</p>
            )}
            {!check.loading && drugName.length >= 3 && check.results.length === 0 && (
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                {t('prescriptions.noInteractions')}
              </p>
            )}
            {[...criticalResults, ...warningResults, ...infoResults].map((r, i) => {
              const theme = LEVEL_THEME[r.level as keyof typeof LEVEL_THEME];
              const Icon = theme.icon;
              const key = `${r.drugB.toLowerCase()}`;
              return (
                <div key={i} className={`rounded-xl border ${theme.bg} px-3 py-2 text-sm`}>
                  <p className="flex items-start gap-2">
                    <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                      <span className="text-[11px] uppercase tracking-widest font-semibold mr-1">
                        {t(theme.labelKey)}
                      </span>
                      <ClinicalText>
                        {r.drugA} + {r.drugB}
                      </ClinicalText>
                      : {r.message}
                    </span>
                  </p>
                  {r.level === 'warning' && (
                    <label className="mt-2 flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={!!ackWarnings[key]}
                        onChange={e => setAckWarnings(s => ({ ...s, [key]: e.target.checked }))}
                      />
                      {t('prescriptions.ackWarning')}
                    </label>
                  )}
                </div>
              );
            })}
          </div>

          {hasCritical && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-3 space-y-2 text-sm">
              <label className="flex items-center gap-2 text-red-800">
                <input
                  type="checkbox"
                  checked={ackCritical}
                  onChange={e => setAckCritical(e.target.checked)}
                />
                {t('prescriptions.ackCritical')}
              </label>
              <label className="text-xs flex flex-col gap-1 text-red-800">
                {t('prescriptions.overrideReason')}
                <textarea
                  rows={2}
                  value={overrideReason}
                  onChange={e => setOverrideReason(e.target.value)}
                  className="af-focus rounded-lg border border-red-300 px-2 py-1 text-sm text-black"
                />
              </label>
              <label className="text-xs flex flex-col gap-1 text-red-800">
                {t('prescriptions.overridePin')}
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                  className="af-focus rounded-lg border border-red-300 px-2 py-1 text-sm notranslate tracking-[0.3em] text-black"
                  placeholder="••••"
                  translate="no"
                />
              </label>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="af-tap af-press af-focus px-3 py-2 rounded-lg text-sm text-[#5B5149] border border-[#D9C8AE] sm:border-0 bg-white"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={submit}
              disabled={!canSubmit}
              className={`af-tap af-press af-focus px-4 py-2 rounded-lg text-sm text-white ${canSubmit ? (hasCritical ? 'bg-red-600 hover:bg-red-700' : 'bg-[#214838] hover:bg-[#1B3D30]') : 'bg-[#9EA4A0] cursor-not-allowed'}`}
            >
              {hasCritical ? t('prescriptions.override') : t('common.save')}
            </button>
          </div>
          {blockedByCritical && (
            <p className="text-right text-[11px] text-red-700">{t('prescriptions.saveBlocked')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
