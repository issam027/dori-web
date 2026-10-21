import { useTranslation } from 'react-i18next';
import { Eye, KeyRound, LogOut, Pencil, Trash2, UserCheck, UserX } from 'lucide-react';
import type { UserSummaryItemDto } from '@/api/generated/models';
import { Button } from '@/design-system/components/Button';
import { MobileCardActionsMenu } from '@/design-system/components/MobileCardActionsMenu';
import { DataTableMobileCard } from '@/design-system/components/DataTableMobileCard';
import { getUserDisplayName } from './user-display';

interface UserMobileCardProps {
  user: UserSummaryItemDto;
  lastLogin: string;
  canDelete: boolean;
  deleteDisabled: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  onResetPassword: () => void;
  onDisconnect: () => void;
}

export function UserMobileCard(props: UserMobileCardProps) {
  const { t } = useTranslation();
  const { user } = props;
  return (
    <DataTableMobileCard
      title={getUserDisplayName(user)}
      subtitle={`@${user.username}`}
      badge={<span className="status-badge status-info">{user.userType}</span>}
      fields={[
        { label: t('common.email'), value: user.email ?? t('settings.noEmail'), wide: true },
        { label: t('common.language'), value: user.languagePreference.toUpperCase() },
        { label: t('admin.users.lastLogin'), value: props.lastLogin },
      ]}
      actions={
        <>
          <Button
            variant="unstyled"
            className="button button-small"
            type="button"
            onClick={props.onView}
          >
            <Eye />
            {t('common.view')}
          </Button>
          <Button
            variant="unstyled"
            className="button button-small"
            type="button"
            onClick={props.onEdit}
          >
            <Pencil />
            {t('common.edit')}
          </Button>
          <MobileCardActionsMenu label={t('common.actions')}>
            {props.canDelete ? (
              <Button
                variant="unstyled"
                className="button button-small button-danger"
                type="button"
                disabled={props.deleteDisabled}
                onClick={props.onDelete}
              >
                <Trash2 />
                {t('common.delete')}
              </Button>
            ) : null}
            <Button
              variant="unstyled"
              className="button button-small"
              type="button"
              onClick={props.onToggleStatus}
            >
              {user.isActive ? <UserX /> : <UserCheck />}
              {user.isActive ? t('admin.users.suspend') : t('common.activate')}
            </Button>
            <Button
              variant="unstyled"
              className="button button-small"
              type="button"
              onClick={props.onResetPassword}
            >
              <KeyRound />
              {t('onboarding.settings.reinitialiserMdp')}
            </Button>
            <Button
              variant="unstyled"
              className="button button-small button-danger"
              type="button"
              onClick={props.onDisconnect}
            >
              <LogOut />
              {t('admin.users.deconnecter')}
            </Button>
          </MobileCardActionsMenu>
        </>
      }
    />
  );
}
