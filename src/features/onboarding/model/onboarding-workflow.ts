import type { CreateQueueDto } from '@/api/generated/models';
import { initialOnboardingDraft, type OnboardingDraft } from './onboarding-draft';

export function recordCreatedQueue(
  draft: OnboardingDraft,
  queue: CreateQueueDto,
  queueId: number,
): OnboardingDraft {
  return {
    ...draft,
    confirmedQueueIds: {
      ...draft.confirmedQueueIds,
      [queue.queueCode.toUpperCase()]: queueId,
    },
  };
}

export function completeSiteActivation(draft: OnboardingDraft) {
  return {
    activatedSiteName: draft.site.siteName,
    nextDraft: structuredClone(initialOnboardingDraft),
  };
}

export function moveToPreviousOnboardingStep(draft: OnboardingDraft): OnboardingDraft {
  return { ...draft, step: Math.max(1, draft.step - 1) };
}

export function canAdvanceOnboarding(
  draft: OnboardingDraft,
  availableTierCount: number,
): boolean {
  if (draft.step === 3) return draft.queues.length > 0;
  if (draft.step === 4) {
    return (
      availableTierCount > 0 &&
      Object.values(draft.confirmedQueueIds).every(
        (queueId) => (draft.selectedTierIds[String(queueId)] ?? []).length > 0,
      )
    );
  }
  return true;
}
