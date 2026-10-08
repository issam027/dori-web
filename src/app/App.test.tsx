import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('redirects an anonymous visitor to the login page', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /connexion/i })).toBeVisible();
  });
});
