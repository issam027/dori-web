import {
  CalendarClock,
  CheckCheck,
  CircleCheck,
  CalendarX2,
  Hourglass,
  UserCheck,
  UserX,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { RegistrationResponseDto } from '@/api/generated/models';
import {
  appointmentStatusKey,
  appointmentVisualStatus,
  type AppointmentVisualStatus,
} from './appointment-rules';

const icons: Record<Exclude<AppointmentVisualStatus, 'booked'>, LucideIcon> = {
  scheduled: CalendarClock,
  confirmed: CircleCheck,
  present: UserCheck,
  'in-progress': Hourglass,
  served: CheckCheck,
  'no-show': UserX,
  expired: CalendarX2,
  cancelled: X,
};

export function AppointmentStatusIcon({ appointment }: { appointment: RegistrationResponseDto }) {
  const { t } = useTranslation();
  const status = appointmentVisualStatus(appointment);
  if (status === 'booked') return null;
  const Icon = icons[status];
  const label = t(appointmentStatusKey(appointment));
  return (
    <span className="appointment-state-icon" role="img" aria-label={label} title={label}>
      <Icon aria-hidden="true" />
    </span>
  );
}
