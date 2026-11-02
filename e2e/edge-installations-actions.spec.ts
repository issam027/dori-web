import { expect, test } from '@playwright/test';
import { apiEnvelope, installApiScenario } from './support/scenario-fixtures';
for (const width of [390, 1440]) {
  test(
    'intra actions remain spaced and timedOut is readable at ' + String(width),
    async ({ page }) => {
      test.skip(
        process.env.VITE_DORIFY_DEPLOYMENT_MODE !== 'cloud',
        'Installation inventory belongs to the cloud deployment.',
      );
      await page.setViewportSize({ width, height: 900 });
      const installation = {
        installationId: '11111111-1111-4111-8111-111111111111',
        name: 'Agence Test',
        deploymentStatus: 'active',
        status: 'online',
        lastSeenAt: '2026-11-02T12:00:00Z',
      };
      await installApiScenario(page, {
        profile: 'root',
        userOverrides: { permissions: ['edge_installation_manage'] },
        handlers: [
          async ({ path, route }) => {
            if (path === '/api/v1/edge/installations') {
              await route.fulfill({ json: apiEnvelope([installation]) });
              return true;
            }
            if (path === '/api/v1/edge/installations/' + installation.installationId) {
              await route.fulfill({
                json: apiEnvelope({
                  ...installation,
                  commands: [
                    {
                      commandId: 'command',
                      type: 'RUN_HEALTH_CHECK',
                      status: 'timedOut',
                      createdAt: '2026-11-02T11:00:00Z',
                      expiresAt: '2026-11-02T11:15:00Z',
                    },
                  ],
                }),
              });
              return true;
            }
            return false;
          },
        ],
      });
      await page.goto('/admin/edge-installations');
      await page.getByRole('button', { name: /agence test/i }).click();
      await expect(page.getByText('D\u00e9lai d\u00e9pass\u00e9', { exact: true })).toBeVisible();
      const actions = page
        .locator('.edge-installation-actions')
        .filter({ has: page.getByRole('button', { name: /diagnostic/i }) });
      await expect(actions).toHaveCSS('display', 'flex');
      expect(
        await actions.evaluate((element) => Number.parseFloat(getComputedStyle(element).gap)),
      ).toBeGreaterThanOrEqual(8);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    },
  );
}
