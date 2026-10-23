import { http, HttpResponse } from 'msw';
import type { RegistrationResponseDto } from '@/api/generated/models';
import { mockServer } from '@/shared/testing/mock-server';
import {
  cancelAppointment,
  checkInAppointment,
  createAppointment,
  rescheduleAppointment,
  updateAppointment,
} from './appointment-actions';
import {
  appointmentVisualStatus,
  canCheckIn,
  canManageAppointment,
  isTerminalAppointment,
  monthDates,
  weekDates,
} from './appointment-rules';

it('uses the dedicated API operations for the five appointment journeys', async () => {
  const calls: string[] = [];
  mockServer.use(
    http.post('http://localhost:3000/api/v1/registrations', () => {
      calls.push('create');
      return HttpResponse.json({ data: {} });
    }),
    http.post(
      'http://localhost:3000/api/v1/registrations/00000000-0000-4000-8000-000000000007/reschedule',
      () => {
        calls.push('reschedule');
        return HttpResponse.json({ data: {} });
      },
    ),
    http.delete(
      'http://localhost:3000/api/v1/registrations/00000000-0000-4000-8000-000000000007',
      () => {
        calls.push('cancel');
        return HttpResponse.json({ data: {} });
      },
    ),
    http.patch(
      'http://localhost:3000/api/v1/registrations/00000000-0000-4000-8000-000000000007',
      () => {
        calls.push('update');
        return HttpResponse.json({ data: {} });
      },
    ),
    http.post(
      'http://localhost:3000/api/v1/registrations/00000000-0000-4000-8000-000000000007/check-in',
      () => {
        calls.push('check-in');
        return HttpResponse.json({ data: {} });
      },
    ),
  );
  await createAppointment({
    personId: '00000000-0000-4000-8000-000000000002',
    queueId: '00000000-0000-4000-8000-000000000003',
    tierId: '00000000-0000-4000-8000-000000000004',
    entryType: 'appointment',
    scheduledTime: '2026-10-08T10:00:00Z',
  });
  await rescheduleAppointment('00000000-0000-4000-8000-000000000007', {
    scheduledTime: '2026-10-08T11:00:00Z',
  });
  await cancelAppointment('00000000-0000-4000-8000-000000000007');
  await updateAppointment('00000000-0000-4000-8000-000000000007', {
    tierId: '00000000-0000-4000-8000-000000000005',
    languagePreference: 'fr',
  });
  await checkInAppointment('00000000-0000-4000-8000-000000000007');
  expect(calls).toEqual(['create', 'reschedule', 'cancel', 'update', 'check-in']);
});

it('allows check-in only today for a compatible appointment', () => {
  const appointment = {
    entryType: 'appointment',
    businessDate: '2026-10-08',
    appointmentStatus: 'confirmed',
    status: 'waiting',
    isActive: true,
  } as RegistrationResponseDto;
  expect(canCheckIn(appointment, '2026-10-08')).toBe(true);
  expect(canCheckIn({ ...appointment, businessDate: '2026-10-09' }, '2026-10-08')).toBe(false);
  expect(canCheckIn({ ...appointment, status: 'served' }, '2026-10-08')).toBe(false);
  expect(
    canCheckIn(
      {
        ...appointment,
        status: 'booked',
        appointmentStatus: 'rescheduled',
        businessDate: '2026-10-07T22:00:00.000Z',
        isActive: true,
      },
      '2026-10-08',
      '2026-10-08',
    ),
  ).toBe(true);
});

it('builds a complete Monday-to-Sunday week', () => {
  expect(weekDates(new Date('2026-10-08T00:00:00Z'))).toEqual([
    '2026-10-05',
    '2026-10-06',
    '2026-10-07',
    '2026-10-08',
    '2026-10-09',
    '2026-10-10',
    '2026-10-11',
  ]);
});

it('builds the exact calendar grid around a month', () => {
  const dates = monthDates(new Date('2026-10-16T00:00:00Z'));
  expect(dates).toHaveLength(35);
  expect(dates[0]).toBe('2026-09-28');
  expect(dates.at(-1)).toBe('2026-11-01');
  expect(dates).toContain('2026-10-01');
  expect(dates).toContain('2026-10-31');
});

it('maps appointment lifecycle states to stable visual states', () => {
  const appointment = {
    entryType: 'appointment',
    businessDate: '2026-10-11',
    appointmentStatus: 'confirmed',
    status: 'waiting',
  } as RegistrationResponseDto;

  expect(appointmentVisualStatus(appointment)).toBe('confirmed');
  expect(appointmentVisualStatus({ ...appointment, appointmentStatus: 'checked_in' })).toBe(
    'present',
  );
  expect(appointmentVisualStatus({ ...appointment, status: 'in_progress' })).toBe('in-progress');
  expect(
    appointmentVisualStatus({ ...appointment, status: 'booked', appointmentStatus: 'booked' }),
  ).toBe('booked');
  expect(
    appointmentVisualStatus({ ...appointment, status: 'booked', appointmentStatus: 'rescheduled' }),
  ).toBe('booked');
  expect(appointmentVisualStatus({ ...appointment, appointmentStatus: 'expired' })).toBe('expired');
  expect(appointmentVisualStatus({ ...appointment, status: 'cancelled' })).toBe('cancelled');
  expect(canManageAppointment(appointment)).toBe(true);
  expect(canManageAppointment({ ...appointment, status: 'served' })).toBe(false);
  expect(canManageAppointment({ ...appointment, status: 'no_show' })).toBe(false);
  expect(canManageAppointment({ ...appointment, status: 'cancelled' })).toBe(false);
  expect(canManageAppointment({ ...appointment, appointmentStatus: 'expired' })).toBe(false);
  expect(canManageAppointment({ ...appointment, appointmentStatus: 'cancelled' })).toBe(false);
  expect(isTerminalAppointment({ ...appointment, status: 'served' })).toBe(true);
  expect(isTerminalAppointment({ ...appointment, status: 'no_show' })).toBe(true);
  expect(isTerminalAppointment({ ...appointment, status: 'cancelled' })).toBe(true);
  expect(isTerminalAppointment({ ...appointment, appointmentStatus: 'expired' })).toBe(true);
  expect(isTerminalAppointment({ ...appointment, appointmentStatus: 'checked_in' })).toBe(true);
  expect(isTerminalAppointment({ ...appointment, appointmentStatus: 'present' })).toBe(true);
  expect(isTerminalAppointment({ ...appointment, appointmentStatus: 'arrived' })).toBe(true);
  expect(isTerminalAppointment(appointment)).toBe(false);
});
