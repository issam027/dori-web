import type { CreateQueueDto, CreateSiteDto } from '@/api/generated/models';

export const ONBOARDING_DRAFT_KEY = 'dori:onboarding:v1';

export interface OnboardingDraft {
  step: number;
  site: CreateSiteDto;
  confirmedSiteId?: number;
  queues: CreateQueueDto[];
  confirmedQueueIds: Record<string, number>;
  selectedTierIds: Record<string, number[]>;
  associatedTierQueueIds: number[];
  completedUserIds: number[];
  testValidated: boolean;
}

export const initialOnboardingDraft: OnboardingDraft = {
  step: 1,
  site: {
    siteName: '',
    siteType: 'public',
    timezone: 'Africa/Tunis',
    defaultCurrency: 'TND',
    defaultLocale: 'fr',
    defaultAppointmentsEnabled: false,
    defaultAppointmentSlotDuration: 15,
    defaultSlotCapacity: 1,
    defaultWorkingHoursStart: '08:00',
    defaultWorkingHoursEnd: '17:00',
    defaultBreakStart: '12:00',
    defaultBreakEnd: '14:00',
    defaultLateToleranceMinutes: 60,
    defaultBaseWeightWalkin: 0,
    defaultBaseWeightAppointment: 60,
    defaultEscalationRateWalkin: 1,
    defaultEscalationRateAppointment: 1,
    defaultCarryOverWaiting: false,
    defaultDailyResetMode: 'close_all',
    defaultDailyResetTime: '03:00',
  },
  queues: [],
  confirmedQueueIds: {},
  selectedTierIds: {},
  associatedTierQueueIds: [],
  completedUserIds: [],
  testValidated: false,
};

export function loadOnboardingDraft(
  storage: Pick<Storage, 'getItem'> = localStorage,
): OnboardingDraft {
  try {
    const value = storage.getItem(ONBOARDING_DRAFT_KEY);
    return value
      ? { ...initialOnboardingDraft, ...(JSON.parse(value) as Partial<OnboardingDraft>) }
      : structuredClone(initialOnboardingDraft);
  } catch {
    return structuredClone(initialOnboardingDraft);
  }
}

export function saveOnboardingDraft(
  draft: OnboardingDraft,
  storage: Pick<Storage, 'setItem'> = localStorage,
) {
  storage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
}

export function clearOnboardingDraft(storage: Pick<Storage, 'removeItem'> = localStorage) {
  storage.removeItem(ONBOARDING_DRAFT_KEY);
}

export function queueNeedsCreation(draft: OnboardingDraft, queue: CreateQueueDto) {
  return !draft.confirmedQueueIds[queue.queueCode.toUpperCase()];
}
