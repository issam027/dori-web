export type DeploymentMode = 'cloud' | 'intra';

export const isCloudDeployment = import.meta.env.VITE_DORIFY_DEPLOYMENT_MODE === 'cloud';
export const deploymentMode: DeploymentMode = isCloudDeployment ? 'cloud' : 'intra';

