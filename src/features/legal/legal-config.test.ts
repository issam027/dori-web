import { expect, it } from 'vitest';
import { validateProductionLegalConfig } from './legal-config';

it('blocks missing or fictitious legal production values', () => {
  expect(() => {
    validateProductionLegalConfig({
      entityName: 'ACME',
      address: 'TODO',
      email: 'test@example.com',
      registration: '',
    });
  }).toThrow(/configuration légale/i);
  expect(() => {
    validateProductionLegalConfig({
      entityName: 'Dori SAS',
      address: '10 rue Centrale, Paris',
      email: 'legal@dori.fr',
      registration: 'RCS Paris 123 456 789',
    });
  }).not.toThrow();
});
