import { expect, test } from '@playwright/test';

test('shows the public login experience', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: /bienvenue sur votre espace/i })).toBeVisible();
  await expect(page.getByRole('main')).toHaveCount(1);
});
