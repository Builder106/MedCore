import { env } from './env.js';

export interface VideoRoom {
  url: string;
  name: string;
  provider: 'daily' | 'mock';
  expiresAt: number;
}

export function jitsiRoomNameForPatient(patientId: string): string {
  const slug = patientId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `medcore${slug}`.slice(0, 200) || 'medcoredemo';
}

export async function createVideoRoom(opts: {
  patientId: string;
  dailyRoomName: string;
}): Promise<VideoRoom> {
  const expiresAt = Date.now() + 1000 * 60 * 60;
  const jitsiName = jitsiRoomNameForPatient(opts.patientId);
  if (!env.DAILY_API_KEY) {
    return {
      url: `https://meet.jit.si/${encodeURIComponent(jitsiName)}`,
      name: jitsiName,
      provider: 'mock',
      expiresAt,
    };
  }
  try {
    const res = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.DAILY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: opts.dailyRoomName,
        properties: {
          exp: Math.floor(expiresAt / 1000),
          enable_screenshare: true,
          enable_chat: false,
        },
      }),
    });
    const data = (await res.json()) as { url?: string; name?: string; error?: string };
    if (!res.ok || !data.url) {
      console.error('[daily] failed', data.error);
      return {
        url: `https://meet.jit.si/${encodeURIComponent(jitsiName)}`,
        name: jitsiName,
        provider: 'mock',
        expiresAt,
      };
    }
    return { url: data.url, name: data.name ?? opts.dailyRoomName, provider: 'daily', expiresAt };
  } catch (err) {
    console.error('[daily] error', err);
    return {
      url: `https://meet.jit.si/${encodeURIComponent(jitsiName)}`,
      name: jitsiName,
      provider: 'mock',
      expiresAt,
    };
  }
}
