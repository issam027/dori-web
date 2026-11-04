import { LockKeyhole, WifiOff } from 'lucide-react';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useEdgeLocalStatus,
  useEdgeLocalStatusRealtime,
} from '@/shared/edge/use-edge-local-status';
import { isCloudDeployment } from '@/core/config/deployment-mode';

export function IntraDeploymentStatusGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const status = useEdgeLocalStatus();
  useEdgeLocalStatusRealtime();

  if (isCloudDeployment) return children;

  const localStatus = status.data?.data;
  if (localStatus?.deploymentStatus === 'revoked') {
    return (
      <main className="app-content intra-deployment-blocked" role="alert">
        <LockKeyhole aria-hidden="true" />
        <div>
          <h1>{t('edge.local.revokedTitle')}</h1>
          <p>{t('edge.local.revokedMessage')}</p>
          {localStatus.cloudReachability === 'unreachable' ? (
            <p>{t('edge.local.revokedOfflineMessage')}</p>
          ) : null}
        </div>
      </main>
    );
  }

  const unreachable = status.isError || localStatus?.cloudReachability === 'unreachable';
  return (
    <>
      {unreachable ? (
        <div className="intra-deployment-banner" role="status">
          <WifiOff aria-hidden="true" />
          <div>
            <strong>{t('edge.local.unreachableTitle')}</strong>
            <span>{t('edge.local.unreachableMessage')}</span>
          </div>
        </div>
      ) : null}
      {children}
    </>
  );
}
