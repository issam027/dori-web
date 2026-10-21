import { useTranslation } from 'react-i18next';
import { Pencil, Trash2 } from 'lucide-react';
import type { TranslationResponseDto } from '@/api/generated/models';
import { Button } from '@/design-system/components/Button';
import { DataTableMobileCard } from '@/design-system/components/DataTableMobileCard';

export function TranslationMobileCard({
  translation,
  categoryLabel,
  onEdit,
  onDelete,
}: {
  translation: TranslationResponseDto;
  categoryLabel: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  return (
    <DataTableMobileCard
      className="translation-mobile-card"
      title={<code>{translation.translationKey}</code>}
      subtitle={translation.locale.toUpperCase()}
      badge={
        <span className={`status-badge ${translation.isActive ? 'status-success' : ''}`}>
          {translation.isActive ? t('admin.translations.active') : t('admin.translations.inactive')}
        </span>
      }
      fields={[
        {
          label: t('common.contenu'),
          value: <span dir="auto">{translation.content}</span>,
          wide: true,
        },
        {
          label: t('onboarding.settings.categorie'),
          value: <span className="status-badge status-info">{categoryLabel}</span>,
        },
        { label: t('common.language'), value: translation.locale.toUpperCase() },
      ]}
      actions={
        <>
          <Button variant="unstyled" className="button button-small" type="button" onClick={onEdit}>
            <Pencil aria-hidden="true" /> {t('common.edit')}
          </Button>
          <Button
            variant="unstyled"
            className="button button-small button-danger"
            type="button"
            onClick={onDelete}
          >
            <Trash2 aria-hidden="true" /> {t('common.delete')}
          </Button>
        </>
      }
    />
  );
}
