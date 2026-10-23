import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/shared/testing/mock-server';
import { PersonNotesViewer } from './PersonNotesViewer';

it('loads notes without requesting the person detail', async () => {
  let personDetailRequests = 0;
  mockServer.use(
    http.get('http://localhost:3000/api/v1/persons/00000000-0000-4000-8000-000000000042/notes', () =>
      HttpResponse.json({
        code: 'OK',
        translationKey: null,
        translationParams: {},
        data: { page: 1, pageSize: 100, total: 0, totalPages: 0, items: [] },
      }),
    ),
    http.get('http://localhost:3000/api/v1/persons/00000000-0000-4000-8000-000000000042', () => {
      personDetailRequests += 1;
      return HttpResponse.json({ code: 'OK' });
    }),
  );

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <PersonNotesViewer
        personId={'00000000-0000-4000-8000-000000000042'}
        personName="Ada Lovelace"
        open
        onOpenChange={() => undefined}
      />
    </QueryClientProvider>,
  );

  expect(await screen.findByRole('heading', { name: /aucune note/i })).toBeVisible();
  expect(screen.getByRole('dialog')).toHaveTextContent('Ada Lovelace');
  expect(personDetailRequests).toBe(0);
});
