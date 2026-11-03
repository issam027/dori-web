import { expect, test } from '@playwright/test';
import {
  apiEnvelope,
  buildQueue,
  buildSite,
  installApiScenario,
} from './support/scenario-fixtures';

for (const width of [390, 1440]) {
  for (const screen of ['cockpit', 'kiosk', 'display', 'tracking', 'installations'] as const) {
    test(
      'heartbeat indicator is shared on ' + screen + ' at ' + String(width),
      async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 900 });
        await installApiScenario(page, {
          profile:
            screen === 'installations'
              ? 'root'
              : screen === 'kiosk' || screen === 'display'
                ? 'kiosk'
                : 'operator',
          userOverrides:
            screen === 'installations' ? { permissions: ['edge_installation_manage'] } : undefined,
          sites: [buildSite()],
          queues: [buildQueue()],
          handlers: [
            async ({ path, route }) => {
              if (path.includes('/realtime/')) {
                await route.fulfill({
                  contentType: 'text/event-stream',
                  body: 'event: heartbeat\ndata: {}\n\n',
                });
                return true;
              }
              if (path === '/api/v1/public/registrations/position') {
                await route.fulfill({
                  json: apiEnvelope({
                    ticketNumber: 'T-42',
                    status: 'waiting',
                    registrationStatus: 'waiting',
                    position: 3,
                    estimatedWaitMinutes: 6,
                    sourceConnectivity: 'online',
                  }),
                });
                return true;
              }
              if (path === '/api/v1/edge/installations') {
                await route.fulfill({ json: apiEnvelope([]) });
                return true;
              }
              return false;
            },
          ],
        });
        const routes = {
          cockpit: '/desk',
          kiosk: '/kiosk',
          display: '/display',
          tracking: '/track?token=550e8400-e29b-41d4-a716-446655440000',
          installations: '/admin/edge-installations',
        };
        await page.goto(routes[screen]);
        const indicator = page.locator('.realtime-connection-indicator');
        await expect(indicator).toHaveCount(1);
        await expect(indicator).toHaveClass(/is-active/);
        await expect(indicator).toBeVisible();
        await expect(indicator).toHaveAttribute('role', 'status');
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        ).toBe(true);
        if (screen === 'kiosk' || screen === 'installations')
          await page.screenshot({ path: testInfo.outputPath('heartbeat.png') });
      },
    );
  }
}
