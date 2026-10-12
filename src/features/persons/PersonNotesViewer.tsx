import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Save, StickyNote } from 'lucide-react';
import { Modal } from '@/design-system/components/Modal';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';
import { useAddPersonNote, usePerson, usePersonNotes } from './hooks/usePersons';

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
  const [index, setIndex] = useState(0);
  const [adding, setAdding] = useState(initialMode === 'add');
  const [content, setContent] = useState('');
  const notes = usePersonNotes(personId, { enabled: open });
  const person = usePerson(personId, open);
  const addNote = useAddPersonNote(personId);
  const personName = person.data
    ? `${person.data.data.firstName} ${person.data.data.lastName}`
    : 'la personne';
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
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Notes de ${personName}`}
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
          {adding ? (
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
      {adding ? (
        <div className="note-editor-panel">
          <div className="note-mode-heading">
            <span className="note-icon" aria-hidden="true">
              <StickyNote />
            </span>
            <div>
              <h3>{__t('persons.personNotesViewer.nouvelleNote')}</h3>
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
          <blockquote>{current.content}</blockquote>
          <small className="note-meta">
            {current.authorUsername ??
              __t('persons.personNotesViewer.utilisateurValue0', {
                value0: String(current.createdByUserId),
              })}{' '}
            · {new Date(current.createdAt).toLocaleString()}
          </small>
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
