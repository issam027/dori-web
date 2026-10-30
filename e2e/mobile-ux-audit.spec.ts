/// <reference lib="dom" />
import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import {
  installApiScenario,
  activateSite,
  apiEnvelope,
  paginated,
  buildPerson,
} from './support/scenario-fixtures';

test('mobile UX evidence collection', async ({ page }) => {
  test.setTimeout(180_000);
  await mkdir('specifications/audits/mobile-after', { recursive: true });
  await installApiScenario(page);
  await activateSite(page);
  const results: unknown[] = [];
  for (const width of [320, 390, 430, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of [
      '/desk',
      '/my-queues',
      '/persons',
      '/appointments',
      '/control-room',
      '/reports',
      '/notifications',
      '/portfolio',
      '/settings/queues',
      '/admin/users',
      '/admin/translations',
      '/audit',
      '/profile',
      '/onboarding',
    ]) {
      await page.goto(path);
      await page.locator('main').waitFor({ state: 'visible' });
      await page.locator('main h1, main h2').first().waitFor({ state: 'visible' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(350);
      const metrics = await page.evaluate(() => {
        const visible = (e: Element) => {
          const r = e.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden';
        };
        return {
          width: innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight,
          headings: [...document.querySelectorAll('main h1, main h2')].map((e) => e.textContent),
          horizontalScroll: [...document.querySelectorAll('main *')]
            .filter(
              (e) =>
                visible(e) &&
                e.scrollWidth > e.clientWidth + 2 &&
                ['auto', 'scroll'].includes(getComputedStyle(e).overflowX),
            )
            .map((e) => ({ class: e.className, client: e.clientWidth, scroll: e.scrollWidth })),
          smallTargets: [...document.querySelectorAll('button, summary')]
            .filter((e) => visible(e) && !e.closest('.sidebar'))
            .map((e) => ({
              label: e.getAttribute('aria-label') || e.textContent.trim(),
              class: e.className,
              w: Math.round(e.getBoundingClientRect().width),
              h: Math.round(e.getBoundingClientRect().height),
            }))
            .filter((e) => e.w < 44 || e.h < 44),
          inputs: [...document.querySelectorAll('main input, main select')]
            .filter(visible)
            .map((e) => ({ type: e.getAttribute('type'), fontSize: getComputedStyle(e).fontSize })),
          collapses: [...document.querySelectorAll<HTMLDetailsElement>('main details')].map(
            (e) => ({
              open: e.open,
              text: e.querySelector('summary')?.textContent,
            }),
          ),
        };
      });
      results.push({ path, ...metrics });
      expect.soft(metrics.scrollWidth, `${path} at ${String(width)}px`).toBeLessThanOrEqual(width);
      if (width === 390)
        await page.screenshot({
          path: `specifications/audits/mobile-after/${path.slice(1).replaceAll('/', '-')}-390.png`,
          fullPage: true,
          animations: 'disabled',
        });
      if (path === '/appointments' && width > 620) {
        await page.getByRole('button', { name: 'Mois', exact: true }).click();
        results.push({
          path: '/appointments#month',
          width,
          calendar: await page
            .locator('.month-calendar')
            .evaluate((e) => ({ client: e.clientWidth, scroll: e.scrollWidth })),
        });
        if (width === 390)
          await page.screenshot({
            path: 'specifications/audits/mobile-after/appointments-month-390.png',
            fullPage: true,
            animations: 'disabled',
          });
      }
    }
  }
  await writeFile(
    'specifications/audits/mobile-after/measurements.json',
    JSON.stringify(results, null, 2),
  );
});

test('mobile interaction evidence', async ({ page }) => {
  test.setTimeout(60_000);
  await mkdir('specifications/audits/mobile-after', { recursive: true });
  await installApiScenario(page, {
    handlers: [
      async ({ path, route }) => {
        if (path === '/api/v1/persons') {
          await route.fulfill({
            json: apiEnvelope(
              paginated([
                buildPerson({
                  firstName: 'Alexandrine-Marie',
                  lastName: 'Ben Abdallah Dupont',
                  email: 'alexandrine.marie.benabdallah@example.com',
                }),
              ]),
            ),
          });
          return true;
        }
        return false;
      },
    ],
  });
  await activateSite(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my-queues');
  await page.locator('main h1').waitFor();
  const overflow = await page.evaluate(() =>
    [...document.querySelectorAll('main *')]
      .filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.right > innerWidth + 1;
      })
      .map((e) => ({
        class: e.className,
        tag: e.tagName,
        right: e.getBoundingClientRect().right,
        text: e.textContent.slice(0, 90),
      })),
  );
  await page.goto('/persons');
  await page.locator('.person-mobile-card').waitFor();
  await page.screenshot({
    path: 'specifications/audits/mobile-after/persons-populated-390.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Nouvelle personne', exact: true }).click();
  await page.getByRole('dialog').waitFor();
  await page.waitForTimeout(350);
  await page.screenshot({
    path: 'specifications/audits/mobile-after/person-form-390.png',
    fullPage: true,
    animations: 'disabled',
  });
  const dialog = await page.getByRole('dialog').evaluate((e) => ({
    width: e.clientWidth,
    scroll: e.scrollWidth,
    footer: e.querySelector('footer')?.textContent,
  }));
  await writeFile(
    'specifications/audits/mobile-after/interactions.json',
    JSON.stringify({ overflow, dialog }, null, 2),
  );
});
