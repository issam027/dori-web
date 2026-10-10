import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PassagePrintDocument } from './PassagePrintDocument';

describe('PassagePrintDocument', () => {
  it('génère un justificatif complet directement dans le body', () => {
    render(
      <PassagePrintDocument
        siteName="Centre DORIFY Lyon"
        passage={{
          registrationId: 42,
          ticketNumber: 'A0042',
          personName: 'Marie Dupont',
          arrivedAt: '2026-10-10T08:15:00Z',
          calledAt: '2026-10-10T08:30:00Z',
          closedAt: '2026-10-10T08:45:00Z',
          threadNumber: 3,
          outcome: 'served',
        }}
      />,
    );

    const document = screen.getByRole('article', { hidden: true });
    expect(document).toHaveClass('passage-print-document');
    expect(document.parentElement).toBe(globalThis.document.body);
    expect(screen.getAllByText('Marie Dupont', { selector: '*' }).length).toBeGreaterThan(0);
    expect(screen.getByText('A0042')).toBeInTheDocument();
    expect(screen.getByText('Centre DORIFY Lyon')).toBeInTheDocument();
    expect(screen.getByText(/site Centre DORIFY Lyon/i)).toBeInTheDocument();
    expect(screen.getByText(/Signature du responsable/i)).toBeInTheDocument();
    expect(screen.getByText(/Cachet de l’établissement/i)).toBeInTheDocument();
  });
});
