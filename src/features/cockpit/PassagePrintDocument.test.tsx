import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PassagePrintDocument } from './PassagePrintDocument';

describe('PassagePrintDocument', () => {
  it('génère un justificatif complet directement dans le body', () => {
    render(
      <PassagePrintDocument
        site={{ siteName: 'Centre DORIFY Lyon', timezone: 'Europe/Paris' }}
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
    expect(screen.getByText('Marie')).toBeInTheDocument();
    expect(screen.getByText('Dupont')).toBeInTheDocument();
    expect(screen.getByText('A0042')).toBeInTheDocument();
    expect(screen.getByText('Centre DORIFY Lyon')).toBeInTheDocument();
    expect(screen.getByText('DORIFY-PASSAGE-42', { exact: false })).toBeInTheDocument();
    expect(screen.queryByText(/Signature du responsable/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText('Justificatif de passage dans un établissement'),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Cachet de l’établissement/i)).toBeInTheDocument();
  });

  it('gère les informations absentes sans inventer de valeur', () => {
    render(
      <PassagePrintDocument
        site={{ siteName: 'Accueil municipal', timezone: 'Europe/Paris' }}
        passage={{
          registrationId: 7,
          ticketNumber: 'B0007',
          personName: '',
          calledAt: '2026-10-10T08:30:00Z',
          closedAt: '2026-10-10T08:45:00Z',
          threadNumber: 0,
          outcome: 'served',
        }}
      />,
    );

    expect(screen.getAllByText(/Non enregistrée/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/^N° 0$/)).not.toBeInTheDocument();
    expect(screen.getByText(/DORIFY-PASSAGE-7/)).toBeInTheDocument();
  });

  it('conserve les textes longs dans les blocs de l’attestation', () => {
    const longSiteName =
      'Centre intercommunal d’accueil et de services administratifs de la métropole';
    const longLastName = 'Dupont de la Vallière-Montmorency';
    render(
      <PassagePrintDocument
        site={{
          siteName: longSiteName,
          siteLocation: 'Bâtiment principal, aile des services aux usagers',
        }}
        passage={{
          registrationId: 88,
          ticketNumber: 'LONG0088',
          personName: `Anne-Marie ${longLastName}`,
          firstName: 'Anne-Marie',
          lastName: longLastName,
          arrivedAt: '2026-10-10T08:15:00Z',
          calledAt: '2026-10-10T08:30:00Z',
          closedAt: '2026-10-10T08:45:00Z',
          threadNumber: 12,
          outcome: 'served',
        }}
      />,
    );

    expect(screen.getAllByText(longSiteName).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(longLastName)).toBeInTheDocument();
    expect(screen.getByText('LONG0088')).toBeInTheDocument();
  });
});
