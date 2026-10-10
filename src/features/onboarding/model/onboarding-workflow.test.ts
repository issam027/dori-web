import { describe, expect, it } from 'vitest';
import { initialOnboardingDraft } from './onboarding-draft';
import {
  canAdvanceOnboarding,
  completeSiteActivation,
  moveToPreviousOnboardingStep,
  recordCreatedQueue,
} from './onboarding-workflow';

describe('onboarding workflow', () => {
  it('retains queues already created when a later creation must be retried', () => {
    const draft = {
      ...structuredClone(initialOnboardingDraft),
      step: 3,
      queues: [
        { queueCode: 'ACC', queueName: 'Accueil' },
        { queueCode: 'LAB', queueName: 'Laboratoire' },
      ],
    };
    const firstQueue = draft.queues[0];
    expect(firstQueue).toBeDefined();
    if (!firstQueue) throw new Error('Fixture queue is missing');
    const afterFirstCreation = recordCreatedQueue(draft, firstQueue, 41);
    expect(afterFirstCreation.confirmedQueueIds).toEqual({ ACC: 41 });
    expect(afterFirstCreation.confirmedQueueIds.LAB).toBeUndefined();
  });

  it('requires one tier per confirmed queue before leaving the tier step', () => {
    const draft = {
      ...structuredClone(initialOnboardingDraft),
      step: 4,
      confirmedQueueIds: { ACC: 41, LAB: 42 },
      selectedTierIds: { '41': [1] },
    };
    expect(canAdvanceOnboarding(draft, 3)).toBe(false);
    expect(
      canAdvanceOnboarding({ ...draft, selectedTierIds: { '41': [1], '42': [2] } }, 3),
    ).toBe(true);
  });

  it('resets the complete wizard state after activation', () => {
    const draft = {
      ...structuredClone(initialOnboardingDraft),
      step: 6,
      confirmedSiteId: 18,
      site: { ...initialOnboardingDraft.site, siteName: 'Centre Nord' },
    };
    const result = completeSiteActivation(draft);
    expect(result.activatedSiteName).toBe('Centre Nord');
    expect(result.nextDraft).toEqual(initialOnboardingDraft);
    expect(result.nextDraft).not.toBe(initialOnboardingDraft);
  });

  it('supports a back transition without going before the first step', () => {
    expect(
      moveToPreviousOnboardingStep({ ...structuredClone(initialOnboardingDraft), step: 4 }).step,
    ).toBe(3);
    expect(moveToPreviousOnboardingStep(structuredClone(initialOnboardingDraft)).step).toBe(1);
  });
});
