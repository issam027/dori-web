import { common } from './common';
import { nav } from './nav';
import { auth } from './auth';
import { profile } from './profile';
import { errors } from './errors';
import { appointments } from './appointments';
import { persons } from './persons';
import { operations } from './operations';
import { portfolio } from './portfolio';
import { onboarding } from './onboarding';
import { admin } from './admin';
import { supervision } from './supervision';
import { experiences } from './experiences';
import { legal } from './legal';
import { audit } from './audit';
import type { Translations } from '../../types';

export const enDomains = {
  common,
  nav,
  auth,
  profile,
  errors,
  appointments,
  persons,
  operations,
  portfolio,
  onboarding,
  admin,
  supervision,
  experiences,
  legal,
  audit,
};
export const en: Translations = {
  ...common,
  ...nav,
  ...auth,
  ...profile,
  ...errors,
  ...appointments,
  ...persons,
  ...operations,
  ...portfolio,
  ...onboarding,
  ...admin,
  ...supervision,
  ...experiences,
  ...legal,
  ...audit,
};
