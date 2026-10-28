import { render, screen } from '@testing-library/react';
import { Activity } from 'lucide-react';
import { MetricCard } from './Card';

describe('MetricCard', () => {
  it('uses the shared metric structure and semantic tone', () => {
    render(
      <MetricCard
        label="Appels actifs"
        value={3}
        detail="En cours"
        icon={<Activity data-testid="metric-icon" />}
        tone="warning"
      />,
    );

    const card = screen.getByText('Appels actifs').closest('section');
    expect(card).toHaveClass('metric-card', 'metric-card-warning');
    expect(screen.getByTestId('metric-icon').closest('.metric-icon')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(screen.getByText('3')).toHaveClass('metric-value');
  });
});
