import type {
  CreatePersonDto,
  CreatePersonNoteDto,
  PersonsControllerFindPersonsParams,
  PersonsControllerGetNotesParams,
  UpdatePersonDto,
  UpdatePersonNoteDto,
} from '@/api/generated/models';
import {
  personsControllerCreatePerson,
  personsControllerCreateNote,
  personsControllerFindOne,
  personsControllerFindPersons,
  personsControllerGetNotes,
  personsControllerDeleteNote,
  personsControllerDeletePerson,
  personsControllerUpdateNote,
  personsControllerUpdatePerson,
} from '@/api/generated/persons/persons';

export const findPersons = (params: PersonsControllerFindPersonsParams, signal?: AbortSignal) =>
  personsControllerFindPersons(params, undefined, signal);

export const findPerson = (personId: number, signal?: AbortSignal) =>
  personsControllerFindOne(personId, undefined, signal);

export const createPerson = (dto: CreatePersonDto) => personsControllerCreatePerson(dto);

export const updatePerson = (personId: number, dto: UpdatePersonDto) =>
  personsControllerUpdatePerson(personId, dto);

export const findPersonNotes = (
  personId: number,
  params: PersonsControllerGetNotesParams,
  signal?: AbortSignal,
) => personsControllerGetNotes(personId, params, undefined, signal);

export const createPersonNote = (personId: number, dto: CreatePersonNoteDto) =>
  personsControllerCreateNote(personId, dto);

export const updatePersonNote = (personId: number, noteId: number, dto: UpdatePersonNoteDto) =>
  personsControllerUpdateNote(personId, noteId, dto);

export const deletePersonNote = (personId: number, noteId: number) =>
  personsControllerDeleteNote(personId, noteId);

export const deletePerson = (personId: number) => personsControllerDeletePerson(personId);
