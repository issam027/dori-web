/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_ENV: 'development' | 'test' | 'production';
  readonly VITE_KIOSK_IDLE_MS?: string;
  readonly VITE_LEGAL_ENTITY_NAME?: string;
  readonly VITE_LEGAL_ADDRESS?: string;
  readonly VITE_LEGAL_EMAIL?: string;
  readonly VITE_LEGAL_REGISTRATION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
