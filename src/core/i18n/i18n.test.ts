import { http, HttpResponse } from 'msw';
import { mockServer } from '@/shared/testing/mock-server';
import { getLoadedBundleVersion, i18n, loadTranslationBundle } from './i18n';

describe('translation bundles', () => {
  it('keeps the local fallback catalogs aligned', () => {
    const catalogs = Object.fromEntries(
      ['fr', 'en', 'ar'].map((locale) => [
        locale,
        i18n.getResourceBundle(locale, 'fallback') as Record<string, string>,
      ]),
    ) as Record<'fr' | 'en' | 'ar', Record<string, string>>;
    const allKeys = new Set(Object.values(catalogs).flatMap((catalog) => Object.keys(catalog)));
    const missing = Object.fromEntries(
      Object.entries(catalogs).map(([locale, catalog]) => [
        locale,
        [...allKeys].filter((key) => !(key in catalog)),
      ]),
    );
    expect(missing).toEqual({ fr: [], en: [], ar: [] });
    const untranslatedArabic = [...allKeys].filter(
      (key) => catalogs.fr[key] !== catalogs.en[key] && catalogs.ar[key] === catalogs.fr[key],
    );
    expect(untranslatedArabic).toEqual([]);

    const loginKeys = [...allKeys].filter((key) => key.startsWith('auth.login.'));
    expect(loginKeys.length).toBeGreaterThan(0);
    expect(loginKeys.filter((key) => catalogs.en[key] === catalogs.fr[key])).toEqual([]);
    expect(loginKeys.filter((key) => catalogs.ar[key] === catalogs.fr[key])).toEqual([]);

    const parameters = (value: string) =>
      [...value.matchAll(/{{\s*([^},\s]+)[^}]*}}/g)]
        .map((match) => match[1])
        .sort();
    for (const key of allKeys) {
      const expected = parameters(catalogs.fr[key] ?? '');
      expect(parameters(catalogs.en[key] ?? ''), `${key} (en)`).toEqual(expected);
      expect(parameters(catalogs.ar[key] ?? ''), `${key} (ar)`).toEqual(expected);
    }
  });

  it('loads and versions a remote bundle by locale and category', async () => {
    mockServer.use(
      http.get('http://localhost:3000/api/v1/translations/bundle', ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('locale')).toBe('en');
        expect(url.searchParams.get('category')).toBe('ihm');
        return HttpResponse.json({
          code: 'OK',
          translationKey: null,
          translationParams: {},
          data: { locale: 'en', category: 'ihm', version: 3, entries: { 'desk.title': 'Desk' } },
        });
      }),
    );

    await expect(loadTranslationBundle('en')).resolves.toBe(3);
    expect(getLoadedBundleVersion('en')).toBe(3);
    expect(i18n.t('desk.title')).toBe('Desk');
  });

  it('lets the remote ihm bundle override a local fallback with the same key', async () => {
    mockServer.use(
      http.get('http://localhost:3000/api/v1/translations/bundle', () =>
        HttpResponse.json({
          code: 'OK',
          translationKey: null,
          translationParams: {},
          data: {
            locale: 'fr',
            category: 'ihm',
            version: 987,
            entries: { 'auth.login': 'Connexion fournie par le service' },
          },
        }),
      ),
    );

    await i18n.changeLanguage('fr');
    expect(i18n.t('auth.login')).toBe('Connexion');
    await loadTranslationBundle('fr', 'ihm');
    expect(i18n.t('auth.login')).toBe('Connexion fournie par le service');
  });
});
