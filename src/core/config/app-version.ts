import packageManifest from '../../../package.json';

/** Version publique issue du manifeste npm, source de vérité du frontend. */
export const APP_VERSION = packageManifest.version;
export const APP_VERSION_LABEL = 'v' + APP_VERSION;
