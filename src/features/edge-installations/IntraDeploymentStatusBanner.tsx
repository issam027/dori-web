import { useQuery } from '@tanstack/react-query';
import { CircleAlert, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { edgeLocalControllerStatus } from '@/api/generated/edge-local-status/edge-local-status';
import { isCloudDeployment } from '@/core/config/deployment-mode';

export function IntraDeploymentStatusBanner() {
  const { t } = useTranslation();
  const status = useQuery({
    queryKey: ['edge-local-status'],
    queryFn: ({ signal }) => edgeLocalControllerStatus(undefined, signal),
    enabled: !isCloudDeployment,
    refetchInterval: 30_000,
    retry: 1,
  });

  if (isCloudDeployment || (!status.isError && !status.data?.data.configured)) return null;

  const localStatus = status.data?.data;
  const unreachable = status.isError || localStatus?.cloudReachability === 'unreachable';
  const inactive = !unreachable && localStatus?.deploymentStatus === 'inactive';
  if (!unreachable && !inactive) return null;

  return (
    <div className={`intra-deployment-banner${inactive ? ' is-inactive' : ''}`} role="status">
      {inactive ? <CircleAlert aria-hidden="true" /> : <WifiOff aria-hidden="true" />}
      <div>
        <strong>{t(inactive ? 'edge.local.inactiveTitle' : 'edge.local.unreachableTitle')}</strong>
        <span>{t(inactive ? 'edge.local.inactiveMessage' : 'edge.local.unreachableMessage')}</span>
      </div>
    </div>
  );
}
