import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Clipboard, RefreshCcw, RotateCcw } from 'lucide-react';
import { NormalizedApiError } from '@/core/errors/normalized-api-error';
import { i18n } from '@/core/i18n/i18n';

interface AppErrorBoundaryState {
  error: Error | null;
  componentStack: string;
  incidentId: string;
  occurredAt: string;
  copied: boolean;
}

interface AppErrorBoundaryProps {
  children: ReactNode;
  variant?: 'global' | 'embedded';
  resetKey?: string;
}

const emptyState: AppErrorBoundaryState = {
  error: null,
  componentStack: '',
  incidentId: '',
  occurredAt: '',
  copied: false,
};

function safeErrorCode(error: Error | null): string {
  return error instanceof NormalizedApiError ? error.code : 'UNHANDLED_UI_ERROR';
}

function logIncident(kind: string, error: Error): void {
  if (!import.meta.env.DEV) return;
  const apiError = error instanceof NormalizedApiError ? error : null;
  console.error(kind, {
    name: error.name,
    code: safeErrorCode(error),
    status: apiError?.status,
    correlationId: apiError?.correlationId,
  });
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = emptyState;

  componentDidMount(): void {
    if (this.props.variant !== 'embedded') return;
    window.addEventListener('error', this.handleWindowError);
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  componentWillUnmount(): void {
    window.removeEventListener('error', this.handleWindowError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  private captureRuntimeError = (error: Error) => {
    logIncident('[DORI unhandled runtime incident]', error);
    this.setState({
      error,
      componentStack: '',
      incidentId: crypto.randomUUID(),
      occurredAt: new Date().toISOString(),
      copied: false,
    });
  };

  private handleWindowError = (event: ErrorEvent) => {
    this.captureRuntimeError(event.error instanceof Error ? event.error : new Error(event.message));
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error =
      event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason ?? 'Promise rejetée'));
    this.captureRuntimeError(error);
  };

  static getDerivedStateFromError(error: Error): Partial<AppErrorBoundaryState> {
    return {
      error,
      incidentId: crypto.randomUUID(),
      occurredAt: new Date().toISOString(),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ error, componentStack: info.componentStack ?? '' });
    logIncident('[DORI UI incident]', error);
  }

  componentDidUpdate(previousProps: AppErrorBoundaryProps): void {
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) {
      this.setState(emptyState);
    }
  }

  private diagnostic(): string {
    const { error, incidentId, occurredAt, componentStack } = this.state;
    const apiError = error instanceof NormalizedApiError ? error : null;
    return [
      `Incident: ${incidentId}`,
      `Date: ${occurredAt}`,
      `Route: ${window.location.pathname}`,
      `Navigateur: ${navigator.userAgent}`,
      `Erreur: ${safeErrorCode(error)}`,
      apiError?.status ? `HTTP: ${String(apiError.status)}` : '',
      apiError?.code ? `Code API: ${apiError.code}` : '',
      apiError?.correlationId ? `Correlation ID: ${apiError.correlationId}` : '',
      '',
      'Pile JavaScript:',
      error?.stack?.split('\n').slice(1).join('\n') || 'Indisponible',
      '',
      'Pile React:',
      componentStack || 'Indisponible',
    ]
      .filter((line, index, lines) => line || lines[index - 1] !== '')
      .join('\n');
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    const apiError = this.state.error instanceof NormalizedApiError ? this.state.error : undefined;
    return (
      <section
        className={`runtime-error-panel ${this.props.variant === 'embedded' ? 'is-embedded' : 'is-global'}`}
        role="alert"
      >
        <div className="runtime-error-icon" aria-hidden="true">
          <AlertTriangle size={28} />
        </div>
        <div className="runtime-error-heading">
          <p className="eyebrow">{i18n.t('errorBoundary.eyebrow')}</p>
          <h1>{i18n.t('errorBoundary.title')}</h1>
          <p>{i18n.t('errorBoundary.description')}</p>
        </div>
        <dl className="runtime-error-summary">
          <div>
            <dt>{i18n.t('errorBoundary.incident')}</dt>
            <dd>{this.state.incidentId}</dd>
          </div>
          <div>
            <dt>{i18n.t('errorBoundary.time')}</dt>
            <dd>{new Date(this.state.occurredAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt>{i18n.t('errorBoundary.route')}</dt>
            <dd>{window.location.pathname}</dd>
          </div>
          <div>
            <dt>{i18n.t('errorBoundary.message')}</dt>
            <dd>{safeErrorCode(this.state.error)}</dd>
          </div>
          {apiError?.status ? (
            <div>
              <dt>{i18n.t('errorBoundary.http')}</dt>
              <dd>{apiError.status}</dd>
            </div>
          ) : null}
          {apiError?.correlationId ? (
            <div>
              <dt>{i18n.t('errorBoundary.correlationId')}</dt>
              <dd>{apiError.correlationId}</dd>
            </div>
          ) : null}
        </dl>
        <details className="runtime-error-details">
          <summary>{i18n.t('errorBoundary.technicalDetails')}</summary>
          <pre>{this.diagnostic()}</pre>
        </details>
        <div className="runtime-error-actions">
          <button
            className="button button-primary"
            type="button"
            onClick={() => {
              this.setState(emptyState);
            }}
          >
            <RotateCcw size={17} /> {i18n.t('common.retry')}
          </button>
          <button
            className="button"
            type="button"
            onClick={() => {
              window.location.reload();
            }}
          >
            <RefreshCcw size={17} /> {i18n.t('errorBoundary.reload')}
          </button>
          <button
            className="button"
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(this.diagnostic()).then(() => {
                this.setState({ copied: true });
              });
            }}
          >
            <Clipboard size={17} />{' '}
            {this.state.copied ? i18n.t('errorBoundary.copied') : i18n.t('errorBoundary.copy')}
          </button>
        </div>
        <p className="runtime-error-privacy">{i18n.t('errorBoundary.privacy')}</p>
      </section>
    );
  }
}
