import { expect, test } from '@playwright/test';
import {
  apiEnvelope,
  buildQueue,
  buildSite,
  installApiScenario,
} from './support/scenario-fixtures';
for (const width of [390, 768, 1440]) {
  test(
    'quiet cockpit offers appointment planning without overflowing at ' + String(width),
    async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      const queue = buildQueue();
      await installApiScenario(page, {
        profile: 'operator',
        sites: [buildSite()],
        handlers: [
          async ({ path, route }) => {
            if (!path.endsWith('/cockpit')) return false;
            await route.fulfill({
              json: apiEnvelope({
                siteId: queue.siteId,
                siteName: 'Site E2E Alpha',
                serverTime: new Date().toISOString(),
                operator: { userId: '00000000-0000-4000-8000-000000000001', username: 'operator' },
                queues: [
                  {
                    queueId: queue.queueId,
                    queueCode: queue.queueCode,
                    queueName: queue.queueName,
                    waitingCount: 0,
                    remainingAppointmentsCount: 2,
                    estimatedWaitMinutes: null,
                    threadCount: 1,
                    occupiedThreadsCount: 0,
                    availableThreadNumbers: [1],
                    sessions: [],
                    currentOperatorSessionId: null,
                    sessionOpening: {
                      allowed: true,
                      availableThreadNumbers: [1],
                      requiresReplacement: false,
                      replaceableSessions: [],
                    },
                    centralizedNext: { eligible: false, unavailableReason: 'no_session' },
                    activeCall: null,
                    nextCandidates: [],
                  },
                ],
                recentPassages: [],
              }),
            });
            return true;
          },
        ],
      });
      await page.goto('/desk');
      await expect(page.locator('.cockpit-calm-state')).toBeVisible();
      await expect(page.locator('.cockpit-calm-state')).toContainText('2');
      await expect(page.getByRole('link', { name: /pr.parer les rendez-vous/i })).toHaveAttribute(
        'href',
        '/appointments',
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: testInfo.outputPath('calm-state.png'), fullPage: true });
    },
  );
}
test('no calm message is shown when there are no accessible queues', async ({ page }) => {
  await installApiScenario(page, { profile: 'operator', sites: [buildSite()], queues: [] });
  await page.goto('/desk');
  await expect(page.locator('main .page-header')).toBeVisible();
  await expect(page.locator('.cockpit-calm-state')).toHaveCount(0);
});
