import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TranslationsAdminPage } from './TranslationsAdminPage';

const findTranslations = vi.fn();

vi.mock('./api/onboarding-api', () => ({
  findTranslations: (...args: unknown[]) => findTranslations(...args) as never,
  createTranslation: vi.fn(),
  deleteTranslation: vi.fn(),
  updateTranslation: vi.fn(),
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TranslationsAdminPage />
    </QueryClientProvider>,
  );
}

it('issues one translation request after a typing burst reaches four characters', async () => {
  findTranslations.mockResolvedValue({
    data: { data: { page: 1, pageSize: 10, total: 0, totalPages: 0, items: [] } },
  });
  renderPage();
  await waitFor(() => {
    expect(findTranslations).toHaveBeenCalledOnce();
  });
  findTranslations.mockClear();

  await userEvent.type(screen.getByRole('textbox', { name: /clé/i }), 'abcd');

  await waitFor(() => {
    expect(findTranslations).toHaveBeenCalledOnce();
  });
  expect(findTranslations.mock.calls[0]?.[0]).toMatchObject({ key: 'abcd', pageSize: 10 });
});
