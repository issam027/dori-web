import { expect, test } from '@playwright/test';
import { buildSite, buildQueue, installApiScenario } from './support/scenario-fixtures';

test.use({ hasTouch: true });
for (const width of [1023, 1024, 1101]) {
  test('tablet layout and keyboard regions at ' + String(width), async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await installApiScenario(page, {
      profile: 'root',
      sites: [buildSite()],
      queues: [buildQueue()],
    });
    await page.goto('/appointments');
    const calendar = page.locator('.week-calendar');
    await expect(calendar).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await calendar.focus();
    await expect(calendar).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => calendar.evaluate((e) => e.scrollLeft)).toBeGreaterThan(0);
    await page.goto('/onboarding');
    await expect(page.locator('.onboarding-layout')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const height = await page
      .locator('.onboarding-layout input')
      .first()
      .evaluate((e) => e.getBoundingClientRect().height);
    expect(height).toBeGreaterThanOrEqual(44);
    await page.goto('/display');
    const preview = page.locator('.experience-preview');
    await expect(preview).toBeVisible();
    await preview.focus();
    await expect(preview).toBeFocused();
    await expect(page.getByRole('region', { name: /Aperçu/ })).toBeVisible();
  });
}
