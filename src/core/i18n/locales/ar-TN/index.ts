import { common } from './common';
import { nav } from './nav';
import { auth } from './auth';
import { appointments } from './appointments';
import { persons } from './persons';
import { operations } from './operations';
import { supervision } from './supervision';
import { experiences } from './experiences';
import { errors } from './errors';

export const arTNDomains = { common, nav, auth, appointments, persons, operations, supervision, experiences, errors };
export const arTN: Record<string, string> = { ...common, ...nav, ...auth, ...appointments, ...persons, ...operations, ...supervision, ...experiences, ...errors };
