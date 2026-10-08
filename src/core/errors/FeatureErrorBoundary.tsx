import { Component, type ReactNode } from 'react';
import { i18n } from '@/core/i18n/i18n';

interface FeatureErrorBoundaryState {
  error: Error | null;
}

export class FeatureErrorBoundary extends Component<
  { children: ReactNode; onRetry?: () => void },
  FeatureErrorBoundaryState
> {
  state: FeatureErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): FeatureErrorBoundaryState {
    return { error };
  }

  private readonly retry = (): void => {
    this.setState({ error: null });
    this.props.onRetry?.();
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <section role="alert">
        <p>{i18n.t('states.error')}</p>
        <button type="button" onClick={this.retry}>
          {i18n.t('common.retry')}
        </button>
      </section>
    );
  }
}
