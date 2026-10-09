import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Clipboard, RefreshCcw, RotateCcw } from 'lucide-react';
import { NormalizedApiError } from '@/core/errors/normalized-api-error';

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
    console.error('[DORI unhandled runtime incident]', error);
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
    console.error('[DORI UI incident]', error, info);
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
      `Erreur: ${error?.name ?? 'Error'} — ${error?.message ?? 'Erreur inconnue'}`,
      apiError?.status ? `HTTP: ${String(apiError.status)}` : '',
      apiError?.code ? `Code API: ${apiError.code}` : '',
      apiError?.correlationId ? `Correlation ID: ${apiError.correlationId}` : '',
      '',
      'Pile JavaScript:',
      error?.stack ?? 'Indisponible',
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
          <p className="eyebrow">Incident interface</p>
          <h1>Cette page a rencontré une erreur</h1>
          <p>
            Le reste de l’application reste disponible. Vous pouvez copier le diagnostic ci-dessous.
          </p>
        </div>
        <dl className="runtime-error-summary">
          <div>
            <dt>Incident</dt>
            <dd>{this.state.incidentId}</dd>
          </div>
          <div>
            <dt>Heure</dt>
            <dd>{new Date(this.state.occurredAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt>Route</dt>
            <dd>{window.location.pathname}</dd>
          </div>
          <div>
            <dt>Message</dt>
            <dd>{this.state.error.message}</dd>
          </div>
          {apiError?.status ? (
            <div>
              <dt>HTTP</dt>
              <dd>{apiError.status}</dd>
            </div>
          ) : null}
          {apiError?.correlationId ? (
            <div>
              <dt>Correlation ID</dt>
              <dd>{apiError.correlationId}</dd>
            </div>
          ) : null}
        </dl>
        <details className="runtime-error-details">
          <summary>Détails techniques</summary>
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
            <RotateCcw size={17} /> Réessayer
          </button>
          <button
            className="button"
            type="button"
            onClick={() => {
              window.location.reload();
            }}
          >
            <RefreshCcw size={17} /> Recharger la page
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
            {this.state.copied ? 'Diagnostic copié' : 'Copier le diagnostic'}
          </button>
        </div>
        <p className="runtime-error-privacy">
          Les jetons d’authentification et les paramètres d’URL ne sont pas inclus.
        </p>
      </section>
    );
  }
}
