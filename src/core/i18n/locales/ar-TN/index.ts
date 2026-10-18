import { common } from './common';
import { appointments } from './appointments';
import { persons } from './persons';
import { operations } from './operations';
import { supervision } from './supervision';
import { experiences } from './experiences';

export const arTNDomains = { common, appointments, persons, operations, supervision, experiences };
export const arTN: Record<string, string> = { ...common, ...appointments, ...persons, ...operations, ...supervision, ...experiences };
