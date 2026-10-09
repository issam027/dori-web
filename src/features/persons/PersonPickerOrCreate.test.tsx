import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';
import { mockServer } from '@/shared/testing/mock-server';
import { PersonPickerOrCreate, type PersonChoice } from './PersonPickerOrCreate';

function renderPicker() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Harness() {
    const [choice, setChoice] = useState<PersonChoice | null>(null);
    return (
      <>
        <PersonPickerOrCreate siteId={17} value={choice} onChange={setChoice} />
        <button type="button" disabled={!choice}>
          Suivant
        </button>
      </>
    );
  }
  return render(
    <QueryClientProvider client={queryClient}>
      <Harness />
    </QueryClientProvider>,
  );
}

it('searches automatically from the third character with the active site and five results', async () => {
  const requests: URL[] = [];
  mockServer.use(
    http.get('http://localhost:3000/api/v1/persons', ({ request }) => {
      requests.push(new URL(request.url));
      return HttpResponse.json({
        data: { page: 1, pageSize: 5, total: 0, totalPages: 0, items: [] },
      });
    }),
  );
  renderPicker();
  const input = screen.getByRole('textbox', { name: /rechercher une personne/i });
  await userEvent.type(input, 'ab');
  expect(requests).toHaveLength(0);
  await userEvent.type(input, 'c');
  await waitFor(() => {
    expect(requests).toHaveLength(1);
  });
  expect(requests[0]?.searchParams.get('siteId')).toBe('17');
  expect(requests[0]?.searchParams.get('search')).toBe('abc');
  expect(requests[0]?.searchParams.get('pageSize')).toBe('5');
});

it('enables the next action as soon as a new person is valid', async () => {
  renderPicker();
  await userEvent.click(screen.getByRole('button', { name: 'Nouvelle personne' }));
  expect(screen.getByRole('textbox', { name: /adresse e-mail/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/date de naissance/i)).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: /langue préférée/i })).toHaveValue('fr');
  const next = screen.getByRole('button', { name: 'Suivant' });
  await userEvent.type(screen.getByRole('textbox', { name: /^nom/i }), 'Martin');
  expect(next).toBeDisabled();
  await userEvent.type(screen.getByRole('textbox', { name: /téléphone/i }), '+33612345678');
  await waitFor(() => {
    expect(next).toBeEnabled();
  });
  expect(
    screen.queryByRole('button', { name: /utiliser cette personne/i }),
  ).not.toBeInTheDocument();
});
