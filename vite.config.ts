import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

const invalidLegalValue = /^(?:todo|tbd|test|example|acme|à configurer|non configuré|xxx|$)/i;

export function legalProductionGuard(env: Record<string, string>): Plugin {
  return {
    name: 'dori-legal-production-guard',
    buildStart() {
      if (env.VITE_APP_ENV !== 'production') return;
      const required = [
        'VITE_LEGAL_ENTITY_NAME',
        'VITE_LEGAL_ADDRESS',
        'VITE_LEGAL_EMAIL',
        'VITE_LEGAL_REGISTRATION',
      ];
      const invalid = required.filter((key) => invalidLegalValue.test(env[key]?.trim() ?? ''));
      if (invalid.length)
        this.error(
          `Production bloquée : configuration légale absente ou fictive (${invalid.join(', ')}).`,
        );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [legalProductionGuard(env), react()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  };
});
