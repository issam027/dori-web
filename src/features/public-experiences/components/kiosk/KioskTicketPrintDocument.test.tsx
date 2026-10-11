import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { KioskTicketPrintDocument } from './KioskTicketPrintDocument';

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,cXI='),
  },
}));

describe('KioskTicketPrintDocument', () => {
  it('renders a complete printable ticket and waits for its QR code', async () => {
    const onReady = vi.fn();
    render(
      <KioskTicketPrintDocument
        ticketNumber="A042"
        queueName="Accueil général"
        trackingUrl="https://dorify.example/track?token=test"
        onReady={onReady}
      />,
    );

    expect(document.body.querySelector('.kiosk-ticket-print-document')).toBeInTheDocument();
    expect(screen.getByText('A042')).toBeInTheDocument();
    expect(screen.getByText('Accueil général')).toBeInTheDocument();
    expect(await screen.findByRole('img', { hidden: true })).toHaveAttribute(
      'src',
      'data:image/png;base64,cXI=',
    );
    await waitFor(() => {
      expect(onReady).toHaveBeenCalled();
    });
  });

  it('is immediately ready when no tracking link exists', async () => {
    const onReady = vi.fn();
    render(<KioskTicketPrintDocument ticketNumber="A043" onReady={onReady} />);
    await waitFor(() => {
      expect(onReady).toHaveBeenCalledOnce();
    });
  });
});
