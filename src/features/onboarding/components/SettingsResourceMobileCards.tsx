import { useTranslation } from 'react-i18next';
import { Pencil, Power, PowerOff, UserPlus } from 'lucide-react';
import type { QueueResponseDto, SiteResponseDto } from '@/api/generated/models';
import { Button } from '@/design-system/components/Button';
import { DataTableMobileCard } from '@/design-system/components/DataTableMobileCard';
import { MobileCardActionsMenu } from '@/design-system/components/MobileCardActionsMenu';

const statusBadge = (active: boolean, activeLabel: string, inactiveLabel: string) => (
  <span className={`status-badge ${active ? 'status-success' : ''}`}>
    {active ? activeLabel : inactiveLabel}
  </span>
);

export function SiteMobileCard({
  site,
  onEdit,
  onAssign,
  onToggle,
}: {
  site: SiteResponseDto;
  onEdit: () => void;
  onAssign: () => void;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  return (
    <DataTableMobileCard
      title={site.siteName}
      subtitle={`${site.siteType} · ${site.defaultLocale}`}
      badge={statusBadge(site.isActive, t('common.active'), t('common.inactive'))}
      fields={[
        { label: t('common.localisation'), value: site.siteLocation ?? '—', wide: true },
        { label: t('onboarding.settings.fuseau'), value: site.timezone },
        { label: t('common.devise'), value: site.defaultCurrency },
      ]}
      actions={
        <>
          <Button size="small" type="button" onClick={onEdit}>
            <Pencil />
            {t('common.edit')}
          </Button>
          <Button size="small" type="button" onClick={onAssign}>
            <UserPlus />
            {t('settings.assignUser')}
          </Button>
          <MobileCardActionsMenu label={t('common.actions')}>
            <Button size="small" type="button" onClick={onToggle}>
              {site.isActive ? <PowerOff /> : <Power />}
              {site.isActive ? t('onboarding.settings.desactiver') : t('common.activate')}
            </Button>
          </MobileCardActionsMenu>
        </>
      }
    />
  );
}

export function QueueMobileCard({
  queue,
  canAssignOperators,
  onEdit,
  onManageOperators,
  onToggle,
}: {
  queue: QueueResponseDto;
  canAssignOperators: boolean;
  onEdit: () => void;
  onManageOperators: () => void;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const inherited = Object.values(queue.configOrigins).filter((value) => value === 'site').length;
  return (
    <DataTableMobileCard
      title={`${queue.queueCode} · ${queue.queueName}`}
      subtitle={`${String(queue.averageWaitTime)} ${t('common.min')}`}
      badge={statusBadge(queue.isActive, t('common.active'), t('common.inactive'))}
      fields={[
        {
          label: t('common.deviseLocale'),
          value: `${queue.currency} · ${queue.locale}`,
          wide: true,
        },
        { label: t('common.guichets'), value: queue.threadCount },
        {
          label: t('common.rdv'),
          value: queue.appointmentsEnabled ? t('common.actives') : t('common.desactives'),
        },
        {
          label: t('onboarding.settings.origines'),
          value: `${String(inherited)} ${t('onboarding.settings.herites')}`,
        },
      ]}
      actions={
        <>
          <Button size="small" type="button" onClick={onEdit}>
            <Pencil />
            {t('common.edit')}
          </Button>
          {canAssignOperators ? (
            <Button size="small" type="button" onClick={onManageOperators}>
              <UserPlus />
              {t('settings.queueOperators.button')}
            </Button>
          ) : null}
          <MobileCardActionsMenu label={t('common.actions')}>
            <Button size="small" type="button" onClick={onToggle}>
              {queue.isActive ? <PowerOff /> : <Power />}
              {queue.isActive ? t('onboarding.settings.desactiver') : t('common.activate')}
            </Button>
          </MobileCardActionsMenu>
        </>
      }
    />
  );
}
