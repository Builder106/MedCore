import { describe, expect, it, vi } from 'vitest';
import {
  checkInteractionViaOpenFDA,
  lookupFallback,
  resolveInteraction,
} from '../lib/interactions.js';

describe('interactions lib', () => {
  it('looks up fallback interactions both forward and reversed', () => {
    const res1 = lookupFallback('Metformin', 'Ibuprofen');
    expect(res1.level).toBe('warning');
    expect(res1.source).toBe('fallback');

    const res2 = lookupFallback('Ibuprofen', 'Metformin');
    expect(res2.level).toBe('warning');
    expect(res2.source).toBe('fallback');

    const res3 = lookupFallback('Warfarin', 'Aspirin');
    expect(res3.level).toBe('critical');

    const resNone = lookupFallback('Amoxicillin', 'Paracetamol');
    expect(resNone.level).toBe('none');
    expect(resNone.source).toBe('none');
  });

  it('checks interactions via OpenFDA with different severity levels', async () => {
    // Critical match
    const mockFetchCritical = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{ drug_interactions: ['Severe contraindicated reaction leading to fatal risk.'] }],
      }),
    });

    const resCrit = await checkInteractionViaOpenFDA('DrugA', 'DrugB', mockFetchCritical as any);
    expect(resCrit?.level).toBe('critical');
    expect(resCrit?.source).toBe('openfda');

    // Warning match
    const mockFetchWarning = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{ drug_interactions: ['Monitor patient closely for increased risk.'] }],
      }),
    });

    const resWarn = await checkInteractionViaOpenFDA('DrugA', 'DrugB', mockFetchWarning as any);
    expect(resWarn?.level).toBe('warning');

    // Info match (default when no critical/warning keywords match)
    const mockFetchInfo = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{ drug_interactions: ['Concurrent administration studied in pharmacokinetic trials.'] }],
      }),
    });

    const resInfo = await checkInteractionViaOpenFDA('DrugA', 'DrugB', mockFetchInfo as any);
    expect(resInfo?.level).toBe('info');

    // Missing or empty drug_interactions in results
    const mockFetchUndefinedInteractions = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{}],
      }),
    });
    expect(await checkInteractionViaOpenFDA('DrugA', 'DrugB', mockFetchUndefinedInteractions as any)).toBeNull();

    // Empty results array
    const mockFetchEmptyResults = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [],
      }),
    });
    expect(await checkInteractionViaOpenFDA('DrugA', 'DrugB', mockFetchEmptyResults as any)).toBeNull();

    // Missing results property
    const mockFetchNoResults = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    expect(await checkInteractionViaOpenFDA('DrugA', 'DrugB', mockFetchNoResults as any)).toBeNull();

    // HTTP error response
    const mockFetchError = vi.fn().mockResolvedValue({
      ok: false,
    });
    expect(await checkInteractionViaOpenFDA('DrugA', 'DrugB', mockFetchError as any)).toBeNull();

    // Exception thrown by fetch
    const mockFetchThrows = vi.fn().mockRejectedValue(new Error('Network offline'));
    expect(await checkInteractionViaOpenFDA('DrugA', 'DrugB', mockFetchThrows as any)).toBeNull();
  });

  it('resolves interactions with priority on fallback before remote API', async () => {
    const fallbackRes = await resolveInteraction('Warfarin', 'Aspirin');
    expect(fallbackRes.level).toBe('critical');
    expect(fallbackRes.source).toBe('fallback');

    // Non-fallback drug with FDA mock returns remote interaction
    const origFetch = globalThis.fetch;
    try {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [{ drug_interactions: ['Avoid coadministration due to toxicity.'] }],
        }),
      }) as any;

      const remoteRes = await resolveInteraction('DrugAlpha', 'DrugBeta');
      expect(remoteRes.level).toBe('warning');
      expect(remoteRes.source).toBe('openfda');
    } finally {
      globalThis.fetch = origFetch;
    }

    // Non-fallback drug with no FDA response returns none
    const unknownRes = await resolveInteraction('NonExistentDrugX', 'NonExistentDrugY');
    expect(unknownRes.level).toBe('none');
  });
});
