import { describe, expect, it } from 'vitest';
import {
  notificationRuleSchema,
  tierAssociationSchema,
  translationSchema,
} from './settings-schemas';

describe('settings form schemas', () => {
  it('rejects an incomplete tier association', () => {
    expect(
      tierAssociationSchema.safeParse({
        queueId: '00000000-0000-4000-8000-000000000000',
        tierId: '00000000-0000-4000-8000-000000000000',
        price: -1,
        currency: 'EU',
        order: 1,
        default: false,
      }).success,
    ).toBe(false);
  });

  it('validates a complete notification rule', () => {
    expect(
      notificationRuleSchema.safeParse({
        queueId: '00000000-0000-4000-8000-000000000001',
        tierId: '00000000-0000-4000-8000-000000000002',
        type: 'threshold',
        channel: 'sms',
        threshold: 'position',
        value: 3,
        tracking: true,
      }).success,
    ).toBe(true);
  });

  it('requires a translation key, locale and content', () => {
    expect(
      translationSchema.safeParse({
        key: '',
        category: 'ihm',
        locale: 'fr',
        content: '',
        params: '',
      }).success,
    ).toBe(false);
  });
});
