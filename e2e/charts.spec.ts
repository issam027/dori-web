import { expect, test } from '@playwright/test';
import {
  apiEnvelope,
  buildMonitoringSeries,
  installApiScenario,
} from './support/scenario-fixtures';

const metrics = {
  registered: 85,
  served: 57,
  noShow: 2,
  cancelled: 1,
  averageWaitMinutes: 12,
  medianWaitMinutes: 9,
  p90WaitMinutes: 24,
  averageServiceMinutes: 6,
  medianServiceMinutes: 5,
  p90ServiceMinutes: 14,
};
const series = Array.from({ length: 31 }, (_, index) => ({
  ...metrics,
  registered: index % 7 === 3 ? 0 : index === 29 ? 330 : 85 + (index % 3),
  served: index % 7 === 3 ? 0 : index === 29 ? 140 : 57,
  periodStart: new Date(Date.UTC(2026, 9, index + 1)).toISOString(),
}));

for (const route of ['/reports', '/control-room']) {
  for (const theme of ['light', 'dark']) {
    test(route + ' keeps every series visible with thin lines in ' + theme, async ({ page }) => {
      let single = false;
      await installApiScenario(page, {
        profile: 'manager',
        handlers: [
          async ({ path, route: request }) => {
            if (path !== '/api/v1/monitoring/series') return false;
            await request.fulfill({
              json: apiEnvelope(
                buildMonitoringSeries({
                  totals: metrics,
                  series: single ? series.slice(0, 1) : series,
                }),
              ),
            });
            return true;
          },
        ],
      });
      await page.goto(route);
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
      }, theme);
      const chart = page.locator(
        route === '/reports' ? '.report-chart-canvas' : '.control-room-chart',
      );
      const picker = page.locator(
        route === '/reports'
          ? '.report-trend .report-series-picker'
          : '.control-room-flow-card .report-series-picker',
      );
      await expect(chart.locator('.report-line')).toHaveCount(2);
      while (await picker.locator('button[aria-pressed="false"]').count())
        await picker.locator('button[aria-pressed="false"]').first().click();
      const count = route === '/reports' ? 14 : 4;
      await expect(chart.locator('.report-line')).toHaveCount(count);
      const styles = await chart.locator('.report-line').evaluateAll((elements) =>
        elements.map((element) => {
          const style = getComputedStyle(element);
          return {
            stroke: style.stroke,
            width: style.strokeWidth,
            vector: style.vectorEffect,
            dash: style.strokeDasharray,
            points: (element as SVGPolylineElement).points.numberOfItems,
            finite: !/NaN|Infinity/.test(element.getAttribute('points') ?? ''),
          };
        }),
      );
      for (const style of styles) {
        expect(style.stroke).not.toBe('none');
        expect(style.stroke).not.toBe('rgb(0, 0, 0)');
        expect(style.width).toBe('1.75px');
        expect(style.vector).toBe('non-scaling-stroke');
        expect(style.dash).toBe('none');
        expect(style.points).toBe(31);
        expect(style.finite).toBe(true);
      }
      await page.mouse.move(0, 0);
      await expect(chart.locator('.report-point')).toHaveCount(0);
      await chart.locator('.report-hover-band').nth(15).focus();
      await expect(chart.locator('.report-point')).toHaveCount(count);
      await expect(chart.locator('.chart-tooltip')).toBeVisible();
      await expect(chart.locator('.chart-tooltip rect')).not.toHaveCSS('fill', 'rgb(0, 0, 0)');
      await chart.locator('.report-hover-band').nth(15).blur();
      await page.mouse.move(0, 0);
      await chart.screenshot({
        path: 'test-results/charts-' + route.slice(1) + '-' + theme + '.png',
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(chart.locator('.report-line')).toHaveCount(route === '/reports' ? 1 : 2);
      expect(await chart.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
      single = true;
      await page.reload();
      await expect(chart.locator('.report-point')).toHaveCount(route === '/reports' ? 1 : 2);
    });
  }
}
