/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import {
  apiEnvelope,
  buildPerson,
  buildQueue,
  buildRegistration,
  buildSite,
  installApiScenario,
  paginated,
} from './support/scenario-fixtures';

const artifacts = 'specifications/audits/mobile-density';
const person = buildPerson({
  isActive: true,
  activeNoteCount: 2,
  preferredLanguage: 'fr',
  firstName: 'Alexandrine-Marie',
  lastName: 'Ben Abdallah Dupont',
  email: 'alexandrine.marie.benabdallah@example.com',
});
const registration = buildRegistration({
  firstName: person.firstName,
  lastName: person.lastName,
  ticketNumber: 'ACC-2026-00042',
  activeNoteCount: 2,
  tierName: 'Consultation et examens spécialisés prioritaires',
});
const site = buildSite({
  siteType: 'public',
  siteLocation: 'Centre des consultations spécialisées',
  defaultLocale: 'fr',
  defaultCurrency: 'EUR',
  defaultWorkingHoursStart: '08:00:00',
  defaultWorkingHoursEnd: '17:00:00',
});
const queue = buildQueue({
  queueName: 'Accueil des consultations spécialisées',
  threadCount: 2,
  currency: 'EUR',
  locale: 'fr',
  configOrigins: {},
  averageWaitTime: 12,
});
const user = {
  userId: '00000000-0000-4000-8000-000000000008',
  username: 'alexandrine.marie.dupont',
  fullName: 'Alexandrine-Marie Ben Abdallah Dupont',
  email: person.email,
  userType: 'human',
  isActive: true,
  languagePreference: 'fr',
  createdAt: '2026-10-09T10:00:00Z',
  updatedAt: '2026-10-09T10:00:00Z',
};

async function setup(page: Page, locale = 'fr') {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await installApiScenario(page, {
    userOverrides: { languagePreference: locale },
    sites: [site],
    queues: [queue],
    handlers: [
      async ({ path, url, route }) => {
        const list = (items: unknown[]) =>
          apiEnvelope({
            ...paginated(items, Number(url.searchParams.get('page') ?? 1), 10),
            total: 120,
            totalPages: 12,
          });
        if (path === '/api/v1/persons') {
          await route.fulfill({ json: list([person]) });
          return true;
        }
        if (path === `/api/v1/persons/${person.personId}`) {
          await route.fulfill({ json: apiEnvelope(person) });
          return true;
        }
        if (path === '/api/v1/users') {
          await route.fulfill({ json: list([user]) });
          return true;
        }
        if (path === '/api/v1/registrations') {
          await route.fulfill({ json: list([registration]) });
          return true;
        }
        if (path === `/api/v1/registrations/${registration.registrationId}`) {
          await route.fulfill({ json: apiEnvelope(registration) });
          return true;
        }
        if (path.endsWith('/notes')) {
          await route.fulfill({
            json: apiEnvelope(
              paginated(
                [1, 2].map((index) => ({
                  noteId: `note-${String(index)}`,
                  personId: person.personId,
                  content: `Note ${String(index)} : informations complémentaires de consultation.`,
                  authorUsername: user.username,
                  createdByUserId: user.userId,
                  createdAt: '2026-10-09T10:00:00Z',
                  isActive: true,
                })),
              ),
            ),
          });
          return true;
        }
        if (path === '/api/v1/roles') {
          await route.fulfill({
            json: apiEnvelope(
              paginated([
                {
                  roleId: '00000000-0000-4000-8000-000000000001',
                  roleName: 'root',
                  rank: 6,
                  isActive: true,
                  permissions: [],
                },
              ]),
            ),
          });
          return true;
        }
        return false;
      },
    ],
  });
  await mkdir(artifacts, { recursive: true });
}

test('an open wizard reflows on rotation without leaving a side gap', async ({ page }) => {
  await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/settings/queues');
  await page
    .locator('.data-table-mobile-card')
    .getByRole('button', { name: 'Modifier', exact: true })
    .click();
  await dialogFits(page);
  const grid = page.getByRole('dialog').locator('.form-grid').first();
  await expect
    .poll(() =>
      grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length),
    )
    .toBe(1);
  await page.setViewportSize({ width: 844, height: 390 });
  await dialogFits(page);
  await expect
    .poll(() =>
      grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length),
    )
    .toBeGreaterThanOrEqual(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await dialogFits(page);
});

test('the landscape rail and wide cards follow Arabic reading direction', async ({ page }) => {
  await setup(page, 'ar');
  await page.addInitScript(() => {
    localStorage.setItem(
      'dori-preferences',
      JSON.stringify({
        state: { theme: 'light', locale: 'ar', accentColor: 'lagoon' },
        version: 0,
      }),
    );
  });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/persons');
  await expect(page.locator('.data-table-mobile-card')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await fits(page);
  const rail = await page.locator('.mobile-bottom-nav').boundingBox();
  expect(rail?.x).toBe(780);
  expect(rail?.width).toBe(64);
  await page.locator('.data-table-mobile-card').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${artifacts}/persons-landscape-rtl.png`, animations: 'disabled' });
});

test('row action menus stay inside a short landscape viewport and above nearby cards', async ({
  page,
}) => {
  await setup(page);
  await page.route(
    (url) => url.pathname === '/api/v1/users',
    async (route) => {
      await route.fulfill({
        json: apiEnvelope(
          paginated(
            Array.from({ length: 12 }, (_, index) => ({
              ...user,
              userId: `user-${String(index)}`,
            })),
          ),
        ),
      });
    },
  );
  await page.setViewportSize({ width: 568, height: 320 });
  await page.goto('/admin/users');
  const trigger = page
    .locator('.data-table-mobile-card')
    .first()
    .getByRole('button', { name: 'Actions', exact: true });
  await trigger.evaluate((element) => {
    element.scrollIntoView({ block: 'center' });
  });
  await trigger.click();
  const menu = page.getByRole('menu', { name: 'Actions', exact: true });
  await expect(menu).toBeVisible();
  const geometry = await menu.boundingBox();
  if (!geometry) throw new Error('Missing action menu');
  expect(geometry.y).toBeGreaterThanOrEqual(0);
  expect(geometry.y + geometry.height).toBeLessThanOrEqual(320);
  expect(geometry.x).toBeGreaterThanOrEqual(0);
  expect(geometry.x + geometry.width).toBeLessThanOrEqual(568);
  const onTop = await menu.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return element.contains(
      document.elementFromPoint(rect.x + rect.width / 2, rect.y + Math.min(20, rect.height / 2)),
    );
  });
  expect(onTop).toBe(true);
  await menu.getByRole('menuitem').last().scrollIntoViewIfNeeded();
  await expect(menu.getByRole('menuitem').last()).toBeVisible();
  await page.screenshot({ path: `${artifacts}/action-menu-landscape.png`, animations: 'disabled' });
  await menu.getByRole('menuitem').last().focus();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

async function fits(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
    .toBeLessThanOrEqual(0);
}

async function dialogFits(page: Page) {
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Missing viewport');
  await expect
    .poll(async () => {
      const bounds = await dialog.boundingBox();
      return bounds ? Math.round(bounds.width) : 0;
    })
    .toBe(viewport.width);
  const geometry = await dialog.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const body = element.querySelector('.dialog-body');
    const footer = element.querySelector('.dialog-actions')?.getBoundingClientRect();
    return {
      x: bounds.x,
      right: bounds.right,
      bodyHeight: body?.getBoundingClientRect().height ?? 0,
      overflow: body ? body.scrollWidth - body.clientWidth : 0,
      bottom: footer?.bottom ?? Infinity,
    };
  });
  expect(geometry.x).toBeCloseTo(0, 0);
  expect(geometry.right).toBeCloseTo(viewport.width, 0);
  expect(geometry.bottom).toBeLessThanOrEqual(viewport.height + 1);
  expect(geometry.bodyHeight).toBeGreaterThan(viewport.height * 0.45);
  expect(geometry.overflow).toBeLessThanOrEqual(1);
}

const viewports = [
  { width: 320, height: 740 },
  { width: 390, height: 844 },
  { width: 568, height: 320 },
  { width: 844, height: 390 },
  { width: 932, height: 430 },
];
for (const viewport of viewports) {
  const size = `${String(viewport.width)}x${String(viewport.height)}`;
  test(`cards use available width and pagination stays on one row at ${size}`, async ({ page }) => {
    await setup(page);
    await page.setViewportSize(viewport);
    for (const path of [
      '/my-queues',
      '/persons',
      '/admin/users',
      '/settings/queues',
      '/settings/sites',
    ]) {
      await page.goto(path);
      const card = page.locator('.data-table-mobile-card').first();
      await expect(card).toBeVisible();
      await fits(page);
      const geometry = await card.evaluate((element) => {
        const mainElement = document.querySelector('main');
        const headingElement = element.querySelector('.data-table-mobile-card-heading > div');
        const bodyElement = element.querySelector('.data-table-mobile-card-body');
        if (!mainElement || !headingElement || !bodyElement)
          throw new Error('Missing card content');
        const bounds = element.getBoundingClientRect(),
          main = mainElement.getBoundingClientRect();
        const heading = headingElement.getBoundingClientRect();
        const badge = element
          .querySelector('.data-table-mobile-card-heading > .status-badge')
          ?.getBoundingClientRect();
        const body = bodyElement.getBoundingClientRect();
        return {
          width: bounds.width,
          mainWidth: main.width,
          bodyWidth: body.width,
          titleBadgeOverlap: badge
            ? Math.min(heading.right, badge.right) - Math.max(heading.left, badge.left) > 1 &&
              Math.min(heading.bottom, badge.bottom) - Math.max(heading.top, badge.top) > 1
            : false,
        };
      });
      expect(geometry.width, path).toBeGreaterThanOrEqual(geometry.mainWidth - 22);
      expect(geometry.bodyWidth, path).toBeGreaterThanOrEqual(geometry.width - 3);
      expect(geometry.titleBadgeOverlap, path).toBe(false);
      const pagination = page.getByRole('navigation', { name: 'Pagination' });
      if (await pagination.count()) {
        const rows = await pagination.evaluate((element) =>
          [...element.children].map((child) => {
            const r = child.getBoundingClientRect();
            return Math.round(r.y + r.height / 2);
          }),
        );
        expect(Math.max(...rows) - Math.min(...rows), path).toBeLessThanOrEqual(1);
        expect((await pagination.boundingBox())?.height).toBeLessThanOrEqual(48);
      }
      if (path === '/persons') {
        await pagination.getByRole('button', { name: 'Suivant', exact: true }).click();
        await expect(pagination.getByRole('status')).toContainText('2 / 12');
      }
      if (path === '/persons' || path === '/settings/queues')
        await page.screenshot({
          path: `${artifacts}/${path.slice(1).replaceAll('/', '-')}-${size}.png`,
          fullPage: viewport.width < viewport.height,
          animations: 'disabled',
        });
    }
    if (viewport.width > viewport.height) {
      const navigation = page.locator('.mobile-bottom-nav');
      const rail = await navigation.boundingBox();
      expect(rail?.width).toBeLessThanOrEqual(80);
      expect(rail?.height).toBe(viewport.height);
      await expect(page.locator('.topbar')).toHaveCSS('position', 'static');
    }
  });

  test(`every dialog family fills the screen at ${size}`, async ({ page }) => {
    await setup(page);
    await page.setViewportSize(viewport);
    const cases = [
      {
        path: '/my-queues',
        selector: '.data-table-mobile-card',
        button: /consulter/i,
        content: '.registration-detail',
      },
      {
        path: '/persons',
        selector: '.page-actions',
        button: /nouvelle personne/i,
        content: '.form-grid',
      },
      {
        path: '/persons',
        selector: '.data-table-mobile-card',
        button: /notes/i,
        content: '.note-pagination',
      },
      {
        path: '/admin/users',
        selector: '.page-actions',
        button: /nouvel utilisateur/i,
        content: '.user-account-wizard',
      },
      {
        path: '/settings/sites',
        selector: '.data-table-mobile-card',
        button: /^modifier$/i,
        content: '.settings-editor-wizard',
      },
      {
        path: '/settings/queues',
        selector: '.data-table-mobile-card',
        button: /^modifier$/i,
        content: '.settings-editor-wizard',
      },
    ];
    for (const [index, entry] of cases.entries()) {
      await page.goto(entry.path);
      await page
        .locator(entry.selector)
        .getByRole('button', { name: entry.button })
        .first()
        .click();
      await expect(page.getByRole('dialog').locator(entry.content)).toBeVisible();
      await dialogFits(page);
      if (viewport.width === 390 || viewport.width === 844)
        await page.screenshot({
          path: `${artifacts}/dialog-${String(index)}-${size}.png`,
          animations: 'disabled',
        });
      await page.locator('.dialog-header-close').click();
      await expect(page.getByRole('dialog')).toBeHidden();
    }
  });
}
