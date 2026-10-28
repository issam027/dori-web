import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import type { CockpitRecentPassageItemDto, SiteResponseDto } from '@/api/generated/models';
import { notifyError } from '@/core/notifications/error-presentation';
import { Button } from '@/design-system/components/Button';
import { printDocument } from '@/shared/printing/print-document';
import type { PassageSummary } from '@/shared/queue-operations/operation-store';
import { PassagePrintDocument, type PassageSiteDetails } from '../PassagePrintDocument';
import { getPassageReceiptRegistration } from '../api/passage-receipt-api';

interface PrintablePassage {
  passage: PassageSummary;
  site: PassageSiteDetails;
}

function dateValue(value: unknown): string {
  return typeof value === 'string' ? value : new Date().toISOString();
}

export function CockpitPassagePrintButton({
  passage,
  site,
  label,
}: {
  passage: CockpitRecentPassageItemDto;
  site: SiteResponseDto | undefined;
  label: string;
}) {
  const [printable, setPrintable] = useState<PrintablePassage | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!printable) return;
    return printDocument({
      datasetKey: 'printPassage',
      datasetValue: printable.passage.registrationId,
      delayMs: 50,
      onAfterPrint: () => {
        setPrintable(null);
      },
    });
  }, [printable]);

  const preparePrint = async () => {
    if (!site) return;
    setLoading(true);
    try {
      const registration = await getPassageReceiptRegistration(passage.registrationId);
      setPrintable({
        passage: {
          registrationId: passage.registrationId,
          ticketNumber: passage.ticketNumber,
          personName: passage.personName,
          firstName: registration.firstName,
          lastName: registration.lastName,
          arrivedAt: registration.createdAt,
          calledAt: dateValue(passage.calledAt),
          closedAt: dateValue(passage.closedAt),
          threadNumber: passage.threadNumber ?? 0,
          outcome: passage.outcome,
        },
        site: {
          siteName: site.siteName,
          timezone: site.timezone,
          siteLocation: site.siteLocation,
          siteLogoUrl: site.siteLogoUrl,
        },
      });
    } catch (error) {
      notifyError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="unstyled"
        className="button button-ghost button-sm print-hidden"
        type="button"
        disabled={loading || !site}
        aria-busy={loading}
        onClick={() => {
          void preparePrint();
        }}
      >
        <Printer aria-hidden="true" />
        {label}
      </Button>
      {printable ? (
        <PassagePrintDocument passage={printable.passage} site={printable.site} />
      ) : null}
    </>
  );
}
