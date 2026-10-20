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
