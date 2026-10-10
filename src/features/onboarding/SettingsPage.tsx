import { useLocation } from 'react-router-dom';
import { SettingsWorkspace } from './components/SettingsWorkspace';
import { settingsSectionFromPath } from './settings-routes';

export function SettingsPage() {
  const location = useLocation();
  return <SettingsWorkspace section={settingsSectionFromPath(location.pathname)} />;
}
