import type {
  CreatePersonNoteDto,
  PersonsControllerGetNotesParams,
  UpdatePersonNoteDto,
} from '@/api/generated/models';
import {
  personsControllerCreateNote,
  personsControllerDeleteNote,
  personsControllerGetNotes,
  personsControllerUpdateNote,
} from '@/api/generated/persons/persons';

export const findPersonNotes = (
  personId: string,
  params: PersonsControllerGetNotesParams,
  signal?: AbortSignal,
) => personsControllerGetNotes(personId, params, undefined, signal);

export const createPersonNote = (personId: string, dto: CreatePersonNoteDto) =>
  personsControllerCreateNote(personId, dto);

export const updatePersonNote = (personId: string, noteId: string, dto: UpdatePersonNoteDto) =>
  personsControllerUpdateNote(personId, noteId, dto);

export const deletePersonNote = (personId: string, noteId: string) =>
  personsControllerDeleteNote(personId, noteId);
