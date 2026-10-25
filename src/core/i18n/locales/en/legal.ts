import type { DomainTranslations } from '../../types';

export const legal: DomainTranslations<typeof import('../fr/legal').legal> = {
  'legal.notConfigured': 'Not configured',
  'legal.invalidProductionConfig': 'Invalid production legal configuration: {{fields}}',
  'legal.back': 'Back to previous area',
  'legal.eyebrow': 'Regulatory information',
  'legal.title': 'Legal notice and privacy',
  'legal.updated': 'The information below is supplied by this deployment configuration.',
  'legal.publisher': 'Service publisher',
  'legal.entity': 'Entity',
  'legal.address': 'Address',
  'legal.email': 'Legal contact',
  'legal.registration': 'Registration',
  'legal.privacy': 'Personal data',
  'legal.privacyText':
    'DORIFY processes only the data required to manage reception, appointments and queues, under the instructions of the responsible establishment.',
  'legal.rights': 'Your rights',
  'legal.rightsText': 'To exercise your access, correction or objection rights, contact {{email}}.',
  'legal.cookies': 'Local storage and cookies',
  'legal.cookiesText':
    'Interface preferences may be stored locally. Sessions use the secure mechanisms configured by the service.',
  'legal.security': 'Security',
  'legal.securityText':
    'Access is limited through authentication, permissions and scope. Public tracking links use an opaque token.',
  'legal.summarySecure': 'Protected data',
  'legal.summarySaas': 'SaaS service',
  'legal.introduction':
    'This page describes the rules applying to the DORIFY platform, operator workspaces and public experiences. It complements the contractual commitments agreed with each customer organisation.',
  'legal.contents': 'Legal information contents',
  'legal.service': 'Service purpose and availability',
  'legal.serviceText':
    'DORIFY provides queue, appointment and reception journey management. Available features depend on the service level, site configuration and permissions assigned to the account.',
  'legal.purposes': 'Purposes and responsibilities',
  'legal.purposesText':
    'The customer organisation determines the purposes and retention periods applying to visitor data. DORIFY acts as a technical provider and limits processing to service delivery, security and support.',
  'legal.retention': 'Retention and deletion',
  'legal.retentionText':
    'Retention periods are defined by the organisation and its applicable policy. Technical logs are limited to diagnostic needs and must not contain secrets or personal information in plain text.',
  'legal.contactTitle': 'A legal or privacy question?',
  'legal.contactText':
    'Send your request to {{email}} and identify the relevant organisation. Identity verification may be required before data is disclosed.',
};
