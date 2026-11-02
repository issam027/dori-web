import { expect, test } from '@playwright/test';
import { buildSite, installApiScenario } from './support/scenario-fixtures';

for (const locale of ['ar', 'ar-TN']) {
  for (const width of [390, 1440]) {
    test(
      locale + ' places final error punctuation on the left at ' + String(width),
      async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await installApiScenario(page, {
          profile: 'operator',
          sites: [buildSite()],
          handlers: [
            async ({ path, route }) => {
              if (!path.endsWith('/cockpit')) return false;
              await route.fulfill({ status: 500, json: { code: 'INTERNAL_ERROR' } });
              return true;
            },
          ],
        });
        await page.addInitScript((locale) => {
          localStorage.setItem(
            'dori-preferences',
            JSON.stringify({
              state: { locale, theme: 'light', accentColor: 'lagoon' },
              version: 0,
            }),
          );
        }, locale);
        await page.goto('/desk');
        await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
        await expect(page.locator('.nav-section-toggle').first()).toHaveCSS(
          'direction',
          locale === 'ar' ? 'rtl' : 'ltr',
        );
        const heading = page.locator('.feedback-state[role="alert"] h2');
        await expect(heading).toBeVisible();
        const positions = await heading.evaluate((element) => {
          const text = element.firstChild;
          if (!text?.textContent) throw new Error('Missing error text');
          const range = document.createRange();
          range.setStart(text, 0);
          range.setEnd(text, 1);
          const first = range.getBoundingClientRect().x;
          range.setStart(text, text.textContent.length - 1);
          range.setEnd(text, text.textContent.length);
          return { first, final: range.getBoundingClientRect().x, text: text.textContent };
        });
        expect(positions.text).toMatch(/[!.]$/);
        expect(positions.final).toBeLessThan(positions.first);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      },
    );
  }
}
