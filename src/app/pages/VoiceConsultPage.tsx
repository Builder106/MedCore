import { Loader2, Mic, PlayCircle, Save, ShieldAlert, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClinicalBanner, ClinicalText } from '../components/clinical/ClinicalText';
import { useApp } from '../context/AppContext';
import { listVoiceRecordings, saveConsultationNote, transcribe } from '../services/api';

type Phase = 'idle' | 'consent' | 'recording' | 'stopped' | 'transcribing' | 'review';

interface Recording {
  id: string;
  transcript: string;
  createdAt: number;
  audioPath: string | null;
  source: string;
  durationSec?: number | null;
}

const MAX_DURATION_MS = 120 * 1000;
const AUDIO_RETENTION_DAYS = 30;

export function VoiceConsultPage() {
  const { t } = useTranslation();
  const { currentPatientId, currentUserId } = useApp();
  const [phase, setPhase] = useState<Phase>('idle');
  const [consented, setConsented] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [provider, setProvider] = useState<'openai' | 'mock' | null>(null);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [note, setNote] = useState({
    chiefComplaint: '',
    history: '',
    assessment: '',
    plan: '',
    followUp: '',
  });
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAt = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    listVoiceRecordings(currentPatientId)
      .then(r => setRecordings(r.recordings as Recording[]))
      .catch(() => {});
  }, [currentPatientId]);

  useEffect(
    () => () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    },
    [audioUrl]
  );

  async function startRecording() {
    setError(null);
    setTranscript('');
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setPhase('stopped');
      };
      recorder.start(250);
      recorderRef.current = recorder;
      startedAt.current = Date.now();
      setElapsed(0);
      setPhase('recording');
      timerRef.current = window.setInterval(() => {
        const ms = Date.now() - startedAt.current;
        setElapsed(ms);
        if (ms >= MAX_DURATION_MS) stopRecording();
      }, 250);
    } catch (err) {
      setError('Microphone unavailable: ' + (err as Error).message);
      setPhase('idle');
    }
  }

  function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
  }

  async function uploadAndTranscribe() {
    if (!audioBlob) return;
    setPhase('transcribing');
    try {
      const durationSec = Math.round(elapsed / 1000);
      const result = await transcribe(audioBlob, {
        patientId: currentPatientId,
        doctorId: currentUserId,
        source: 'doctor_consult',
        durationSec,
      });
      setTranscript(result.transcript);
      setProvider(result.provider);
      setRecordingId(result.id);
      setNote(structure(result.transcript));
      setPhase('review');
      const r = await listVoiceRecordings(currentPatientId);
      setRecordings(r.recordings as Recording[]);
    } catch (err) {
      setError((err as Error).message);
      setPhase('stopped');
    }
  }

  async function onSaveNote() {
    setSaveStatus(null);
    try {
      await saveConsultationNote({
        patientId: currentPatientId,
        doctorId: currentUserId,
        recordingId: recordingId ?? undefined,
        transcript,
        ...note,
      });
      setSaveStatus('Note saved.');
    } catch (err) {
      setSaveStatus('Error: ' + (err as Error).message);
    }
  }

  function reset() {
    setPhase('idle');
    setTranscript('');
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordingId(null);
    setElapsed(0);
    setNote({ chiefComplaint: '', history: '', assessment: '', plan: '', followUp: '' });
    setSaveStatus(null);
  }

  const seconds = Math.floor(elapsed / 1000);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-[22px] text-[#1F1B18] flex items-center gap-2">
          <Mic className="w-5 h-5 text-[#214838]" />
          {t('voice.record')}
        </h1>
      </div>

      <ClinicalBanner message={t('voice.consentBody', { days: AUDIO_RETENTION_DAYS })} />

      {phase === 'idle' && (
        <section className="af-elevate bg-white rounded-2xl border border-[#D9C8AE] p-5 space-y-4">
          <h2 className="text-sm uppercase tracking-widest text-[#5B5149] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#DAB776]" />
            {t('voice.consentTitle')}
          </h2>
          <p className="text-sm text-[#1F1B18]">
            {t('voice.consentBody', { days: AUDIO_RETENTION_DAYS })}
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={consented}
              onChange={e => setConsented(e.target.checked)}
            />
            {t('voice.consentAgree')}
          </label>
          <div className="flex items-center gap-2">
            <button
              disabled={!consented}
              onClick={startRecording}
              className={`af-press af-focus px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${consented ? 'bg-[#214838] text-[#F7F1E6] hover:bg-[#1B3D30]' : 'bg-[#9EA4A0] text-white cursor-not-allowed'}`}
            >
              <Mic className="w-4 h-4" />
              {t('voice.record')}
            </button>
            <span className="text-xs text-[#5B5149]">{t('voice.maxDuration')}</span>
          </div>
        </section>
      )}

      {phase === 'recording' && (
        <section className="af-elevate bg-white rounded-2xl border border-red-300 p-5 space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-lg notranslate" translate="no">
              {mm}:{ss}
            </span>
            <span className="text-xs text-[#5B5149]">{t('voice.recording')}</span>
          </div>
          <button
            onClick={stopRecording}
            className="af-press af-focus bg-red-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
          >
            <Square className="w-4 h-4" />
            {t('voice.stop')}
          </button>
        </section>
      )}

      {phase === 'stopped' && audioUrl && (
        <section className="af-elevate bg-white rounded-2xl border border-[#D9C8AE] p-5 space-y-3">
          <h2 className="text-sm uppercase tracking-widest text-[#5B5149]">Preview</h2>
          <audio src={audioUrl} controls className="w-full" />
          <div className="flex items-center gap-2">
            <button
              onClick={uploadAndTranscribe}
              className="af-press af-focus bg-[#214838] text-[#F7F1E6] px-4 py-2 rounded-lg text-sm flex items-center gap-2"
            >
              <PlayCircle className="w-4 h-4" />
              {t('voice.generateNote')}
            </button>
            <button
              onClick={reset}
              className="af-press af-focus px-4 py-2 rounded-lg text-sm text-[#5B5149]"
            >
              {t('common.cancel')}
            </button>
          </div>
        </section>
      )}

      {phase === 'transcribing' && (
        <section className="af-elevate bg-white rounded-2xl border border-[#D9C8AE] p-5 flex items-center gap-3 text-sm text-[#5B5149]">
          <Loader2 className="w-5 h-5 animate-spin" />
          {t('voice.transcribing')}
        </section>
      )}

      {phase === 'review' && (
        <section className="af-elevate bg-white rounded-2xl border border-[#D9C8AE] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-widest text-[#5B5149]">
              Transcript · {provider === 'openai' ? 'Whisper' : 'mock'}
            </h2>
            {audioUrl && <audio src={audioUrl} controls className="max-w-xs" />}
          </div>
          <ClinicalText
            as="span"
            className="block text-sm text-[#1F1B18] whitespace-pre-wrap bg-[#FDFAF2] border border-[#E7D9BB] rounded-xl p-3 notranslate"
          >
            {transcript}
          </ClinicalText>

          <div className="grid sm:grid-cols-2 gap-3">
            {(['chiefComplaint', 'history', 'assessment', 'plan', 'followUp'] as const).map(key => (
              <label key={key} className="text-xs text-[#5B5149] flex flex-col gap-1 sm:col-span-2">
                {t(`voice.soap.${key}`)}
                <textarea
                  rows={2}
                  value={note[key]}
                  onChange={e => setNote(n => ({ ...n, [key]: e.target.value }))}
                  className="af-focus rounded-lg border border-[#D9C8AE] px-3 py-2 text-sm"
                />
              </label>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSaveNote}
              className="af-press af-focus bg-[#214838] text-[#F7F1E6] px-4 py-2 rounded-lg text-sm flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {t('common.save')}
            </button>
            <button
              onClick={reset}
              className="af-press af-focus px-4 py-2 rounded-lg text-sm text-[#5B5149]"
            >
              New recording
            </button>
            {saveStatus && <span className="text-xs text-[#5B5149]">{saveStatus}</span>}
          </div>
        </section>
      )}

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 text-red-800 px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {recordings.length > 0 && (
        <section className="af-elevate bg-white rounded-2xl border border-[#D9C8AE] p-5">
          <h2 className="text-sm uppercase tracking-widest text-[#5B5149] mb-3">Past recordings</h2>
          <ul className="divide-y divide-[#F3ECE1]">
            {recordings.slice(0, 10).map(r => (
              <li key={r.id} className="py-2">
                <p className="text-xs text-[#5B5149]">
                  {new Date(r.createdAt).toLocaleString()} · {r.source} · {r.durationSec ?? '?'}s{' '}
                  {r.audioPath ? '' : '· audio purged'}
                </p>
                <ClinicalText as="span" className="block text-sm text-[#1F1B18] line-clamp-3">
                  {r.transcript}
                </ClinicalText>
                {r.audioPath && (
                  <audio
                    src={r.audioPath}
                    controls
                    preload="none"
                    className="mt-1 w-full max-w-md"
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function structure(transcript: string) {
  const lower = transcript.toLowerCase();
  const extract = (re: RegExp) => {
    const m = lower.match(re);
    return m
      ? transcript
          .slice(m.index, (m.index ?? 0) + 240)
          .replace(/^[^:]*:\s*/i, '')
          .split(/\n|\./)[0]
          .trim()
      : '';
  };
  return {
    chiefComplaint: extract(/chief complaint[^.]*/i) || transcript.slice(0, 120),
    history: extract(/history[^.]*/i),
    assessment: extract(/assessment|impression[^.]*/i),
    plan: extract(/plan[^.]*/i),
    followUp: extract(/follow[- ]?up[^.]*/i),
  };
}
