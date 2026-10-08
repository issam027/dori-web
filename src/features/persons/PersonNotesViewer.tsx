import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  personsControllerCreateNote,
  personsControllerFindOne,
  personsControllerGetNotes,
} from '@/api/generated/persons/persons';
import { Modal } from '@/design-system/components/Modal';

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
    await personsControllerCreateNote(personId, { content: content.trim() });
    setContent('');
    setAdding(false);
    setIndex(0);
    await queryClient.invalidateQueries({ queryKey: ['persons', personId, 'notes'] });
  };
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Notes de ${personName}`}
      description="Historique partagé avec les opérateurs autorisés de ce site."
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
              Retour aux notes
            </button>
          ) : !adding ? (
            <button
              className="button button-primary"
              type="button"
              onClick={() => {
                setAdding(true);
              }}
            >
              Ajouter
            </button>
          ) : (
            <button
              className="button button-primary"
              type="button"
              disabled={!content.trim()}
              onClick={() => void add()}
            >
              Enregistrer la note
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
              <h3>Nouvelle note</h3>
              <p>Cette information sera visible lors des prochains passages sur ce site.</p>
            </div>
          </div>
          <label>
            Contenu de la note
            <textarea
              aria-label="Nouvelle note"
              rows={6}
              placeholder="Ex. Documents à vérifier, besoin d’assistance…"
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
            {current.authorUsername ?? `Utilisateur ${String(current.createdByUserId)}`} ·{' '}
            {new Date(current.createdAt).toLocaleString()}
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
                Précédente
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
                Suivante
              </button>
            </div>
          ) : null}
        </article>
      ) : (
        <div className="note-empty-state">
          <span className="note-icon" aria-hidden="true">
            ✎
          </span>
          <h3>Aucune note</h3>
          <p>Ajoutez la première information utile pour cette personne.</p>
        </div>
      )}
    </Modal>
  );
}
