import { i18n } from '@/core/i18n/i18n';
import { NormalizedApiError } from '@/core/errors/normalized-api-error';
import { notify } from './notification-store';

export interface ErrorPresentation {
  title: string;
  message: string;
  correlationId?: string;
}

const statusMessages: Record<number, string> = {
  400: 'Les informations envoyées ne sont pas valides. Vérifiez votre saisie.',
  401: 'Votre session a expiré. Reconnectez-vous pour continuer.',
  403: 'Vous n’avez pas l’autorisation nécessaire pour cette action.',
  404: 'La ressource demandée est introuvable ou n’est plus disponible.',
  409: 'Cette action entre en conflit avec des données qui viennent de changer.',
  422: 'Cette action ne peut pas être réalisée dans la situation actuelle.',
  429: 'Trop de demandes ont été envoyées. Patientez quelques instants.',
  500: 'Le service a rencontré une erreur interne.',
  502: 'Le service est momentanément indisponible.',
  503: 'Le service est momentanément indisponible.',
  504: 'Le service met trop de temps à répondre.',
};

function translatedMessage(error: NormalizedApiError): string | undefined {
  if (!error.translationKey || !i18n.exists(error.translationKey)) return undefined;
  const translated = i18n.t(error.translationKey, error.translationParams);
  return translated === error.translationKey ? undefined : translated;
}

export function presentError(error: unknown): ErrorPresentation {
  if (error instanceof NormalizedApiError) {
    const message =
      translatedMessage(error) ??
      (error.status ? statusMessages[error.status] : undefined) ??
      (typeof navigator !== 'undefined' && !navigator.onLine
        ? 'La connexion réseau semble interrompue. Vérifiez votre accès à Internet.'
        : 'L’action n’a pas pu être réalisée. Réessayez ou transmettez la référence au support.');
    return {
      title: error.status === 409 ? 'Données à actualiser' : 'Action impossible',
      message,
      correlationId: error.correlationId,
    };
  }

  return {
    title: 'Erreur inattendue',
    message:
      typeof navigator !== 'undefined' && !navigator.onLine
        ? 'La connexion réseau semble interrompue. Vérifiez votre accès à Internet.'
        : 'Une erreur inattendue est survenue. Réessayez dans quelques instants.',
  };
}

export function notifyError(error: unknown): void {
  notify({ tone: 'error', ...presentError(error) });
}
