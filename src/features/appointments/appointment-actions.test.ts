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
import { canCheckIn, weekDates } from './appointment-rules';

it('uses the dedicated API operations for the five appointment journeys', async () => {
  const calls: string[] = [];
  mockServer.use(
    http.post('http://localhost:3000/api/v1/registrations', () => {
      calls.push('create');
      return HttpResponse.json({ data: {} });
    }),
    http.post('http://localhost:3000/api/v1/registrations/7/reschedule', () => {
      calls.push('reschedule');
      return HttpResponse.json({ data: {} });
    }),
    http.delete('http://localhost:3000/api/v1/registrations/7', () => {
      calls.push('cancel');
      return HttpResponse.json({ data: {} });
    }),
    http.patch('http://localhost:3000/api/v1/registrations/7', () => {
      calls.push('update');
      return HttpResponse.json({ data: {} });
    }),
    http.post('http://localhost:3000/api/v1/registrations/7/check-in', () => {
      calls.push('check-in');
      return HttpResponse.json({ data: {} });
    }),
  );
  await createAppointment({
    personId: 2,
    queueId: 3,
    tierId: 4,
    entryType: 'appointment',
    scheduledTime: '2026-10-08T10:00:00Z',
  });
  await rescheduleAppointment(7, { scheduledTime: '2026-10-08T11:00:00Z' });
  await cancelAppointment(7);
  await updateAppointment(7, { tierId: 5, languagePreference: 'fr' });
  await checkInAppointment(7);
  expect(calls).toEqual(['create', 'reschedule', 'cancel', 'update', 'check-in']);
});

it('allows check-in only today for a compatible appointment', () => {
  const appointment = {
    entryType: 'appointment',
    businessDate: '2026-10-08',
    appointmentStatus: 'confirmed',
    status: 'waiting',
  } as RegistrationResponseDto;
  expect(canCheckIn(appointment, '2026-10-08')).toBe(true);
  expect(canCheckIn({ ...appointment, businessDate: '2026-10-09' }, '2026-10-08')).toBe(false);
  expect(canCheckIn({ ...appointment, status: 'served' }, '2026-10-08')).toBe(false);
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
