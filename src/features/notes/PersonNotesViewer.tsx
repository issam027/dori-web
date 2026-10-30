import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Save,
  StickyNote,
  Trash2,
} from 'lucide-react';
import { ConfirmDialog, Modal } from '@/design-system/components/Modal';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';
import {
  useAddPersonNote,
  useDeletePersonNote,
  usePersonNotes,
  useUpdatePersonNote,
} from './hooks/usePersonNotes';
import { useSessionStore } from '@/core/auth/session-store';
import { hasPermission } from '@/core/permissions/permissions';
import { Button } from '@/design-system/components/Button';
import { formatDateTime } from '@/core/i18n/date-format';

export function PersonNotesViewer({
  personId,
  open,
  onOpenChange,
  initialMode = 'view',
  personName,
  onNotesChanged,
}: {
  personId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: 'view' | 'add';
  personName?: string;
  onNotesChanged?: () => void;
}) {
  const { t: __t, i18n } = useTranslation();
  const canManage = hasPermission(
    useSessionStore((state) => state.user),
    'person_note_manage',
  );
  const [index, setIndex] = useState(0);
  const [adding, setAdding] = useState(initialMode === 'add');
  const [content, setContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string>();
  const [deletingNoteId, setDeletingNoteId] = useState<string>();
  const notes = usePersonNotes(personId, { enabled: open });
  const addNote = useAddPersonNote(personId);
  const updateNote = useUpdatePersonNote(personId);
  const deleteNote = useDeletePersonNote(personId);
  const displayName = personName?.trim() || __t('persons.notes.unknownPerson');
  const items = notes.data?.data.items ?? [];
  const current = items[index];
  const add = async () => {
    if (!content.trim()) return;
    try {
      await addNote.execute(content.trim());
      setContent('');
      setAdding(false);
      setIndex(0);
      onNotesChanged?.();
      notify({
        tone: 'success',
        title: __t('notifications.note.created'),
        message: __t('notifications.note.createdMessage', { name: displayName }),
      });
    } catch (error) {
      notifyError(error);
    }
  };
  const saveEdit = async () => {
    if (!editingNoteId || !content.trim()) return;
    try {
      await updateNote.execute({ noteId: editingNoteId, content: content.trim() });
      setEditingNoteId(undefined);
      setContent('');
      onNotesChanged?.();
      notify({ tone: 'success', title: __t('persons.notes.updated') });
    } catch (error) {
      notifyError(error);
    }
  };
  const remove = async (noteId: string) => {
    try {
      await deleteNote.execute(noteId);
      setIndex(Math.max(0, index - 1));
      setDeletingNoteId(undefined);
      onNotesChanged?.();
      notify({ tone: 'success', title: __t('persons.notes.deleted') });
    } catch (error) {
      notifyError(error);
    }
  };
  return (
    <>
      <Modal
        loading={notes.isPending}
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
        title={__t('persons.notes.title', { name: displayName })}
        description={__t('persons.personNotesViewer.historiquePartageAvecLesOperateursAutorises')}
        actions={
          <>
            {adding && items.length > 0 ? (
              <Button
                variant="unstyled"
                className="button"
                type="button"
                icon={<ArrowLeft />}
                label={__t('persons.personNotesViewer.retourAuxNotes')}
                labelMode="responsive"
                title={__t('persons.personNotesViewer.retourAuxNotes')}
                onClick={() => {
                  setAdding(false);
                }}
              />
            ) : null}
            {editingNoteId ? (
              <Button
                variant="unstyled"
                className="button button-primary"
                type="button"
                disabled={!content.trim()}
                onClick={() => void saveEdit()}
              >
                <Save aria-hidden="true" />
                {__t('common.save')}
              </Button>
            ) : adding ? (
              <Button
                variant="unstyled"
                className="button button-primary"
                type="button"
                disabled={!content.trim()}
                onClick={() => void add()}
              >
                <Save aria-hidden="true" />
                {__t('persons.personNotesViewer.enregistrerLaNote')}
              </Button>
            ) : (
              <Button
                variant="unstyled"
                className="button button-primary"
                type="button"
                onClick={() => {
                  setAdding(true);
                }}
              >
                <Plus aria-hidden="true" />
                {__t('common.add')}
              </Button>
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
                <h3>
                  {editingNoteId
                    ? __t('persons.notes.editTitle')
                    : __t('persons.personNotesViewer.nouvelleNote')}
                </h3>
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
                    value0: current.createdByUserId,
                  })}{' '}
                · {formatDateTime(current.createdAt, i18n.language)}
              </small>
              {canManage ? (
                <div className="note-inline-actions">
                  <Button
                    variant="unstyled"
                    className="icon-button"
                    type="button"
                    title={__t('common.edit')}
                    aria-label={__t('common.edit')}
                    onClick={() => {
                      setEditingNoteId(current.noteId);
                      setContent(current.content);
                    }}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <Button
                    variant="unstyled"
                    className="icon-button icon-button-danger"
                    type="button"
                    title={__t('common.delete')}
                    aria-label={__t('common.delete')}
                    onClick={() => {
                      setDeletingNoteId(current.noteId);
                    }}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              ) : null}
            </div>
            {items.length > 1 ? (
              <div className="pagination note-pagination">
                <Button
                  variant="unstyled"
                  className="button"
                  type="button"
                  aria-label={__t('persons.personNotesViewer.precedente')}
                  disabled={index >= items.length - 1}
                  onClick={() => {
                    setIndex(index + 1);
                  }}
                >
                  <ChevronLeft aria-hidden="true" />
                  <span className="pagination-button-label">
                    {__t('persons.personNotesViewer.precedente')}
                  </span>
                </Button>
                <span className="pagination-position" role="status">
                  {index + 1} / {items.length}
                </span>
                <Button
                  variant="unstyled"
                  className="button"
                  type="button"
                  aria-label={__t('persons.personNotesViewer.suivante')}
                  disabled={index === 0}
                  onClick={() => {
                    setIndex(index - 1);
                  }}
                >
                  <span className="pagination-button-label">
                    {__t('persons.personNotesViewer.suivante')}
                  </span>
                  <ChevronRight aria-hidden="true" />
                </Button>
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
      <ConfirmDialog
        open={Boolean(deletingNoteId)}
        onOpenChange={(next) => {
          if (!next && !deleteNote.isPending) setDeletingNoteId(undefined);
        }}
        title={__t('persons.notes.deleteTitle')}
        description={__t('persons.notes.deleteDescription')}
        confirmLabel={__t('common.delete')}
        destructive
        onConfirm={() => {
          if (deletingNoteId) void remove(deletingNoteId);
        }}
      />
    </>
  );
}
