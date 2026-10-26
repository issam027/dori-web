import { useTranslation } from 'react-i18next';
import type { QueueRealtimeHealth } from './queue-realtime-gateway';

export function RealtimeConnectionIndicator({ health }: { health: QueueRealtimeHealth }) {
  const { t } = useTranslation();
  return (
    <span className={`realtime-connection-indicator is-${health}`} role="status" aria-live="polite">
      <i aria-hidden="true" />
      {t(`realtime.connection.${health}`)}
    </span>
  );
}
