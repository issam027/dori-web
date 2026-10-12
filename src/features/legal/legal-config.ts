import { i18n } from '@/core/i18n/i18n';

export interface LegalConfig {
  entityName: string;
  address: string;
  email: string;
  registration: string;
}

const suspicious = /^(?:todo|tbd|test|example|acme|à configurer|non configuré|xxx|$)/i;

export function validateProductionLegalConfig(config: LegalConfig) {
  const entries: Array<[keyof LegalConfig, string]> = [
    ['entityName', config.entityName],
    ['address', config.address],
    ['email', config.email],
    ['registration', config.registration],
  ];
  const invalid = entries.filter(([, value]) => suspicious.test(value.trim()));
  if (invalid.length)
    throw new Error(
      i18n.t('legal.invalidProductionConfig', { fields: invalid.map(([key]) => key).join(', ') }),
    );
}

export const legalConfig: LegalConfig = {
  entityName: import.meta.env.VITE_LEGAL_ENTITY_NAME || '',
  address: import.meta.env.VITE_LEGAL_ADDRESS || '',
  email: import.meta.env.VITE_LEGAL_EMAIL || '',
  registration: import.meta.env.VITE_LEGAL_REGISTRATION || '',
};
