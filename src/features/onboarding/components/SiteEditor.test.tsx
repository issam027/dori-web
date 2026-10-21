import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SiteResponseDto } from '@/api/generated/models';
import { SiteEditor } from './SiteEditor';

const site: SiteResponseDto = {
  siteId: 1,
  siteName: 'Ancien nom',
  siteType: 'public',
  timezone: 'Europe/Paris',
  defaultCurrency: 'EUR',
  isActive: true,
  defaultAppointmentsEnabled: true,
  defaultAppointmentSlotDuration: 15,
  defaultSlotCapacity: 2,
  defaultWorkingHoursStart: '08:00',
  defaultWorkingHoursEnd: '18:00',
  defaultLateToleranceMinutes: 5,
  defaultWorkingDays: [1, 2, 3, 4, 5],
  defaultBaseWeightWalkin: 1,
  defaultBaseWeightAppointment: 1,
  defaultEscalationRateWalkin: 1,
  defaultEscalationRateAppointment: 1,
  defaultCarryOverWaiting: false,
  defaultDailyResetMode: 'close_all',
  defaultDailyResetTime: '23:00',
  defaultLocale: 'fr',
  createdAt: '2026-10-19T00:00:00Z',
  updatedAt: '2026-10-19T00:00:00Z',
};

it('updates the intended text and numeric fields before saving', async () => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(
    <SiteEditor
      open
      site={site}
      onOpenChange={() => {
        // Closing is outside this field-mapping characterization.
      }}
      onSave={onSave}
    />,
  );

  const name = screen.getByRole('textbox', { name: /^nom/i });
  await userEvent.clear(name);
  await userEvent.type(name, 'Nouveau site');
  await userEvent.click(screen.getByRole('button', { name: /suivant/i }));

  const capacity = screen.getByRole('spinbutton', { name: /capacité/i });
  await userEvent.clear(capacity);
  await userEvent.type(capacity, '6');
  await userEvent.click(screen.getByRole('button', { name: /suivant/i }));
  await userEvent.click(screen.getByRole('button', { name: /terminer/i }));

  await waitFor(() => {
    expect(onSave).toHaveBeenCalledOnce();
  });
  expect(onSave.mock.calls[0]?.[0]).toMatchObject({
    siteName: 'Nouveau site',
    defaultSlotCapacity: 6,
    defaultWorkingDays: [1, 2, 3, 4, 5],
  });
});
