import type { ReactNode } from 'react';
import { MOBILE_QUERY, useMediaQuery } from '@/shared/useMediaQuery';

/** Secondary content stays expanded on desktop and is disclosed on mobile. */
export function ResponsiveDetails({
  summary,
  children,
  className = '',
  unwrappedOnDesktop = false,
}: {
  summary: ReactNode;
  children: ReactNode;
  className?: string;
  unwrappedOnDesktop?: boolean;
}) {
  const mobile = useMediaQuery(MOBILE_QUERY);
  return mobile ? (
    <details className={`mobile-disclosure ${className}`}>
      <summary>{summary}</summary>
      <div className="mobile-disclosure-body">{children}</div>
    </details>
  ) : unwrappedOnDesktop ? (
    <>{children}</>
  ) : (
    <div className={className}>{children}</div>
  );
}
