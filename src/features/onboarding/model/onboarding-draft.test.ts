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
      confirmedSiteId: 18,
      confirmedQueueIds: { ACC: 41 },
      queues: [{ queueCode: 'ACC' }, { queueCode: 'LAB' }],
    };
    saveOnboardingDraft(draft, storage);
    const restored = loadOnboardingDraft(storage);
    expect(restored.confirmedSiteId).toBe(18);
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
      confirmedSiteId: 9,
    });
    const restored = loadOnboardingDraft({
      getItem: (key) => (key === 'dori:onboarding:v1' ? legacy : null),
    });
    expect(restored.draftVersion).toBe(2);
    expect(restored.confirmedSiteId).toBe(9);
    expect(restored.site.siteName).toBe('Site repris');
    expect(restored.site.timezone).toBe('Africa/Tunis');
    expect(restored.confirmedQueueIds).toEqual({});
  });
  it('removes a saved draft without deleting any server resource', () => {
    const removedKeys: string[] = [];
    clearOnboardingDraft({
      removeItem: (key) => {
        removedKeys.push(key);
      },
    });
    expect(removedKeys).toEqual(['dori:onboarding:v2', 'dori:onboarding:v1']);
  });
});
