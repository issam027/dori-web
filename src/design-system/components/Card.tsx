import type { HTMLAttributes, ReactNode } from 'react';

export function Card({ className = '', ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`card ${className}`.trim()} {...props} />;
}

export function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Card className="metric-card">
      <span className="metric-label">{label}</span>
      {icon ? (
        <span className="metric-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <strong className="metric-value">{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </Card>
  );
}
