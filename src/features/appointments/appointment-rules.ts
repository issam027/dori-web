import type { RegistrationResponseDto } from '@/api/generated/models';

export type AppointmentVisualStatus =
  'scheduled' | 'confirmed' | 'present' | 'in-progress' | 'served' | 'no-show' | 'cancelled';

export function appointmentVisualStatus(
  registration: RegistrationResponseDto,
): AppointmentVisualStatus {
  if (registration.status === 'cancelled') return 'cancelled';
  if (registration.status === 'served') return 'served';
  if (registration.status === 'no_show') return 'no-show';
  if (registration.status === 'in_progress') return 'in-progress';
  if (
    registration.status === 'waiting' &&
    ['checked_in', 'present', 'arrived'].includes(registration.appointmentStatus ?? '')
  )
    return 'present';
  if (registration.appointmentStatus === 'confirmed') return 'confirmed';
  return 'scheduled';
}

export function appointmentStatusKey(registration: RegistrationResponseDto): string {
  return `appointments.status.${appointmentVisualStatus(registration)}`;
}

export function canManageAppointment(registration: RegistrationResponseDto): boolean {
  return !['served', 'no_show', 'cancelled'].includes(registration.status);
}

export function canCheckIn(registration: RegistrationResponseDto, today: string): boolean {
  return (
    registration.entryType === 'appointment' &&
    registration.businessDate === today &&
    ['scheduled', 'confirmed'].includes(registration.appointmentStatus ?? '') &&
    registration.status === 'waiting'
  );
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function dateInTimeZone(timeZone: string, value: Date = new Date()): string {
  const parts = zonedParts(value, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function zonedParts(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
    second: read('second'),
  };
}

export function appointmentLocalParts(isoValue: string, timeZone: string) {
  const parts = zonedParts(new Date(isoValue), timeZone);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

export function appointmentUtcIso(date: string, time: string, timeZone: string): string {
  const desired = Date.parse(`${date}T${time}:00.000Z`);
  let candidate = desired;
  for (let iteration = 0; iteration < 2; iteration += 1) {
    const parts = zonedParts(new Date(candidate), timeZone);
    const represented = Date.parse(
      `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.000Z`,
    );
    candidate += desired - represented;
  }
  return new Date(candidate).toISOString();
}

export function weekDates(anchor: Date): string[] {
  const monday = new Date(anchor);
  const day = monday.getUTCDay() || 7;
  monday.setUTCDate(monday.getUTCDate() - day + 1);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + index);
    return isoDate(date);
  });
}
