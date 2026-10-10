import type {
  CreatePersonNoteDto,
  PersonsControllerFindPersonsParams,
  PersonsControllerGetNotesParams,
} from '@/api/generated/models';
import {
  personsControllerCreateNote,
  personsControllerFindOne,
  personsControllerFindPersons,
  personsControllerGetNotes,
} from '@/api/generated/persons/persons';

export const findPersons = (params: PersonsControllerFindPersonsParams, signal?: AbortSignal) =>
  personsControllerFindPersons(params, undefined, signal);

export const findPerson = (personId: number, signal?: AbortSignal) =>
  personsControllerFindOne(personId, undefined, signal);

export const findPersonNotes = (
  personId: number,
  params: PersonsControllerGetNotesParams,
  signal?: AbortSignal,
) => personsControllerGetNotes(personId, params, undefined, signal);

export const createPersonNote = (personId: number, dto: CreatePersonNoteDto) =>
  personsControllerCreateNote(personId, dto);
