import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  personsControllerCreateNote,
  personsControllerFindOne,
  personsControllerGetNotes,
} from '@/api/generated/persons/persons';
import { Modal } from '@/design-system/components/Modal';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';

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
  const queryClient = useQueryClient();
  const [index, setIndex] = useState(0);
  const [adding, setAdding] = useState(initialMode === 'add');
  const [content, setContent] = useState('');
  const notes = useQuery({
    queryKey: ['persons', personId, 'notes'],
    queryFn: () =>
      personsControllerGetNotes(personId, { page: 1, pageSize: 100, sort: 'createdAt:desc' }),
    enabled: open,
  });
  const person = useQuery({
    queryKey: ['persons', personId],
    queryFn: () => personsControllerFindOne(personId),
    enabled: open,
  });
  const personName = person.data
    ? `${person.data.data.firstName} ${person.data.data.lastName}`
    : 'la personne';
  const items = notes.data?.data.items ?? [];
  const current = items[index];
  const add = async () => {
    if (!content.trim()) return;
    try {
      await personsControllerCreateNote(personId, { content: content.trim() });
      setContent('');
      setAdding(false);
      setIndex(0);
      await queryClient.invalidateQueries({ queryKey: ['persons', personId, 'notes'] });
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
      description={__t(
        'ui.persons.person_notes_viewer.historique_partage_avec_les_operateurs_autorises_oesch4',
      )}
      actions={
        <>
          {adding && items.length ? (
            <button
              className="button"
              type="button"
              onClick={() => {
                setAdding(false);
              }}
            >
              {__t('ui.persons.person_notes_viewer.retour_aux_notes_1nkxpit')}
            </button>
          ) : !adding ? (
            <button
              className="button button-primary"
              type="button"
              onClick={() => {
                setAdding(true);
              }}
            >
              {__t('ui.persons.person_notes_viewer.ajouter_17wnmfl')}
            </button>
          ) : (
            <button
              className="button button-primary"
              type="button"
              disabled={!content.trim()}
              onClick={() => void add()}
            >
              {__t('ui.persons.person_notes_viewer.enregistrer_la_note_w8aayc')}
            </button>
          )}
        </>
      }
    >
      {adding ? (
        <div className="note-editor-panel">
          <div className="note-mode-heading">
            <span className="note-icon" aria-hidden="true">
              ✎
            </span>
            <div>
              <h3>{__t('ui.persons.person_notes_viewer.nouvelle_note_ot3to1')}</h3>
              <p>
                {__t(
                  'ui.persons.person_notes_viewer.cette_information_sera_visible_lors_des_prochain_zpb7ne',
                )}
              </p>
            </div>
          </div>
          <label>
            {__t('ui.persons.person_notes_viewer.contenu_de_la_note_1b8xbrd')}
            <textarea
              aria-label={__t('ui.persons.person_notes_viewer.nouvelle_note_ot3to1')}
              rows={6}
              placeholder={__t(
                'ui.persons.person_notes_viewer.ex_documents_a_verifier_besoin_d_assistance_qql32h',
              )}
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
              __t('ui.expression.persons.person_notes_viewer.utilisateur_value0_q765mf', {
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
                {__t('ui.persons.person_notes_viewer.precedente_j6o8ea')}
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
                {__t('ui.persons.person_notes_viewer.suivante_1og87ce')}
              </button>
            </div>
          ) : null}
        </article>
      ) : (
        <div className="note-empty-state">
          <span className="note-icon" aria-hidden="true">
            ✎
          </span>
          <h3>{__t('ui.persons.person_notes_viewer.aucune_note_x1ege2')}</h3>
          <p>
            {__t(
              'ui.persons.person_notes_viewer.ajoutez_la_premiere_information_utile_pour_cette_12nj0ek',
            )}
          </p>
        </div>
      )}
    </Modal>
  );
}
