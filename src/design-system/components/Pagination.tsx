import { useTranslation } from 'react-i18next';

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
      <button
        type="button"
        className="button"
        disabled={page <= 1}
        onClick={() => {
          onPageChange(page - 1);
        }}
      >
        {t('pagination.previous')}
      </button>
      <span>{t('pagination.position', { page, totalPages })}</span>
      <button
        type="button"
        className="button"
        disabled={page >= totalPages}
        onClick={() => {
          onPageChange(page + 1);
        }}
      >
        {t('pagination.next')}
      </button>
    </nav>
  );
}
