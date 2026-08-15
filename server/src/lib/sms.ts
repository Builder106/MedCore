import { env } from './env.js';

export interface SmsAdapter {
  send(opts: {
    to: string;
    body: string;
  }): Promise<{ ok: boolean; messageId?: string; provider: string }>;
  isLive(): boolean;
}

class MockSmsAdapter implements SmsAdapter {
  private log: { to: string; body: string; at: number }[] = [];
  isLive() {
    return false;
  }
  async send(opts: { to: string; body: string }) {
    const entry = { ...opts, at: Date.now() };
    this.log.push(entry);
    if (this.log.length > 200) this.log.shift();
    console.log(`[sms:mock] -> ${opts.to}: ${opts.body}`);
    return { ok: true, messageId: `mock-${entry.at}`, provider: 'mock' };
  }
  recent() {
    return [...this.log].reverse();
  }
}

class AfricasTalkingAdapter implements SmsAdapter {
  isLive() {
    return Boolean(env.AT_API_KEY);
  }
  async send(opts: { to: string; body: string }) {
    if (!env.AT_API_KEY) return mockAdapter.send(opts);
    try {
      const params = new URLSearchParams({
        username: env.AT_USERNAME,
        to: opts.to,
        message: opts.body,
        from: env.AT_SENDER_ID,
      });
      const res = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
          apiKey: env.AT_API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: params.toString(),
      });
      const data = (await res.json().catch(() => null)) as {
        SMSMessageData?: { Recipients?: Array<{ messageId: string }> };
      } | null;
      const id = data?.SMSMessageData?.Recipients?.[0]?.messageId;
      return { ok: res.ok, messageId: id, provider: 'africastalking' };
    } catch (err) {
      console.error('[sms:at] error', err);
      return { ok: false, provider: 'africastalking' };
    }
  }
}

export const mockAdapter = new MockSmsAdapter();
export const sms: SmsAdapter = env.AT_API_KEY ? new AfricasTalkingAdapter() : mockAdapter;

export function recentMockMessages() {
  return mockAdapter.recent();
}
