import { describe, expect, it } from 'vitest';
import { adminItems, doctorItems, patientItems, type NavItem } from './Sidebar';

function assertShape(items: NavItem[]) {
  expect(Array.isArray(items)).toBe(true);
  expect(items.length).toBeGreaterThan(0);
  for (const item of items) {
    expect(typeof item.to).toBe('string');
    expect(item.to.startsWith('/')).toBe(true);
    expect(typeof item.labelKey).toBe('string');
    expect(item.labelKey.length).toBeGreaterThan(0);
    expect(item.icon).toBeTruthy();
    expect(['function', 'object']).toContain(typeof item.icon);
  }
}

describe('Sidebar nav item exports', () => {
  it('exports doctorItems with a stable shape', () => {
    assertShape(doctorItems);
  });

  it('exports patientItems with a stable shape', () => {
    assertShape(patientItems);
  });

  it('exports adminItems with a stable shape', () => {
    assertShape(adminItems);
  });

  it('doctor nav includes Prescriptions, Voice, and Video', () => {
    const tos = doctorItems.map(i => i.to);
    expect(tos).toContain('/prescriptions');
    expect(tos).toContain('/voice-consult');
    expect(tos).toContain('/video-consult');
  });

  it('patient nav includes Reminders, Health ID, and Records', () => {
    const tos = patientItems.map(i => i.to);
    expect(tos).toContain('/reminders');
    expect(tos).toContain('/health-id');
    expect(tos).toContain('/records');
  });

  it('admin nav includes Staff, Inventory, and Reports', () => {
    const tos = adminItems.map(i => i.to);
    expect(tos).toContain('/staff');
    expect(tos).toContain('/inventory');
    expect(tos).toContain('/reports');
  });
});
