import { i18n, setLanguage } from '@/core/i18n/i18n';
import { auditActionCodes, auditActionLabel } from './audit-actions';

afterEach(async () => {
  await setLanguage('fr');
});
it.each(['fr', 'en', 'ar', 'ar-TN'])(
  'provides its own action labels and an unknown-action fallback in %s',
  async (locale) => {
    await setLanguage(locale);
    const ownCatalog = i18n.getResourceBundle(locale, 'fallback') as Record<string, string>;
    for (const code of auditActionCodes) {
      expect(ownCatalog['audit.eventActions.' + code], code).toBeTruthy();
      const label = auditActionLabel(code, i18n.t.bind(i18n));
      expect(label).not.toBe(code);
      expect(label).not.toMatch(/^audit\./);
    }
    expect(auditActionLabel('future.unknownAction', i18n.t.bind(i18n))).toBe(
      i18n.t('audit.eventActions.unknown'),
    );
  },
);
