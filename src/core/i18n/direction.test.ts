import { getDirection } from './config';
import { setLanguage } from './i18n';

afterEach(async () => {
  await setLanguage('fr');
});

it.each(['ar', 'ar-TN', 'ar-tn', 'ar_TN', 'tn', 'aeb'])(
  'applies RTL to Arabic locale %s so trailing punctuation follows the text',
  async (locale) => {
    expect(getDirection(locale)).toBe('rtl');
    await setLanguage(locale);
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toMatch(/^ar/);
  },
);

it.each(['fr', 'en'])('restores LTR when switching from Arabic to %s', async (locale) => {
  await setLanguage('ar-TN');
  await setLanguage(locale);
  expect(document.documentElement.dir).toBe('ltr');
});
