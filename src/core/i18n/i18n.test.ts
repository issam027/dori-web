import { http, HttpResponse } from 'msw';
import { mockServer } from '@/shared/testing/mock-server';
import { ar } from './locales/ar';
import { en } from './locales/en';
import { fr } from './locales/fr';
import {
  getLoadedBundleVersion,
  i18n,
  loadTranslationBundle,
  setLanguage,
  setTranslationRejectionReporter,
} from './i18n';

const fallbackCatalogs: Record<'fr' | 'en' | 'ar', Record<string, string>> = { fr, en, ar };

describe('translation bundles', () => {
  it('keeps the local fallback catalogs aligned', () => {
    const allKeys = new Set(Object.keys(fallbackCatalogs.fr));
    const missing = Object.fromEntries(
      Object.entries(fallbackCatalogs).map(([locale, catalog]) => [
        locale,
        [...allKeys].filter((key) => !(key in catalog)),
      ]),
    );
    expect(missing).toEqual({ fr: [], en: [], ar: [] });
    const loginKeys = [...allKeys].filter((key) => key.startsWith('auth.login.'));
    expect(loginKeys.length).toBeGreaterThan(0);
    expect(
      loginKeys.filter((key) => fallbackCatalogs.en[key] === fallbackCatalogs.fr[key]),
    ).toEqual([]);
    expect(
      loginKeys.filter((key) => fallbackCatalogs.ar[key] === fallbackCatalogs.fr[key]),
    ).toEqual([]);
  });

  it('provides complete localized copy for the kiosk journey', () => {
    const kioskKeys = [
      'kiosk.queue.waitEstimate',
      'kiosk.tier.name',
      'kiosk.ticket.numberHeading',
      'kiosk.phone.savedNumber',
      'kiosk.walkIn.totalSteps',
      'kiosk.walkIn.steps.service.title',
      'kiosk.walkIn.steps.identity.title',
      'kiosk.walkIn.steps.tier.title',
      'kiosk.walkIn.steps.review.title',
      'kiosk.walkIn.steps.service.description',
      'kiosk.walkIn.steps.identity.description',
      'kiosk.walkIn.steps.tier.description',
      'kiosk.walkIn.steps.review.description',
      'kiosk.errors.phoneAlreadyExists',
      'public-experiences.kiosk.commentPouvonsNousVousAccueillir',
      'public-experiences.kiosk.jeViensSansRendezVous',
      'public-experiences.kiosk.jAiUnRendezVous',
      'public-experiences.kiosk.retrouverMonRendezVous',
      'public-experiences.kiosk.creerMonTicket',
      'public-experiences.kiosk.confirmerMaPresence',
      'public-experiences.kiosk.imprimerMonTicket',
      'public-experiences.kiosk.votreTicketEstPret',
    ];

    for (const key of kioskKeys) {
      expect(fallbackCatalogs.en[key], `${key} (en)`).toBeTruthy();
      expect(fallbackCatalogs.ar[key], `${key} (ar)`).toBeTruthy();
      expect(fallbackCatalogs.en[key], `${key} must not fall back to French in English`).not.toBe(
        fallbackCatalogs.fr[key],
      );
      expect(fallbackCatalogs.ar[key], `${key} must not fall back to French in Arabic`).not.toBe(
        fallbackCatalogs.fr[key],
      );
    }

    const publicKioskKeys = Object.keys(fallbackCatalogs.fr).filter((key) =>
      key.startsWith('public-experiences.kiosk.'),
    );
    for (const key of publicKioskKeys) {
      expect(fallbackCatalogs.ar[key], `${key} must be localized in Arabic`).not.toBe(
        fallbackCatalogs.fr[key],
      );
      if (key !== 'public-experiences.kiosk.service') {
        expect(fallbackCatalogs.en[key], `${key} must be localized in English`).not.toBe(
          fallbackCatalogs.fr[key],
        );
      }
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
    await setLanguage('en');
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

    await setLanguage('fr');
    expect(i18n.t('auth.login')).toBe('Connexion');
    await loadTranslationBundle('fr', 'ihm');
    expect(i18n.t('auth.login')).toBe('Connexion fournie par le service');
  });

  it('rejects an invalid remote placeholder without replacing the local fallback', async () => {
    const onRejected = vi.fn();
    const reporter = vi.fn();
    const restoreReporter = setTranslationRejectionReporter(reporter);
    mockServer.use(
      http.get('http://localhost:3000/api/v1/translations/bundle', () =>
        HttpResponse.json({
          code: 'OK',
          translationKey: null,
          translationParams: {},
          data: {
            locale: 'fr',
            category: 'ihm',
            version: 988,
            entries: { 'common.guichetLabel': 'Guichet distant sans paramètre' },
          },
        }),
      ),
    );

    try {
      await expect(loadTranslationBundle('fr', 'ihm', { force: true, onRejected })).resolves.toBe(
        988,
      );
    } finally {
      restoreReporter();
    }
    expect(reporter).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'fr', category: 'ihm', version: 988 }),
    );
    expect(onRejected).toHaveBeenCalledWith([
      expect.objectContaining({ key: 'common.guichetLabel', reason: 'placeholder-mismatch' }),
    ]);
    expect(i18n.t('common.guichetLabel', { value0: 'A' })).toBe('Guichet A');
  });
});
