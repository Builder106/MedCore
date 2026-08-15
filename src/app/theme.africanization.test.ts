// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));

function readProjectFile(relativePath: string) {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

describe('African-inspired design system', () => {
  it('defines warm earthy root tokens in theme.css', () => {
    const themeCss = readProjectFile('src/styles/theme.css');
    expect(themeCss).toContain('--background: #f7f1e6;');
    expect(themeCss).toContain('--primary: #b85c38;');
    expect(themeCss).toContain('--accent: #c39a3d;');
    expect(themeCss).toContain('--sidebar: #24533e;');
    expect(themeCss).toContain('--destructive: #a63d32;');
  });

  it('loads a distinct display typeface in fonts.css', () => {
    const fontsCss = readProjectFile('src/styles/fonts.css');
    expect(fontsCss).toContain('family=Bree+Serif');
    expect(fontsCss).toContain('family=IBM+Plex+Sans');
  });

  it('uses warm/acacia-driven classes in sidebar and dashboard', () => {
    const sidebar = readProjectFile('src/app/components/Sidebar.tsx');
    const dashboard = readProjectFile('src/app/pages/dashboards/DoctorDashboard.tsx');
    expect(sidebar).toContain('bg-[#214838]');
    expect(sidebar).toContain('text-[#F7F1E6]');
    expect(sidebar).toContain('text-[#DAB776]');
    expect(dashboard).toContain('Clinical Priorities');
    expect(dashboard).toContain('text-violet-700');
    expect(dashboard).toContain('focus-within:ring-violet-200');
  });
});
