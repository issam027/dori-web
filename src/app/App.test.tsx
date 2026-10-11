import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/shared/testing/mock-server';
import { App } from './App';

describe('App', () => {
  beforeEach(() => {
    mockServer.use(
      http.get('http://localhost:3000/api/v1/auth/me', () =>
        HttpResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 }),
      ),
      http.post('http://localhost:3000/api/v1/auth/refresh', () =>
        HttpResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 }),
      ),
    );
  });

  it('redirects an anonymous visitor to the login page', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(
      await screen.findByRole('heading', { name: /connexion/i }, { timeout: 5_000 }),
    ).toBeVisible();
  });

  it.each([
    ['/forbidden', /vous n’avez pas accès/i],
    ['/route-inconnue', /page est introuvable/i],
    ['/legal', /mentions légales et confidentialité/i],
  ])('renders the public route %s', async (path, heading) => {
    window.history.pushState({}, '', path);
    render(<App />);
    expect(
      await screen.findByRole('heading', { name: heading }, { timeout: 10_000 }),
    ).toBeVisible();
  });

  it('protects a direct human application route', async () => {
    window.history.pushState({}, '', '/desk');
    render(<App />);
    expect(
      await screen.findByRole('heading', { name: /connexion/i }, { timeout: 10_000 }),
    ).toBeVisible();
  });
});
