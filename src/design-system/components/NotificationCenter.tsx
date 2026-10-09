import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleAlert, Info, X } from 'lucide-react';
import {
  type AppNotification,
  useNotificationStore,
} from '@/core/notifications/notification-store';

const icons = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: CircleAlert,
};

function NotificationItem({ item }: { item: AppNotification }) {
  const dismiss = useNotificationStore((state) => state.dismiss);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || item.duration <= 0) return;
    const timeout = window.setTimeout(() => {
      dismiss(item.id);
    }, item.duration);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [dismiss, item.duration, item.id, paused]);

  const Icon = icons[item.tone];
  return (
    <article
      className={`app-notification tone-${item.tone}`}
      role={item.tone === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => { setPaused(true); }}
      onMouseLeave={() => { setPaused(false); }}
      onFocus={() => { setPaused(true); }}
      onBlur={() => { setPaused(false); }}
    >
      <Icon className="app-notification-icon" aria-hidden="true" />
      <div className="app-notification-content">
        <strong>{item.title}</strong>
        {item.message ? <p>{item.message}</p> : null}
        {item.correlationId ? (
          <small>Référence support : {item.correlationId}</small>
        ) : null}
      </div>
      <button
        type="button"
        className="app-notification-dismiss"
        aria-label="Fermer la notification"
        onClick={() => { dismiss(item.id); }}
      >
        <X aria-hidden="true" />
      </button>
      {item.duration > 0 ? (
        <span
          className="app-notification-timer"
          style={{ animationDuration: `${String(item.duration)}ms`, animationPlayState: paused ? 'paused' : 'running' }}
          aria-hidden="true"
        />
      ) : null}
    </article>
  );
}

export function NotificationCenter() {
  const items = useNotificationStore((state) => state.items);
  return (
    <aside className="app-notification-center" aria-label="Notifications">
      {items.map((item) => (
        <NotificationItem item={item} key={item.id} />
      ))}
    </aside>
  );
}
