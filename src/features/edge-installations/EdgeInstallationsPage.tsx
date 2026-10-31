import { useState, type SyntheticEvent } from 'react';
import { Activity, CloudCog, Copy, Plus, RefreshCw, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type {
  EdgeInstallationCredentialResponseDto,
  EdgeInstallationResponseDto,
} from '@/api/generated/models';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { EmptyState, ErrorState } from '@/design-system/components/FeedbackState';
import { Modal } from '@/design-system/components/Modal';
import { PageHeader } from '@/design-system/components/PageHeader';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { formatDateTime } from '@/core/i18n/date-format';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';
import {
  useCreateEdgeCommand,
  useCreateEdgeInstallation,
  useEdgeInstallation,
  useEdgeInstallations,
  useEdgeInstallationsRealtime,
  useUpdateEdgeInstallationStatus,
} from './hooks/useEdgeInstallations';
import './edge-installations.css';

function statusTone(status: string): 'success' | 'warning' | 'neutral' {
  if (status === 'online') return 'success';
  if (status === 'offline') return 'warning';
  return 'neutral';
}

export function EdgeInstallationsPage() {
  const { t, i18n } = useTranslation();
  const installations = useEdgeInstallations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEdgeInstallationsRealtime(selectedId);
  const detail = useEdgeInstallation(selectedId);
  const createInstallation = useCreateEdgeInstallation();
  const createCommand = useCreateEdgeCommand(selectedId);
  const updateStatus = useUpdateEdgeInstallationStatus(selectedId);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [issuedCredential, setIssuedCredential] =
    useState<EdgeInstallationCredentialResponseDto | null>(null);

  const submitInstallation = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    createInstallation.mutate(name.trim(), {
      onSuccess: (response) => {
        setIssuedCredential(response.data);
        setSelectedId(response.data.installationId);
        setName('');
      },
      onError: notifyError,
    });
  };

  const copyAgentConfiguration = async () => {
    if (!issuedCredential) return;
    await navigator.clipboard.writeText(
      [
        `DORIFY_INSTALLATION_ID=${issuedCredential.installationId}`,
        `DORIFY_CLOUD_TOKEN=${issuedCredential.token}`,
      ].join('\n'),
    );
    notify({ tone: 'success', title: t('edge.credentialsCopied') });
  };

  const sendCommand = (type: 'RUN_HEALTH_CHECK' | 'SYNC_NOW') => {
    createCommand.mutate(type, {
      onSuccess: () =>
        notify({
          tone: 'success',
          title: t('edge.commandQueued'),
          message: t(type === 'RUN_HEALTH_CHECK' ? 'edge.healthCheck' : 'edge.syncNow'),
        }),
      onError: notifyError,
    });
  };

  if (installations.isError && !installations.data)
    return <ErrorState onRetry={() => void installations.refetch()} />;

  const items = installations.data?.data ?? [];
  const selected = detail.data?.data;

  return (
    <div className="page-stack edge-installations-page">
      <PageHeader
        eyebrow={t('nav.edgeInstallations')}
        title={t('edge.title')}
        description={t('edge.description')}
        actions={
          <Button
            variant="primary"
            icon={<Plus />}
            label={t('edge.register')}
            onClick={() => {
              setCreateOpen(true);
            }}
          />
        }
      />

      <div className="content-grid content-grid-sidebar">
        <Card>
          <div className="card-heading">
            <div>
              <h2>{t('edge.inventory')}</h2>
              <p>{t('edge.inventoryHelp')}</p>
            </div>
            <StatusBadge>{String(items.length)}</StatusBadge>
          </div>
          {items.length === 0 ? (
            <EmptyState title={t('edge.empty')} description={t('edge.emptyHelp')} />
          ) : (
            <div className="stack-list">
              {items.map((installation: EdgeInstallationResponseDto) => (
                <Button
                  key={installation.installationId}
                  variant="unstyled"
                  className={`selection-card${selectedId === installation.installationId ? ' is-selected' : ''}`}
                  onClick={() => {
                    setSelectedId(installation.installationId);
                  }}
                >
                  <span>
                    <strong>{installation.name}</strong>
                    <small>
                      {formatDateTime(installation.lastSeenAt as string | null, i18n.language) ??
                        t('edge.neverConnected')}
                    </small>
                  </span>
                  <span className="cluster">
                    <StatusBadge
                      tone={installation.deploymentStatus === 'active' ? 'success' : 'danger'}
                    >
                      {t(`edge.deploymentStatus.${installation.deploymentStatus}`)}
                    </StatusBadge>
                    <StatusBadge tone={statusTone(installation.status)}>
                      {t(`edge.status.${installation.status}`)}
                    </StatusBadge>
                  </span>
                </Button>
              ))}
            </div>
          )}
        </Card>

        <Card>
          {!selectedId ? (
            <EmptyState title={t('edge.select')} description={t('edge.selectHelp')} />
          ) : detail.isError ? (
            <ErrorState onRetry={() => void detail.refetch()} />
          ) : selected ? (
            <div className="page-stack">
              <div className="card-heading">
                <div>
                  <h2>{selected.name}</h2>
                  <p>{selected.installationId}</p>
                </div>
                <span className="cluster">
                  <StatusBadge tone={selected.deploymentStatus === 'active' ? 'success' : 'danger'}>
                    {t(`edge.deploymentStatus.${selected.deploymentStatus}`)}
                  </StatusBadge>
                  <StatusBadge tone={statusTone(selected.status)}>
                    {t(`edge.status.${selected.status}`)}
                  </StatusBadge>
                </span>
              </div>
              <div className="cluster">
                <Button
                  variant={selected.deploymentStatus === 'active' ? 'danger' : 'primary'}
                  label={t(
                    selected.deploymentStatus === 'active' ? 'edge.revoke' : 'edge.activate',
                  )}
                  pending={updateStatus.isPending}
                  onClick={() => {
                    updateStatus.mutate(
                      selected.deploymentStatus === 'active' ? 'revoked' : 'active',
                      { onError: notifyError },
                    );
                  }}
                />
                <Button
                  icon={<Activity />}
                  label={t('edge.healthCheck')}
                  pending={createCommand.isPending}
                  onClick={() => {
                    sendCommand('RUN_HEALTH_CHECK');
                  }}
                />
                <Button
                  icon={<RefreshCw />}
                  label={t('edge.syncNow')}
                  pending={createCommand.isPending}
                  onClick={() => {
                    sendCommand('SYNC_NOW');
                  }}
                />
              </div>
              <div>
                <h3>{t('edge.commandHistory')}</h3>
                {selected.commands.length === 0 ? (
                  <p>{t('edge.noCommands')}</p>
                ) : (
                  <div className="stack-list">
                    {selected.commands.map((command) => (
                      <div className="selection-card" key={command.commandId}>
                        <span>
                          <strong>{command.type}</strong>
                          <small>{formatDateTime(command.createdAt, i18n.language)}</small>
                        </span>
                        <StatusBadge>{command.status}</StatusBadge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <EmptyState title={t('common.loading')} />
          )}
        </Card>
      </div>

      <Modal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setIssuedCredential(null);
        }}
        title={issuedCredential ? t('edge.credentialsTitle') : t('edge.register')}
        description={issuedCredential ? t('edge.credentialsHelp') : t('edge.registerHelp')}
        actions={
          issuedCredential ? (
            <Button
              variant="primary"
              icon={<Copy />}
              label={t('edge.copyCredentials')}
              onClick={() => void copyAgentConfiguration()}
            />
          ) : (
            <Button
              variant="primary"
              icon={<CloudCog />}
              label={t('edge.create')}
              pending={createInstallation.isPending}
              disabled={!name.trim()}
              onClick={() =>
                document.querySelector<HTMLFormElement>('#edge-installation-form')?.requestSubmit()
              }
            />
          )
        }
      >
        {issuedCredential ? (
          <div className="edge-credential-delivery">
            <div className="edge-credential-warning" role="alert">
              <TriangleAlert aria-hidden="true" />
              <strong>{t('edge.tokenWarning')}</strong>
            </div>
            <p>{t('edge.agentConfigurationHelp')}</p>
            <dl className="edge-credential-fields">
              <div>
                <dt>{t('edge.installationId')}</dt>
                <dd>
                  <span>DORIFY_INSTALLATION_ID</span>
                  <code>{issuedCredential.installationId}</code>
                </dd>
              </div>
              <div>
                <dt>{t('edge.installationToken')}</dt>
                <dd>
                  <span>DORIFY_CLOUD_TOKEN</span>
                  <code>{issuedCredential.token}</code>
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <form id="edge-installation-form" onSubmit={submitInstallation}>
            <label className="form-field">
              <span>{t('edge.name')}</span>
              <input
                value={name}
                maxLength={200}
                required
                onChange={(event) => {
                  setName(event.target.value);
                }}
              />
            </label>
          </form>
        )}
      </Modal>
    </div>
  );
}
