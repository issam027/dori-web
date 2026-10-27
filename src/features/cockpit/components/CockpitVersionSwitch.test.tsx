import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CockpitVersionSwitch } from './CockpitVersionSwitch';

describe('CockpitVersionSwitch', () => {
  it('links the new cockpit to the legacy version', () => {
    render(
      <MemoryRouter>
        <CockpitVersionSwitch version="new" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link')).toHaveAttribute('href', '/desk/legacy');
  });

  it('links the legacy cockpit to the new version', () => {
    render(
      <MemoryRouter>
        <CockpitVersionSwitch version="legacy" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link')).toHaveAttribute('href', '/desk');
  });
});
