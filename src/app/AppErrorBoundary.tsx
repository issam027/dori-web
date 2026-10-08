import { Component, type ReactNode } from 'react';
import { i18n } from '@/core/i18n/i18n';

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(): void {
    // A PII-safe telemetry adapter will be attached in the observability phase.
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return <p role="alert">{i18n.t('errors.unexpected')}</p>;
    }
    return this.props.children;
  }
}
