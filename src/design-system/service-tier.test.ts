import { describe, expect, it } from 'vitest';
import { serviceTierVisualClass } from './service-tier';

describe('serviceTierVisualClass', () => {
  it.each([
    ['FREE', 'service-tier-free'],
    ['Forfait gratuit', 'service-tier-free'],
    ['STANDARD', 'service-tier-standard'],
    ['Premium', 'service-tier-premium'],
  ])('associe %s à une couleur métier stable', (label, expected) => {
    expect(serviceTierVisualClass(1, label)).toBe(expected);
  });

  it('conserve une couleur de repli stable pour les forfaits personnalisés', () => {
    expect(serviceTierVisualClass(4, 'VIP')).toBe('appointment-tier-3');
  });
});
