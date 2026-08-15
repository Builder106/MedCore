import webpush from 'web-push';
import { env } from './env.js';

let configured = false;

export function configurePush() {
  if (configured) return;
  if (env.WEB_PUSH_PUBLIC_KEY && env.WEB_PUSH_PRIVATE_KEY) {
    webpush.setVapidDetails(
      env.WEB_PUSH_CONTACT,
      env.WEB_PUSH_PUBLIC_KEY,
      env.WEB_PUSH_PRIVATE_KEY
    );
    configured = true;
  }
}

export function pushAvailable() {
  return Boolean(env.WEB_PUSH_PUBLIC_KEY && env.WEB_PUSH_PRIVATE_KEY);
}

export async function sendPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: object
) {
  configurePush();
  if (!pushAvailable()) {
    console.log('[push:mock] would send to', subscription.endpoint, payload);
    return { ok: true, mock: true };
  }
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true, mock: false };
  } catch (err) {
    console.error('[push] failed', err);
    return { ok: false, mock: false };
  }
}

export function publicVapidKey() {
  return env.WEB_PUSH_PUBLIC_KEY ?? null;
}
