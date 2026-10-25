import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/design-system/components/Button';

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <nav className="pagination" aria-label={t('pagination.label')}>
      <Button
        variant="unstyled"
        type="button"
        className="button"
        disabled={page <= 1}
        onClick={() => {
          onPageChange(page - 1);
        }}
      >
        <ChevronLeft aria-hidden="true" />
        {t('pagination.previous')}
      </Button>
      <span>{t('pagination.position', { page, totalPages })}</span>
      <Button
        variant="unstyled"
        type="button"
        className="button"
        disabled={page >= totalPages}
        onClick={() => {
          onPageChange(page + 1);
        }}
      >
        {t('pagination.next')}
        <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  );
}
