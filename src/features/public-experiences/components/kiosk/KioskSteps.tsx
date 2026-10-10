import type { ReactNode } from 'react';

function Step({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export const KioskWelcomeStep = Step;
export const KioskIdentityStep = Step;
export const KioskQueueStep = Step;
export const KioskTierStep = Step;
export const KioskReviewStep = Step;

export function KioskTicketResult({ children }: { children: ReactNode }) {
  return <div className="kiosk-result">{children}</div>;
}
