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
  it('removes a saved draft without deleting any server resource', () => {
    let removedKey = '';
    clearOnboardingDraft({
      removeItem: (key) => {
        removedKey = key;
      },
    });
    expect(removedKey).toBe('dori:onboarding:v1');
  });
});
