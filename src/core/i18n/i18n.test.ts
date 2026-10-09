import { http, HttpResponse } from 'msw';
import { mockServer } from '@/shared/testing/mock-server';
import { getLoadedBundleVersion, i18n, loadTranslationBundle } from './i18n';

describe('translation bundles', () => {
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
