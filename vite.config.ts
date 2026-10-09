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

export function securityHeaders(env: Record<string, string>): Plugin {
  const apiOrigin = (() => {
    try {
      return new URL(env.VITE_API_BASE_URL || 'http://localhost:3000').origin;
    } catch {
      return 'http://localhost:3000';
    }
  })();
  const policy = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `connect-src 'self' ${apiOrigin} ws: wss:`,
    "script-src 'self'",
  ].join('; ');
  return {
    name: 'dori-security-headers',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) =>
        html.replace(
          '<meta name="referrer" content="no-referrer" />',
          `<meta name="referrer" content="no-referrer" />\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`,
        ),
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [legalProductionGuard(env), securityHeaders(env), react()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  };
});
