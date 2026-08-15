import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider } from '../context/AppContext';
import { LoginPage } from './LoginPage';

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('/api/auth/me')) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/api/auth/login') && init?.method === 'POST') {
        return new Response(
          JSON.stringify({ user: { id: 'DOC-001', name: 'Dr. Test', role: 'doctor' } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('{}', { status: 404 });
    })
  );
});

describe('LoginPage', () => {
  it('posts credentials to /api/auth/login with credentials include', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AppProvider>
          <LoginPage />
        </AppProvider>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/user id/i), { target: { value: 'DOC-001' } });
    fireEvent.change(screen.getByPlaceholderText('••••'), { target: { value: '4242' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/auth/login',
        expect.objectContaining({ method: 'POST', credentials: 'include' })
      );
    });
  });
});
