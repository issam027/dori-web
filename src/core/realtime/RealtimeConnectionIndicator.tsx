import { useTranslation } from 'react-i18next';
import type { QueueRealtimeHealth } from './queue-realtime-gateway';

export function RealtimeConnectionIndicator({
  health,
  sseOnly = false,
}: {
  health: QueueRealtimeHealth;
  sseOnly?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <span className={`realtime-connection-indicator is-${health}`} role="status" aria-live="polite">
      <i aria-hidden="true" />
      {t(
        health === 'degraded' && sseOnly
          ? 'realtime.connection.reconnecting'
          : `realtime.connection.${health}`,
      )}
    </span>
  );
}
