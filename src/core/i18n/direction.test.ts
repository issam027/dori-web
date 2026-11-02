import { getDirection } from './config';
import { setLanguage } from './i18n';

afterEach(async () => {
  await setLanguage('fr');
});

it.each(['ar'])(
  'applies RTL to standard Arabic locale %s',
  async (locale) => {
    expect(getDirection(locale)).toBe('rtl');
    await setLanguage(locale);
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toMatch(/^ar/);
  },
);

it.each(['ar-TN', 'ar-tn', 'ar_TN', 'tn', 'aeb'])(
  'applies LTR to Tunisian derja locale %s (screen layout left-to-right)',
  async (locale) => {
    expect(getDirection(locale)).toBe('ltr');
    await setLanguage(locale);
    expect(document.documentElement.dir).toBe('ltr');
  },
);

it.each(['fr', 'en'])('restores LTR when switching from Arabic to %s', async (locale) => {
  await setLanguage('ar');
  await setLanguage(locale);
  expect(document.documentElement.dir).toBe('ltr');
});
