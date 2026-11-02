import { expect, test } from '@playwright/test';
import {
  apiEnvelope,
  buildPerson,
  buildSite,
  installApiScenario,
} from './support/scenario-fixtures';

for (const width of [390, 1440]) {
  test(
    'Arabic Tunisian notes keep Latin punctuation and date groups readable at ' + String(width),
    async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      const person = buildPerson({
        firstName: 'Farid',
        lastName: 'Perf-00005',
        activeNoteCount: 1,
        isActive: true,
      });
      const content = 'Note PERF-01 synthetique pour tester les lectures avec notes.';
      await installApiScenario(page, {
        profile: 'operator',
        sites: [buildSite()],
        handlers: [
          async ({ path, route }) => {
            if (path === '/api/v1/persons') {
              await route.fulfill({
                json: apiEnvelope({
                  items: [person],
                  total: 1,
                  page: 1,
                  pageSize: 10,
                  totalPages: 1,
                }),
              });
              return true;
            }
            if (path.endsWith('/notes')) {
              await route.fulfill({
                json: apiEnvelope({
                  items: [
                    {
                      noteId: 'note-bidi',
                      personId: person.personId,
                      content,
                      authorUsername: 'perf01_manager',
                      createdAt: '2026-10-31T11:57:00Z',
                    },
                  ],
                  total: 1,
                  page: 1,
                  pageSize: 100,
                  totalPages: 1,
                }),
              });
              return true;
            }
            return false;
          },
        ],
      });
      await page.addInitScript(() => {
        localStorage.setItem(
          'dori-preferences',
          JSON.stringify({
            state: { locale: 'ar-TN', theme: 'light', accentColor: 'lagoon' },
            version: 0,
          }),
        );
      });
      await page.goto('/persons');
      await page.locator('.person-notes-button:visible').first().click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toHaveAttribute('dir', 'rtl');
      const note = dialog.locator('blockquote');
      await expect(note).toHaveText(content);
      await expect(note).toHaveCSS('direction', 'ltr');
      const punctuation = await note.evaluate((element) => {
        const text = element.firstChild;
        if (!text?.textContent) throw new Error('Missing rendered text');
        const range = document.createRange();
        range.setStart(text, 0);
        range.setEnd(text, 1);
        const first = range.getBoundingClientRect().x;
        range.setStart(text, text.textContent.length - 1);
        range.setEnd(text, text.textContent.length);
        return { first, last: range.getBoundingClientRect().x };
      });
      // On a narrow screen the final period can be on a subsequent line.
      expect(punctuation.last).toBeGreaterThanOrEqual(punctuation.first);
      await expect(dialog.locator('.note-meta bdi').first()).toHaveText('perf01_manager');
      const date = dialog.locator('time');
      await expect(date.locator('..')).toHaveAttribute('dir', 'rtl');
      const datePositions = await date.evaluate((element) => {
        const text = element.firstChild;
        if (!text?.textContent) throw new Error('Missing rendered text');
        const value = text.textContent;
        const rect = (start: number, length: number) => {
          const range = document.createRange();
          range.setStart(text, start);
          range.setEnd(text, start + length);
          return range.getBoundingClientRect().x;
        };
        return { day: rect(value.indexOf('31'), 2), year: rect(value.indexOf('2026'), 4) };
      });
      expect(datePositions.day).toBeGreaterThan(datePositions.year);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: testInfo.outputPath('notes-bidi.png'), fullPage: true });
    },
  );
}
