import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/shared/testing/mock-server';
import { IntraDeploymentStatusGate } from './IntraDeploymentStatusBanner';

vi.mock('@/core/config/deployment-mode', () => ({
  isCloudDeployment: false,
}));

function renderBanner() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <IntraDeploymentStatusGate>
        <div>Contenu métier</div>
      </IntraDeploymentStatusGate>
    </QueryClientProvider>,
  );
}

describe('IntraDeploymentStatusGate', () => {
  it('warns without blocking when cloud status cannot be checked', async () => {
    mockServer.use(
      http.get('http://localhost:3000/api/v1/edge/local-status', () =>
        HttpResponse.json({
          code: 'OK',
          translationKey: null,
          translationParams: {},
          data: {
            configured: true,
            deploymentStatus: 'unknown',
            cloudReachability: 'unreachable',
            lastCloudSuccessAt: null,
            lastCloudError: 'offline',
          },
        }),
      ),
    );

    renderBanner();
    expect(await screen.findByText(/statut cloud non vérifiable/i)).toBeVisible();
    expect(screen.getByText(/fonctions locales restent disponibles/i)).toBeVisible();
    expect(screen.getByText(/contenu métier/i)).toBeVisible();
  });

  it('blocks the application when the persisted deployment is revoked', async () => {
    mockServer.use(
      http.get('http://localhost:3000/api/v1/edge/local-status', () =>
        HttpResponse.json({
          code: 'OK',
          translationKey: null,
          translationParams: {},
          data: {
            configured: true,
            deploymentStatus: 'revoked',
            cloudReachability: 'unreachable',
            lastCloudSuccessAt: '2026-10-30T08:00:00.000Z',
            lastCloudError: null,
          },
        }),
      ),
    );

    renderBanner();
    expect(await screen.findByText(/installation intra révoquée/i)).toBeVisible();
    expect(screen.queryByText(/contenu métier/i)).not.toBeInTheDocument();
    expect(screen.getByText(/blocage restera actif/i)).toBeVisible();
  });
});
