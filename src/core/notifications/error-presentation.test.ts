import { describe, expect, it } from 'vitest';
import { NormalizedApiError } from '@/core/errors/normalized-api-error';
import { presentError } from './error-presentation';

describe('presentError', () => {
  it('presents a conflict as an actionable business error', () => {
    const result = presentError(
      new NormalizedApiError(
        'INVALID_STATE',
        'apiErrors.missing-key',
        {},
        undefined,
        'corr-123',
        409,
      ),
    );

    expect(result).toEqual({
      title: 'Données à actualiser',
      message: 'Cette action entre en conflit avec des données qui viennent de changer.',
      correlationId: 'corr-123',
    });
  });

  it('never exposes a raw unexpected error message', () => {
    expect(presentError(new Error('secret token')).message).not.toContain('secret token');
  });

  it('presents a duplicate active registration as an actionable appointment error', () => {
    const result = presentError(
      new NormalizedApiError(
        'DUPLICATE_ACTIVE_REGISTRATION',
        'errors.unknown-server-key',
        {},
        undefined,
        'corr-duplicate',
        409,
      ),
    );

    expect(result).toEqual({
      title: 'Rendez-vous déjà planifié',
      message:
        'Cette personne possède déjà un rendez-vous actif pour cette journée. Choisissez une autre date ou reprogrammez le rendez-vous existant.',
      correlationId: 'corr-duplicate',
    });
  });
});
