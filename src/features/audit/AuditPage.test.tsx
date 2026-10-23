import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/shared/testing/mock-server';
import { AuditPage } from './AuditPage';

const event = {
  eventId: '8f283623-38ea-4654-9338-e48e861d89d6',
  actorUserId: '00000000-0000-4000-8000-000000000007',
  actorDisplayName: 'Ada Lovelace',
  action: 'site.update',
  targetType: 'site',
  targetId: '00000000-0000-4000-8000-000000000042',
  targetDisplayName: 'Agence centrale',
  secondaryTargetId: null,
  secondaryTargetDisplayName: null,
  siteScopeId: '00000000-0000-4000-8000-000000000042',
  siteScopeDisplayName: 'Agence centrale',
  outcome: 'success',
  correlationId: 'corr-01JXYZ',
  requestMethod: 'PATCH',
  requestPath: '/api/v1/sites/00000000-0000-4000-8000-000000000042',
  failureType: null,
  occurredAt: '2026-10-23T08:30:00.000Z',
} as const;

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuditPage />
    </QueryClientProvider>,
  );
}

describe('AuditPage', () => {
  it('lists audit events and opens an enriched detail dialog', async () => {
    mockServer.use(
      http.get('http://localhost:3000/api/v1/audit-events', () =>
        HttpResponse.json({
          code: 'OK',
          translationKey: null,
          translationParams: {},
          data: { page: 1, pageSize: 25, total: 1, totalPages: 1, items: [event] },
        }),
      ),
      http.get(`http://localhost:3000/api/v1/audit-events/${event.eventId}`, () =>
        HttpResponse.json({
          code: 'OK',
          translationKey: null,
          translationParams: {},
          data: {
            ...event,
            actorUsername: 'ada',
            actorFullName: 'Ada Lovelace',
            actorUserType: 'human',
            actorIsActive: true,
            targetIsActive: true,
            secondaryTargetIsActive: null,
            siteScopeLocation: 'Paris',
            siteScopeTimezone: 'Europe/Paris',
            siteScopeIsActive: true,
            actionDisplayName: 'Modification du site',
          },
        }),
      ),
    );

    renderPage();
    const actor = (await screen.findAllByText('Ada Lovelace')).at(0);
    const action = screen.getAllByText('site.update').at(0);
    const viewButton = screen.getAllByRole('button', { name: /voir le détail/i }).at(0);
    if (!actor || !action || !viewButton) throw new Error('The audit event row is incomplete');
    expect(actor).toBeVisible();
    expect(action).toBeVisible();

    await userEvent.click(viewButton);
    expect(await screen.findByRole('dialog')).toBeVisible();
    expect(await screen.findByText('Modification du site')).toBeVisible();
    expect(screen.getByText('corr-01JXYZ')).toBeVisible();
  });

  it('shows the translated empty state', async () => {
    mockServer.use(
      http.get('http://localhost:3000/api/v1/audit-events', () =>
        HttpResponse.json({
          code: 'OK',
          translationKey: null,
          translationParams: {},
          data: { page: 1, pageSize: 25, total: 0, totalPages: 0, items: [] },
        }),
      ),
    );
    renderPage();
    expect(await screen.findByRole('heading', { name: /aucun événement trouvé/i })).toBeVisible();
  });
});
