import { readFileSync } from 'node:fs';
import { env } from './env.js';

const FILLER = [
  'Patient reports increased fatigue over the past two weeks.',
  'Doctor: Any chest pain or shortness of breath?',
  'Patient: No chest pain. Slight shortness of breath after climbing stairs.',
  'Doctor: Are you taking your Metformin twice daily?',
  'Patient: Yes, but I missed two doses last weekend.',
  'Doctor: We will order a fasting glucose and HbA1c. Continue current medication.',
];

export async function transcribeAudio(file: {
  path?: string;
  buffer?: Buffer;
  mime: string;
}): Promise<{ text: string; provider: 'groq' | 'openai' | 'mock' }> {
  const apiKey = env.GROQ_API_KEY ?? env.OPENAI_API_KEY;
  if (!apiKey) return { text: FILLER.join('\n'), provider: 'mock' };

  const isGroq = !!env.GROQ_API_KEY;
  const url = isGroq
    ? 'https://api.groq.com/openai/v1/audio/transcriptions'
    : 'https://api.openai.com/v1/audio/transcriptions';
  const model = isGroq ? 'whisper-large-v3' : 'whisper-1';

  const blob = file.buffer
    ? new Blob([new Uint8Array(file.buffer)], { type: file.mime })
    : new Blob([new Uint8Array(readFileSync(file.path!))], { type: file.mime });
  const formData = new FormData();
  formData.append('file', blob, 'audio.webm');
  formData.append('model', model);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });
    const data = (await res.json()) as { text?: string; error?: { message: string } };
    if (data.error) {
      console.error('[whisper] error', data.error.message);
      return { text: FILLER.join('\n'), provider: 'mock' };
    }
    return { text: data.text ?? '', provider: isGroq ? 'groq' : 'openai' };
  } catch (err) {
    console.error('[whisper] failed', err);
    return { text: FILLER.join('\n'), provider: 'mock' };
  }
}

export function structureNoteFromTranscript(transcript: string) {
  const lines = transcript.split(/\n+/).filter(Boolean);
  const chiefComplaint = lines.find(l => /report|complain|present/i.test(l)) ?? lines[0] ?? '';
  const history =
    lines.filter(l => /history|past|previously|since/i.test(l)).join(' ') ||
    lines.slice(1, 3).join(' ');
  const assessment = lines.find(l => /assessment|likely|diagnos/i.test(l)) ?? '';
  const plan = lines.filter(l => /order|continue|start|stop|refer|prescribe/i.test(l)).join(' ');
  const followUp = lines.find(l => /follow[- ]up|return|review/i.test(l)) ?? '';
  return { chiefComplaint, history, assessment, plan, followUp };
}
