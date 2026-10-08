import type { ReactNode } from 'react';

type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

export function StatusBadge({
  tone = 'neutral',
  children,
}: {
  tone?: StatusTone;
  children: ReactNode;
}) {
  return <span className={`status-badge status-${tone}`}>{children}</span>;
}
