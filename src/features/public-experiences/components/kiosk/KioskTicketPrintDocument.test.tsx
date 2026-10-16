import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { KioskTicketPrintDocument } from './KioskTicketPrintDocument';

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,dGVzdA=='),
  },
}));

describe('KioskTicketPrintDocument', () => {
  it('renders a complete printable ticket and waits for its QR code', async () => {
    const onReady = vi.fn();
    render(
      <KioskTicketPrintDocument
        ticketNumber="A042"
        siteName="Agence Centre"
        queueName="Accueil général"
        trackingUrl="https://dorify.example/track?token=test"
        onReady={onReady}
      />,
    );

    expect(document.body.querySelector('.kiosk-ticket-print-document')).toBeInTheDocument();
    expect(screen.getByText('A042')).toBeInTheDocument();
    expect(screen.getByText('Agence Centre')).toBeInTheDocument();
    expect(screen.getByText('Accueil général')).toBeInTheDocument();
    expect(await screen.findByRole('img', { hidden: true })).toHaveAccessibleName(
      'QR code permettant d’ouvrir le suivi du ticket',
    );
    await waitFor(() => {
      expect(onReady).toHaveBeenCalled();
    });
  });

  it('does not invent a QR payload when no tracking link exists', async () => {
    const onReady = vi.fn();
    render(<KioskTicketPrintDocument ticketNumber="A043" onReady={onReady} />);
    await waitFor(() => {
      expect(onReady).toHaveBeenCalledOnce();
    });
    expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument();
  });
});
