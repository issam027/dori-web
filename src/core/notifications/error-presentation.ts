import { i18n } from '@/core/i18n/i18n';
import { NormalizedApiError } from '@/core/errors/normalized-api-error';
import { notify } from './notification-store';

export interface ErrorPresentation {
  title: string;
  message: string;
  correlationId?: string;
}

const statusMessageKeys: Record<number, string> = {
  400: 'errors.http.badRequest',
  401: 'errors.http.unauthorized',
  403: 'errors.http.forbidden',
  404: 'errors.http.notFound',
  409: 'errors.http.conflict',
  422: 'errors.http.unprocessable',
  429: 'errors.http.tooManyRequests',
  500: 'errors.http.internal',
  502: 'errors.http.unavailable',
  503: 'errors.http.unavailable',
  504: 'errors.http.timeout',
};

function translatedMessage(error: NormalizedApiError): string | undefined {
  if (!error.translationKey || !i18n.exists(error.translationKey)) return undefined;
  const translated = i18n.t(error.translationKey, error.translationParams);
  return translated === error.translationKey ? undefined : translated;
}

export function presentError(error: unknown): ErrorPresentation {
  if (error instanceof NormalizedApiError) {
    const statusMessageKey = error.status ? statusMessageKeys[error.status] : undefined;
    const message =
      translatedMessage(error) ??
      (statusMessageKey ? i18n.t(statusMessageKey) : undefined) ??
      (typeof navigator !== 'undefined' && !navigator.onLine
        ? i18n.t('errors.networkOffline')
        : i18n.t('errors.actionFailedWithSupport'));
    return {
      title: i18n.t(error.status === 409 ? 'errors.staleData' : 'errors.actionImpossible'),
      message,
      correlationId: error.correlationId,
    };
  }

  return {
    title: i18n.t('errors.unexpectedTitle'),
    message:
      typeof navigator !== 'undefined' && !navigator.onLine
        ? i18n.t('errors.networkOffline')
        : i18n.t('errors.unexpectedRetry'),
  };
}

export function notifyError(error: unknown): void {
  notify({ tone: 'error', ...presentError(error) });
}
