import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/shared/testing/mock-server';
import { EdgeInstallationsPage } from './EdgeInstallationsPage';

const installationId = '11111111-1111-4111-8111-111111111111';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <EdgeInstallationsPage />
    </QueryClientProvider>,
  );
}

describe('EdgeInstallationsPage', () => {
  it('keeps the installation creation available when the inventory is empty', async () => {
    mockServer.use(
      http.get('http://localhost:3000/api/v1/edge/installations', () =>
        HttpResponse.json({
          code: 'OK',
          translationKey: null,
          translationParams: {},
          data: [],
        }),
      ),
    );

    renderPage();
    expect(await screen.findByText(/aucune installation enregistrée/i)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: /enregistrer une installation/i }));
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.getByLabelText(/nom de l’installation/i)).toBeVisible();
  });

  it('lists an installation, opens its detail and queues a health check', async () => {
    let commandQueued = false;
    mockServer.use(
      http.get('http://localhost:3000/api/v1/edge/installations', () =>
        HttpResponse.json({
          code: 'OK',
          translationKey: null,
          translationParams: {},
          data: [
            {
              installationId,
              name: 'Agence centrale',
              status: 'online',
              lastSeenAt: '2026-10-30T08:00:00.000Z',
              createdAt: '2026-10-30T07:00:00.000Z',
            },
          ],
        }),
      ),
      http.get(`http://localhost:3000/api/v1/edge/installations/${installationId}`, () =>
        HttpResponse.json({
          code: 'OK',
          translationKey: null,
          translationParams: {},
          data: {
            installationId,
            name: 'Agence centrale',
            status: 'online',
            lastSeenAt: '2026-10-30T08:00:00.000Z',
            createdAt: '2026-10-30T07:00:00.000Z',
            commands: [],
          },
        }),
      ),
      http.post(
        `http://localhost:3000/api/v1/edge/installations/${installationId}/commands`,
        async ({ request }) => {
          const body = (await request.json()) as { type: string };
          commandQueued = body.type === 'RUN_HEALTH_CHECK';
          return HttpResponse.json(
            {
              code: 'OK',
              translationKey: null,
              translationParams: {},
              data: {},
            },
            { status: 201 },
          );
        },
      ),
    );

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /agence centrale/i }));
    await userEvent.click(await screen.findByRole('button', { name: /lancer un diagnostic/i }));
    await waitFor(() => {
      expect(commandQueued).toBe(true);
    });
  });
});
