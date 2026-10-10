import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { SettingsNavigation } from './SettingsNavigation';

function LocationProbe() {
  return <output>{useLocation().pathname}</output>;
}

describe('SettingsNavigation', () => {
  it('navigates between configuration sections', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/settings/sites']}>
        <SettingsNavigation active="sites" />
        <Routes>
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('link', { name: /files/i }));
    expect(screen.getByText('/settings/queues')).toBeVisible();
  });
});
