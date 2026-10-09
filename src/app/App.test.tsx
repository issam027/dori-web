import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/shared/testing/mock-server';
import { App } from './App';

describe('App', () => {
  it('redirects an anonymous visitor to the login page', async () => {
    mockServer.use(
      http.get('http://localhost:3000/api/v1/auth/me', () =>
        HttpResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 }),
      ),
      http.post('http://localhost:3000/api/v1/auth/refresh', () =>
        HttpResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 }),
      ),
    );
    render(<App />);
    expect(
      await screen.findByRole('heading', { name: /connexion/i }, { timeout: 5_000 }),
    ).toBeVisible();
  });
});
