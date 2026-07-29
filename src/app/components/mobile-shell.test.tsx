import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppProvider } from '../context/AppContext';
import { MobileDrawer } from './MobileDrawer';
import { BottomNav } from './BottomNav';
import { Layout } from './Layout';
import type { UserRole } from '../context/AppContext';

let mockRole: UserRole = 'patient';

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('/api/auth/me')) {
        const id =
          mockRole === 'patient' ? 'PAT-001' : mockRole === 'admin' ? 'ADM-001' : 'DOC-001';
        return new Response(
          JSON.stringify({ user: { id, name: 'Test User', role: mockRole } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response('{}', { status: 404 });
    }),
  );
});

function renderWithShell(ui: React.ReactNode, initialRole: UserRole = 'patient', initialEntries = ['/']) {
  mockRole = initialRole;
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AppProvider>{ui}</AppProvider>
    </MemoryRouter>,
  );
}

describe('BottomNav', () => {
  it('renders five tabs for patient role', async () => {
    renderWithShell(<BottomNav onOpenMore={() => {}} />, 'patient');
    const nav = await screen.findByRole('navigation', { name: /primary/i });
    await waitFor(() => {
      const links = within(nav).getAllByRole('link');
      const moreBtn = within(nav).getAllByRole('button');
      expect(links.length + moreBtn.length).toBe(5);
    });
  });

  it('patient tabs include Home, Reminders, Health ID, Video', async () => {
    renderWithShell(<BottomNav onOpenMore={() => {}} />, 'patient');
    const nav = await screen.findByRole('navigation', { name: /primary/i });
    await waitFor(() => {
      const hrefs = within(nav)
        .getAllByRole('link')
        .map(a => a.getAttribute('href'));
      expect(hrefs).toContain('/');
      expect(hrefs).toContain('/reminders');
      expect(hrefs).toContain('/health-id');
      expect(hrefs).toContain('/video-consult');
    });
  });

  it('doctor tabs include Home, Patients, Prescriptions, Voice', async () => {
    renderWithShell(<BottomNav onOpenMore={() => {}} />, 'doctor');
    const nav = await screen.findByRole('navigation', { name: /primary/i });
    await waitFor(() => {
      const hrefs = within(nav)
        .getAllByRole('link')
        .map(a => a.getAttribute('href'));
      expect(hrefs).toContain('/');
      expect(hrefs).toContain('/patients');
      expect(hrefs).toContain('/prescriptions');
      expect(hrefs).toContain('/voice-consult');
    });
  });

  it('admin tabs include Home, Staff, Inventory, Reports', async () => {
    renderWithShell(<BottomNav onOpenMore={() => {}} />, 'admin');
    const nav = await screen.findByRole('navigation', { name: /primary/i });
    await waitFor(() => {
      const hrefs = within(nav)
        .getAllByRole('link')
        .map(a => a.getAttribute('href'));
      expect(hrefs).toContain('/');
      expect(hrefs).toContain('/staff');
      expect(hrefs).toContain('/inventory');
      expect(hrefs).toContain('/reports');
    });
  });

  it('invokes onOpenMore when the More tab is tapped', async () => {
    let opened = 0;
    renderWithShell(<BottomNav onOpenMore={() => { opened += 1; }} />, 'patient');
    await screen.findByRole('navigation', { name: /primary/i });
    const more = await screen.findByRole('button', { name: /more/i });
    fireEvent.click(more);
    expect(opened).toBe(1);
  });
});

describe('MobileDrawer', () => {
  it('is hidden when open=false', () => {
    renderWithShell(<MobileDrawer open={false} onClose={() => {}} />, 'patient');
    const drawer = screen.queryByRole('dialog', { name: /navigation/i });
    expect(drawer).toBeNull();
  });

  it('renders all patient nav items when role=patient', async () => {
    renderWithShell(<MobileDrawer open={true} onClose={() => {}} />, 'patient');
    const dialog = await screen.findByRole('dialog', { name: /navigation/i });
    await waitFor(() => {
      const links = within(dialog).getAllByRole('link');
      const hrefs = links.map(a => a.getAttribute('href'));
      expect(hrefs).toContain('/health-id');
      expect(hrefs).toContain('/records');
      expect(hrefs).toContain('/consent');
    });
  });

  it('closes when a nav link inside is clicked', async () => {
    let closed = 0;
    renderWithShell(<MobileDrawer open={true} onClose={() => { closed += 1; }} />, 'patient');
    const dialog = await screen.findByRole('dialog', { name: /navigation/i });
    const firstLink = within(dialog).getAllByRole('link')[0];
    fireEvent.click(firstLink);
    expect(closed).toBeGreaterThan(0);
  });
});

describe('Layout mobile header', () => {
  function stubDoctorSession() {
    mockRole = 'doctor';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const url = typeof input === 'string' ? input : (input as Request).url;
        if (url.includes('/api/auth/me')) {
          return new Response(
            JSON.stringify({ user: { id: 'DOC-001', name: 'Test', role: 'doctor' } }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return new Response('{}', { status: 404 });
      }),
    );
  }

  it('renders a hamburger (menu) button', async () => {
    stubDoctorSession();
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppProvider>
          <Layout />
        </AppProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('button', { name: /open navigation/i })).toBeInTheDocument();
  });

  it('renders the bottom navigation on mobile', async () => {
    stubDoctorSession();
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppProvider>
          <Layout />
        </AppProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('navigation', { name: /primary/i })).toBeInTheDocument();
  });

  it('opens the drawer when hamburger is clicked', async () => {
    stubDoctorSession();
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppProvider>
          <Layout />
        </AppProvider>
      </MemoryRouter>,
    );
    expect(screen.queryByRole('dialog', { name: /navigation/i })).toBeNull();
    fireEvent.click(await screen.findByRole('button', { name: /open navigation/i }));
    expect(screen.getByRole('dialog', { name: /navigation/i })).toBeInTheDocument();
  });
});
