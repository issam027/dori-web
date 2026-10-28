import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { RegistrationDetailsModal } from './RegistrationDetailsModal';

vi.mock('./hooks/useQueueOperations', () => ({
  useRegistration: () => ({
    isLoading: false,
    data: {
      data: {
        registrationId: 'registration-1',
        registrationTrackingToken: 'tracking-token',
        queueId: 'queue-uuid-that-must-not-be-displayed',
        personId: 'person-1',
        ticketNumber: 'A001',
        status: 'in_progress',
        businessDate: '2026-10-28',
        createdAt: '2026-10-28T08:00:00.000Z',
        updatedAt: '2026-10-28T08:05:00.000Z',
        entryType: 'walkin',
        tierId: 'tier-1',
        tierName: 'Standard',
      },
    },
  }),
}));

vi.mock('@/features/persons/hooks/usePersons', () => ({
  usePerson: () => ({
    data: {
      data: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        phoneNumber: null,
        email: null,
        preferredLanguage: 'fr',
      },
    },
  }),
}));

vi.mock('@/features/public-experiences/TrackingQr', () => ({ TrackingQr: () => null }));

it('displays the provided queue name instead of the technical queue id', () => {
  render(
    <RegistrationDetailsModal
      registrationId="registration-1"
      queueName="Accueil général"
      open
      onOpenChange={() => undefined}
    />,
  );

  expect(screen.getByRole('dialog')).toHaveTextContent('Accueil général');
  expect(screen.getByRole('dialog')).not.toHaveTextContent('queue-uuid-that-must-not-be-displayed');
});
