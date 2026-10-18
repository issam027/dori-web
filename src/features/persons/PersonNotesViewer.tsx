import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Pencil, Plus, Save, StickyNote, Trash2 } from 'lucide-react';
import { Modal } from '@/design-system/components/Modal';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';
import { useAddPersonNote, useDeletePersonNote, usePerson, usePersonNotes, useUpdatePersonNote } from './hooks/usePersons';
import { normalizePersonText } from './person-display';
import { useSessionStore } from '@/core/auth/session-store';
import { hasPermission } from '@/core/permissions/permissions';

export function PersonNotesViewer({
  personId,
  open,
  onOpenChange,
  initialMode = 'view',
}: {
  personId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: 'view' | 'add';
}) {
  const { t: __t } = useTranslation();
  const canManage = hasPermission(useSessionStore((state) => state.user), 'person_note_manage');
  const [index, setIndex] = useState(0);
  const [adding, setAdding] = useState(initialMode === 'add');
  const [content, setContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<number>();
  const notes = usePersonNotes(personId, { enabled: open });
  const person = usePerson(personId, open);
  const addNote = useAddPersonNote(personId);
  const updateNote = useUpdatePersonNote(personId);
  const deleteNote = useDeletePersonNote(personId);
  const personName = person.data
    ? [
        normalizePersonText(person.data.data.firstName),
        normalizePersonText(person.data.data.lastName),
      ]
        .filter(Boolean)
        .join(' ') || __t('persons.admin.unknownPerson')
    : __t('persons.admin.unknownPerson');
  const items = notes.data?.data.items ?? [];
  const current = items[index];
  const add = async () => {
    if (!content.trim()) return;
    try {
      await addNote.execute(content.trim());
      setContent('');
      setAdding(false);
      setIndex(0);
      notify({
        tone: 'success',
        title: __t('notifications.note.created'),
        message: __t('notifications.note.createdMessage', { name: personName }),
      });
    } catch (error) {
      notifyError(error);
    }
  };
  const saveEdit = async () => {
    if (!editingNoteId || !content.trim()) return;
    try {
      await updateNote.execute({ noteId: editingNoteId, content: content.trim() });
      setEditingNoteId(undefined); setContent('');
      notify({ tone: 'success', title: __t('persons.notes.updated') });
    } catch (error) { notifyError(error); }
  };
  const remove = async () => {
    if (!current) return;
    try {
      await deleteNote.execute(current.noteId);
      setIndex(Math.max(0, index - 1));
      notify({ tone: 'success', title: __t('persons.notes.deleted') });
    } catch (error) { notifyError(error); }
  };
  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next && (editingNoteId || adding)) {
          setEditingNoteId(undefined);
          setAdding(false);
          setContent('');
          return;
        }
        onOpenChange(next);
      }}
      title={__t('persons.notes.title', { name: personName })}
      description={__t('persons.personNotesViewer.historiquePartageAvecLesOperateursAutorises')}
      actions={
        <>
          {adding && items.length > 0 ? (
            <button
              className="button"
              type="button"
              onClick={() => {
                setAdding(false);
              }}
            >
              <ArrowLeft aria-hidden="true" />
              {__t('persons.personNotesViewer.retourAuxNotes')}
            </button>
          ) : null}
          {editingNoteId ? (
            <button className="button button-primary" type="button" disabled={!content.trim()} onClick={() => void saveEdit()}><Save aria-hidden="true" />{__t('common.save')}</button>
          ) : adding ? (
            <button
              className="button button-primary"
              type="button"
              disabled={!content.trim()}
              onClick={() => void add()}
            >
              <Save aria-hidden="true" />
              {__t('persons.personNotesViewer.enregistrerLaNote')}
            </button>
          ) : (
            <button
              className="button button-primary"
              type="button"
              onClick={() => {
                setAdding(true);
              }}
            >
              <Plus aria-hidden="true" />
              {__t('common.add')}
            </button>
          )}
        </>
      }
    >
      {adding || editingNoteId ? (
        <div className="note-editor-panel">
          <div className="note-mode-heading">
            <span className="note-icon" aria-hidden="true">
              <StickyNote />
            </span>
            <div>
              <h3>{editingNoteId ? __t('persons.notes.editTitle') : __t('persons.personNotesViewer.nouvelleNote')}</h3>
              <p>{__t('persons.personNotesViewer.cetteInformationSeraVisibleLorsDesProchain')}</p>
            </div>
          </div>
          <label>
            {__t('persons.personNotesViewer.contenuDeLaNote')}
            <textarea
              aria-label={__t('persons.personNotesViewer.nouvelleNote')}
              rows={6}
              placeholder={__t('persons.personNotesViewer.exDocumentsAVerifierBesoinDAssistance')}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
              }}
            />
          </label>
        </div>
      ) : current ? (
        <article className="note-viewer-panel">
          <div className="note-content-block">
            <blockquote>{current.content}</blockquote>
          </div>
          <div className="note-meta-row">
          <small className="note-meta">
            {current.authorUsername ??
              __t('persons.notes.userReference', {
                value0: String(current.createdByUserId),
              })}{' '}
            · {new Date(current.createdAt).toLocaleString()}
          </small>
          {canManage ? <div className="note-inline-actions">
            <button className="icon-button" type="button" title={__t('common.edit')} aria-label={__t('common.edit')} onClick={() => { setEditingNoteId(current.noteId); setContent(current.content); }}><Pencil aria-hidden="true" /></button>
            <button className="icon-button icon-button-danger" type="button" title={__t('common.delete')} aria-label={__t('common.delete')} onClick={() => void remove()}><Trash2 aria-hidden="true" /></button>
          </div> : null}
          </div>
          {items.length > 1 ? (
            <div className="note-pagination">
              <button
                className="button"
                type="button"
                disabled={index >= items.length - 1}
                onClick={() => {
                  setIndex(index + 1);
                }}
              >
                <ChevronLeft aria-hidden="true" />
                {__t('persons.personNotesViewer.precedente')}
              </button>
              <span>
                {index + 1} / {items.length}
              </span>
              <button
                className="button"
                type="button"
                disabled={index === 0}
                onClick={() => {
                  setIndex(index - 1);
                }}
              >
                {__t('persons.personNotesViewer.suivante')}
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </article>
      ) : (
        <div className="note-empty-state">
          <span className="note-icon" aria-hidden="true">
            <StickyNote />
          </span>
          <h3>{__t('persons.personNotesViewer.aucuneNote')}</h3>
          <p>{__t('persons.personNotesViewer.ajoutezLaPremiereInformationUtilePourCette')}</p>
        </div>
      )}
    </Modal>
  );
}
