import type {
  CreatePersonDto,
  PersonsControllerFindPersonsParams,
  UpdatePersonDto,
} from '@/api/generated/models';
import {
  personsControllerCreatePerson,
  personsControllerFindOne,
  personsControllerFindPersons,
  personsControllerDeletePerson,
  personsControllerUpdatePerson,
} from '@/api/generated/persons/persons';

export const findPersons = (params: PersonsControllerFindPersonsParams, signal?: AbortSignal) =>
  personsControllerFindPersons(params, undefined, signal);

export const findPerson = (personId: string, signal?: AbortSignal) =>
  personsControllerFindOne(personId, undefined, signal);

export const createPerson = (dto: CreatePersonDto) => personsControllerCreatePerson(dto);

export const updatePerson = (personId: string, dto: UpdatePersonDto) =>
  personsControllerUpdatePerson(personId, dto);

export const deletePerson = (personId: string) => personsControllerDeletePerson(personId);
