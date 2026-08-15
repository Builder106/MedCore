import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider } from '../context/AppContext';
import { HealthIdPage, healthIdChartUrl } from './HealthIdPage';

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <span data-testid="health-id-qr-value">{value}</span>
  ),
}));

describe('healthIdChartUrl', () => {
  it('builds patient deep link with query', () => {
    expect(healthIdChartUrl('PAT-001', 'https://demo.example')).toBe(
      'https://demo.example/patients/PAT-001?from=health-id'
    );
  });
});

describe('HealthIdPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const url = typeof input === 'string' ? input : (input as Request).url;
        if (url.includes('/api/auth/me')) {
          return new Response(
            JSON.stringify({
              user: { id: 'PAT-001', name: 'Test Patient', role: 'patient' },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('{}', { status: 404 });
      })
    );
  });

  it('encodes chart URL in QR (same-origin patient deep link)', async () => {
    render(
      <MemoryRouter>
        <AppProvider>
          <HealthIdPage />
        </AppProvider>
      </MemoryRouter>
    );

    await screen.findByText(/Your Health ID/i);
    const qr = screen.getByTestId('health-id-qr-value');
    const href = qr.textContent ?? '';
    expect(href).toContain('/patients/PAT-001');
    expect(href).toContain('from=health-id');
    expect(href.startsWith('http')).toBe(true);
  });
});
