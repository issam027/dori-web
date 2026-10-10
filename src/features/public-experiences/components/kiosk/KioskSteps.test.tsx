import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  KioskIdentityStep,
  KioskQueueStep,
  KioskReviewStep,
  KioskTicketResult,
  KioskTierStep,
  KioskWelcomeStep,
} from './KioskSteps';

describe('étapes du kiosque', () => {
  it.each([
    ['accueil', KioskWelcomeStep],
    ['identité', KioskIdentityStep],
    ['file', KioskQueueStep],
    ['forfait', KioskTierStep],
    ['récapitulatif', KioskReviewStep],
  ])('rend le contenu de l’étape %s indépendamment', (label, Step) => {
    render(<Step>{label}</Step>);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('rend le résultat dans son conteneur dédié', () => {
    const { container } = render(<KioskTicketResult>Ticket A001</KioskTicketResult>);
    expect(screen.getByText('Ticket A001')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('kiosk-result');
  });
});
