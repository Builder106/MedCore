import { Bell, BellRing, CalendarDays, CheckCircle, Loader2, Send, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClinicalText } from '../components/clinical/ClinicalText';
import { useApp } from '../context/AppContext';
import {
  createReminderSchedule,
  dispatchNow,
  getAdherence,
  getReminders,
  getVapidKey,
  listPrescriptions,
  respondToReminder,
  subscribePush,
  type AdherenceResponse,
  type Prescription,
} from '../services/api';

interface Reminder {
  id: string;
  scheduledTime: number;
  status: string;
  channel: string;
  prescriptionId: string;
}

function urlB64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const str = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(str);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export function RemindersPage() {
  const { t } = useTranslation();
  const { role, currentPatientId, currentUserId } = useApp();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [adherence, setAdherence] = useState<AdherenceResponse | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushStatus, setPushStatus] = useState<
    'idle' | 'enabling' | 'enabled' | 'unsupported' | 'error'
  >('idle');
  const [busyReminder, setBusyReminder] = useState<string | null>(null);
  const [scheduleRxId, setScheduleRxId] = useState('');
  const [scheduleTimes, setScheduleTimes] = useState('08:00,20:00');
  const [scheduleDays, setScheduleDays] = useState(14);
  const [scheduleChannel, setScheduleChannel] = useState<'sms' | 'push'>('sms');
  const [scheduleMsg, setScheduleMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<{
    idx: number;
    doseDate: string;
    status: string;
  } | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const [rx, rem, adh] = await Promise.all([
        listPrescriptions(currentPatientId),
        getReminders(currentPatientId),
        getAdherence(currentPatientId),
      ]);
      setPrescriptions(rx.prescriptions.filter(p => p.status === 'active'));
      setReminders(rem.reminders);
      setAdherence(adh);
      setError(null);
      if (!scheduleRxId && rx.prescriptions.length > 0) setScheduleRxId(rx.prescriptions[0].id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [currentPatientId]);

  async function onRespond(id: string, response: 'TAKEN' | 'SKIP') {
    setBusyReminder(id);
    try {
      await respondToReminder(id, response);
      await refresh();
    } finally {
      setBusyReminder(null);
    }
  }

  async function onTestReminder() {
    await dispatchNow(currentPatientId);
    alert('Test reminder dispatched via SMS + Push (check server logs + device).');
  }

  async function enablePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushStatus('unsupported');
      return;
    }
    setPushStatus('enabling');
    try {
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await getVapidKey();
      if (!publicKey) {
        setPushStatus('unsupported');
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(publicKey),
      });
      const raw = sub.toJSON();
      await subscribePush({
        userId: currentUserId,
        endpoint: raw.endpoint!,
        keys: { p256dh: raw.keys!.p256dh!, auth: raw.keys!.auth! },
      });
      setPushStatus('enabled');
    } catch {
      setPushStatus('error');
    }
  }

  async function createSchedule() {
    if (!scheduleRxId) return;
    setScheduleMsg(null);
    const times = scheduleTimes
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const today = new Date();
    const end = new Date(today);
    end.setDate(end.getDate() + scheduleDays - 1);
    try {
      const r = await createReminderSchedule({
        prescriptionId: scheduleRxId,
        patientId: currentPatientId,
        times,
        startDate: today.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        channel: scheduleChannel,
      });
      setScheduleMsg(`Created ${r.created} reminders.`);
      refresh();
    } catch (err) {
      setScheduleMsg((err as Error).message);
    }
  }

  const upcoming = reminders
    .filter(r => r.status === 'pending' && r.scheduledTime >= Date.now() - 1000 * 60 * 60)
    .slice(0, 10);
  const actionable = reminders
    .filter(r => r.status === 'sent' || (r.status === 'pending' && r.scheduledTime <= Date.now()))
    .slice(0, 5);
  const getRx = (id: string) => prescriptions.find(p => p.id === id);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] text-[#1F1B18] flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#214838]" />
          {t('reminders.title')}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={enablePush}
            disabled={pushStatus === 'enabling' || pushStatus === 'enabled'}
            className="af-tap af-press af-focus inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-[#F3ECE1] border border-[#D9C8AE] text-[#214838]"
          >
            <BellRing className="w-4 h-4" />
            {pushStatus === 'enabled'
              ? t('reminders.pushEnabled')
              : pushStatus === 'unsupported'
                ? t('reminders.pushUnsupported')
                : pushStatus === 'enabling'
                  ? '…'
                  : t('reminders.enablePush')}
          </button>
          <button
            onClick={onTestReminder}
            className="af-tap af-press af-focus inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-[#214838] text-[#F7F1E6]"
          >
            <Send className="w-4 h-4" />
            {t('reminders.sendTest')}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {adherence && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="af-elevate bg-white rounded-2xl border border-[#D9C8AE] p-4">
            <p className="text-[11px] uppercase tracking-widest text-[#5B5149]">
              {t('reminders.adherence', { days: 30 })}
            </p>
            <p className="text-3xl mt-1 text-[#214838] notranslate" translate="no">
              {adherence.ratePct}%
            </p>
            <p className="text-xs text-[#5B5149]">{adherence.total} doses</p>
          </div>
          <div className="af-elevate bg-white rounded-2xl border border-[#D9C8AE] p-4">
            <p className="text-[11px] uppercase tracking-widest text-[#5B5149]">Streak</p>
            <p className="text-3xl mt-1 text-[#DAB776] notranslate" translate="no">
              {adherence.streakDays}
            </p>
            <p className="text-xs text-[#5B5149]">
              {t('reminders.streak', { count: adherence.streakDays })}
            </p>
          </div>
          <div className="af-elevate bg-white rounded-2xl border border-[#D9C8AE] p-4">
            <p className="text-[11px] uppercase tracking-widest text-[#5B5149]">Recent doses</p>
            <div className="flex gap-1 mt-2 flex-wrap">
              {adherence.events.slice(0, 24).map((e, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() =>
                    setSelectedEvent(
                      selectedEvent?.idx === i
                        ? null
                        : { idx: i, doseDate: e.doseDate, status: e.status }
                    )
                  }
                  aria-label={`${e.doseDate} ${e.status}`}
                  className={`af-focus w-4 h-4 rounded-sm transition-transform ${selectedEvent?.idx === i ? 'ring-2 ring-offset-1 ring-[#C39A3D]' : ''} ${e.status === 'taken' ? 'bg-emerald-500' : e.status === 'skipped' ? 'bg-amber-400' : 'bg-[#D9C8AE]'}`}
                />
              ))}
            </div>
            {selectedEvent && (
              <p className="mt-2 text-[12px] text-[#5B5149]">
                <span className="font-medium text-[#1F1B18]">{selectedEvent.doseDate}</span> ·{' '}
                {selectedEvent.status}
              </p>
            )}
          </div>
        </section>
      )}

      {actionable.length > 0 && (
        <section className="af-elevate bg-white rounded-2xl border border-[#D9C8AE] p-5">
          <h2 className="text-sm uppercase tracking-widest text-[#5B5149] mb-3">Needs response</h2>
          <ul className="space-y-2">
            {actionable.map(r => {
              const rx = getRx(r.prescriptionId);
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#D9C8AE] p-3"
                >
                  <div>
                    <p className="text-sm">
                      {rx ? (
                        <ClinicalText as="strong">
                          {rx.drugName} {rx.dosage}
                        </ClinicalText>
                      ) : (
                        <span className="notranslate">{r.prescriptionId}</span>
                      )}
                    </p>
                    <p className="text-xs text-[#5B5149]">
                      Scheduled {new Date(r.scheduledTime).toLocaleString()} · {r.channel}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onRespond(r.id, 'TAKEN')}
                      disabled={busyReminder === r.id}
                      className="af-tap af-press af-focus inline-flex items-center gap-1 px-4 py-2.5 rounded-lg text-sm bg-emerald-600 text-white"
                    >
                      {busyReminder === r.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}{' '}
                      {t('reminders.markTaken')}
                    </button>
                    <button
                      onClick={() => onRespond(r.id, 'SKIP')}
                      disabled={busyReminder === r.id}
                      className="af-tap af-press af-focus inline-flex items-center gap-1 px-4 py-2.5 rounded-lg text-sm bg-[#F3ECE1] border border-[#D9C8AE] text-[#214838]"
                    >
                      <XCircle className="w-4 h-4" /> {t('reminders.markSkipped')}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="af-elevate bg-white rounded-2xl border border-[#D9C8AE] p-5">
          <h2 className="text-sm uppercase tracking-widest text-[#5B5149] mb-3 flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            {t('reminders.nextReminder')}
          </h2>
          <ul className="divide-y divide-[#F3ECE1]">
            {upcoming.map(r => {
              const rx = getRx(r.prescriptionId);
              return (
                <li key={r.id} className="py-2 flex items-center justify-between text-sm">
                  <span>
                    {rx ? (
                      <ClinicalText>
                        {rx.drugName} {rx.dosage}
                      </ClinicalText>
                    ) : (
                      <span className="notranslate">{r.prescriptionId}</span>
                    )}
                  </span>
                  <span className="text-xs text-[#5B5149] notranslate" translate="no">
                    {new Date(r.scheduledTime).toLocaleString()} · {r.channel}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {role === 'doctor' && prescriptions.length > 0 && (
        <section className="af-elevate bg-white rounded-2xl border border-[#D9C8AE] p-5 space-y-3">
          <h2 className="text-sm uppercase tracking-widest text-[#5B5149]">
            {t('reminders.schedule')}
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs text-[#5B5149] flex flex-col gap-1">
              Prescription
              <select
                value={scheduleRxId}
                onChange={e => setScheduleRxId(e.target.value)}
                className="af-focus rounded-lg border border-[#D9C8AE] px-3 py-2 text-sm"
              >
                {prescriptions.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.drugName} {p.dosage}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-[#5B5149] flex flex-col gap-1">
              Times (HH:MM, comma-separated)
              <input
                value={scheduleTimes}
                onChange={e => setScheduleTimes(e.target.value)}
                className="af-focus rounded-lg border border-[#D9C8AE] px-3 py-2 text-sm notranslate"
                translate="no"
              />
            </label>
            <label className="text-xs text-[#5B5149] flex flex-col gap-1">
              Days
              <input
                type="number"
                min={1}
                max={90}
                value={scheduleDays}
                onChange={e => setScheduleDays(parseInt(e.target.value) || 1)}
                className="af-focus rounded-lg border border-[#D9C8AE] px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-[#5B5149] flex flex-col gap-1">
              Channel
              <select
                value={scheduleChannel}
                onChange={e => setScheduleChannel(e.target.value as 'sms' | 'push')}
                className="af-focus rounded-lg border border-[#D9C8AE] px-3 py-2 text-sm"
              >
                <option value="sms">SMS</option>
                <option value="push">Push</option>
              </select>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={createSchedule}
              className="af-press af-focus px-4 py-2 rounded-lg text-sm bg-[#214838] text-[#F7F1E6]"
            >
              {t('common.save')}
            </button>
            {scheduleMsg && <span className="text-xs text-[#5B5149]">{scheduleMsg}</span>}
          </div>
        </section>
      )}

      {loading && (
        <p className="text-sm text-[#5B5149] flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t('common.loading')}
        </p>
      )}
    </div>
  );
}
