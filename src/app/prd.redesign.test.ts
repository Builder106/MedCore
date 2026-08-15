// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));

function readProjectFile(relativePath: string) {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

describe('PRD-aligned redesign surfaces', () => {
  it('exposes low-bandwidth, language, and USSD context in app shell', () => {
    const layout = readProjectFile('src/app/components/Layout.tsx');
    const i18nSetup = readProjectFile('src/app/i18n.ts');
    const enResources = readProjectFile('src/locales/en/translation.json');
    expect(layout).toContain("t('common.lowBandwidth')");
    expect(layout).toContain('USSD *123#');
    expect(layout).toContain('SUPPORTED_LANGUAGES');
    expect(i18nSetup).toContain('Swahili');
    expect(i18nSetup).toContain('العربية');
    expect(i18nSetup).toContain('Hausa');
    expect(enResources).toContain('"lowBandwidth"');
  });

  it('upgrades doctor dashboard around queue, timeline, referrals, and AI advisory', () => {
    const doctorDashboard = readProjectFile('src/app/pages/dashboards/DoctorDashboard.tsx');
    expect(doctorDashboard).toContain('Clinical Priorities');
    expect(doctorDashboard).toContain('Unified Timeline');
    expect(doctorDashboard).toContain('AI Advisory');
    expect(doctorDashboard).toContain('Referral Tracker');
  });

  it('upgrades patient dashboard around consent, health id, and offline channels', () => {
    const patientDashboard = readProjectFile('src/app/pages/dashboards/PatientDashboard.tsx');
    expect(patientDashboard).toContain('Health Access Channels');
    expect(patientDashboard).toContain('Consent Snapshot');
    expect(patientDashboard).toContain('Scannable Health ID');
  });

  it('upgrades admin dashboard around interoperability and ministry reporting', () => {
    const adminDashboard = readProjectFile('src/app/pages/dashboards/AdminDashboard.tsx');
    expect(adminDashboard).toContain('Interoperability & Compliance');
    expect(adminDashboard).toContain('Ministry Submission Readiness');
    expect(adminDashboard).toContain('FHIR sync');
  });

  it('adds reusable micro-interaction utilities and usage hooks', () => {
    const themeCss = readProjectFile('src/styles/theme.css');
    const layout = readProjectFile('src/app/components/Layout.tsx');
    const doctorDashboard = readProjectFile('src/app/pages/dashboards/DoctorDashboard.tsx');
    expect(themeCss).toContain('.af-elevate');
    expect(themeCss).toContain('.af-press');
    expect(themeCss).toContain('.af-pulse-dot');
    expect(themeCss).toContain('prefers-reduced-motion');
    expect(layout).toContain('af-press');
    expect(doctorDashboard).toContain('af-elevate');
  });
});
