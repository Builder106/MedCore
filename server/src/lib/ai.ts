import { env } from './env.js';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AICallParams {
  system: string;
  messages: Omit<AIMessage, 'role'>[] & { role: 'user' | 'assistant' }[];
  maxTokens?: number;
  cachedSystem?: boolean;
}

export interface AIResponse {
  text: string;
  provider: 'openrouter' | 'mock';
}

const MODEL = 'openrouter/auto:free';
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export function hasAIKey(): boolean {
  return Boolean(env.OPENROUTER_API_KEY);
}

// Legacy alias used by routes/ai.ts
export const hasClaudeKey = hasAIKey;

function buildMessages(params: AICallParams): AIMessage[] {
  return [{ role: 'system', content: params.system }, ...params.messages];
}

function openRouterHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
    'HTTP-Referer': 'https://medcore.local',
    'X-Title': 'MedCore',
  };
}

export async function callClaude(params: AICallParams): Promise<AIResponse> {
  if (!hasAIKey()) {
    return { text: mockResponse(params), provider: 'mock' };
  }

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: openRouterHeaders(),
      body: JSON.stringify({
        model: MODEL,
        max_tokens: params.maxTokens ?? 1024,
        messages: buildMessages(params),
      }),
    });
    if (!res.ok) {
      console.error('[ai] openrouter error', res.status, await res.text());
      return { text: mockResponse(params), provider: 'mock' };
    }
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    const text = data.choices[0]?.message?.content?.trim() ?? '';
    return { text, provider: 'openrouter' };
  } catch (err) {
    console.error('[ai] openrouter exception', err);
    return { text: mockResponse(params), provider: 'mock' };
  }
}

export async function callClaudeStream(
  params: AICallParams,
  onDelta: (chunk: string) => void
): Promise<AIResponse> {
  if (!hasAIKey()) {
    const text = mockResponse(params);
    for (const word of text.split(' ')) {
      onDelta(word + ' ');
      await new Promise(r => setTimeout(r, 20));
    }
    return { text, provider: 'mock' };
  }

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: openRouterHeaders(),
      body: JSON.stringify({
        model: MODEL,
        max_tokens: params.maxTokens ?? 1024,
        messages: buildMessages(params),
        stream: true,
      }),
    });
    if (!res.ok || !res.body) {
      console.error('[ai] openrouter stream error', res.status);
      const fallback = mockResponse(params);
      onDelta(fallback);
      return { text: fallback, provider: 'mock' };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let full = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const evt = JSON.parse(payload) as { choices: { delta: { content?: string } }[] };
          const chunk = evt.choices?.[0]?.delta?.content;
          if (chunk) {
            onDelta(chunk);
            full += chunk;
          }
        } catch {
          // ignore malformed SSE events
        }
      }
    }
    return { text: full, provider: 'openrouter' };
  } catch (err) {
    console.error('[ai] openrouter stream exception', err);
    const fallback = mockResponse(params);
    onDelta(fallback);
    return { text: fallback, provider: 'mock' };
  }
}

function mockResponse(params: AICallParams): string {
  const lastUser = [...params.messages].reverse().find(m => m.role === 'user');
  if (params.system.includes('JSON array of risk flags')) {
    return JSON.stringify([
      {
        severity: 'medium',
        category: 'adherence',
        message: 'Demo: no AI key configured. Set OPENROUTER_API_KEY to enable risk flags.',
        action: 'Configure OPENROUTER_API_KEY',
      },
    ]);
  }
  if (params.system.includes('summary in 4 sections')) {
    return [
      '**Key active issues**',
      '- (Demo mode) Active medications on record; add OPENROUTER_API_KEY for real AI analysis.',
      '',
      '**Medication risks or adherence concerns**',
      '- Review adherence dashboard.',
      '',
      '**Overdue items**',
      '- None detected in demo context.',
      '',
      '**Suggested questions**',
      '- How has the patient tolerated current medications?',
      '- Any new symptoms since last visit?',
      '',
      'AI suggestions are advisory — verify clinically.',
    ].join('\n');
  }
  return `Demo response: ${lastUser?.content.slice(0, 120) ?? ''}\n\n(Set OPENROUTER_API_KEY to enable real AI.)`;
}
