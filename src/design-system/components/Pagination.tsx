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
  const { t, i18n } = useTranslation();
  const number = new Intl.NumberFormat(i18n.language);
  if (totalPages <= 1) return null;
  const pageCount = totalPages;
  return (
    <nav className="pagination" aria-label={t('pagination.label')}>
      <Button
        variant="unstyled"
        type="button"
        className="button"
        aria-label={t('pagination.previous')}
        disabled={page <= 1}
        onClick={() => {
          onPageChange(page - 1);
        }}
      >
        <ChevronLeft aria-hidden="true" />
        <span className="pagination-button-label">{t('pagination.previous')}</span>
      </Button>
      <span className="pagination-position" role="status">
        <span className="pagination-position-full">
          {t('pagination.position', { page, totalPages: pageCount })}
        </span>
        <span className="pagination-position-compact" aria-hidden="true" dir="ltr">
          {number.format(page)} / {number.format(pageCount)}
        </span>
      </span>
      <Button
        variant="unstyled"
        type="button"
        className="button"
        aria-label={t('pagination.next')}
        disabled={page >= pageCount}
        onClick={() => {
          onPageChange(page + 1);
        }}
      >
        <span className="pagination-button-label">{t('pagination.next')}</span>
        <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  );
}
