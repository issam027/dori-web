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
});

