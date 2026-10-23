import { describe, expect, it } from 'vitest';
import {
  clearOnboardingDraft,
  initialOnboardingDraft,
  loadOnboardingDraft,
  queueNeedsCreation,
  saveOnboardingDraft,
} from './onboarding-draft';
describe('onboarding recovery', () => {
  it('restores confirmed IDs without recreating resources', () => {
    let raw: string | null = null;
    const storage = {
      getItem: () => raw,
      setItem: (_key: string, value: string) => {
        raw = value;
      },
    };
    const draft = {
      ...structuredClone(initialOnboardingDraft),
      confirmedSiteId: '00000000-0000-4000-8000-000000000018',
      confirmedQueueIds: { ACC: '00000000-0000-4000-8000-000000000041' },
      queues: [{ queueCode: 'ACC' }, { queueCode: 'LAB' }],
    };
    saveOnboardingDraft(draft, storage);
    const restored = loadOnboardingDraft(storage);
    expect(restored.confirmedSiteId).toBe('00000000-0000-4000-8000-000000000018');
    const [confirmed, pending] = restored.queues;
    expect(confirmed && queueNeedsCreation(restored, confirmed)).toBe(false);
    expect(pending && queueNeedsCreation(restored, pending)).toBe(true);
  });
  it('falls back when storage is corrupt', () => {
    expect(loadOnboardingDraft({ getItem: () => '{broken' })).toEqual(initialOnboardingDraft);
  });
  it('migrates a version 1 draft and fills newly introduced defaults', () => {
    const legacy = JSON.stringify({
      step: 2,
      site: { siteName: 'Site repris' },
      confirmedSiteId: '00000000-0000-4000-8000-000000000009',
    });
    const restored = loadOnboardingDraft({
      getItem: (key) => (key === 'dori:onboarding:v1' ? legacy : null),
    });
    expect(restored.draftVersion).toBe(3);
    expect(restored.confirmedSiteId).toBe('00000000-0000-4000-8000-000000000009');
    expect(restored.site.siteName).toBe('Site repris');
    expect(restored.site.timezone).toBe('Africa/Tunis');
    expect(restored.confirmedQueueIds).toEqual({});
  });
  it('migrates a version 2 tier selection with empty service options', () => {
    const restored = loadOnboardingDraft({
      getItem: (key) =>
        key === 'dori:onboarding:v2'
          ? JSON.stringify({
              draftVersion: 2,
              step: 4,
              confirmedQueueIds: { ACC: '00000000-0000-4000-8000-000000000041' },
              selectedTierIds: { '41': [2] },
            })
          : null,
    });
    expect(restored.draftVersion).toBe(3);
    expect(restored.selectedTierIds).toEqual({ '41': [2] });
    expect(restored.tierConfigurations).toEqual({});
  });
  it('removes a saved draft without deleting any server resource', () => {
    const removedKeys: string[] = [];
    clearOnboardingDraft({
      removeItem: (key) => {
        removedKeys.push(key);
      },
    });
    expect(removedKeys).toEqual(['dori:onboarding:v3', 'dori:onboarding:v2', 'dori:onboarding:v1']);
  });
});
