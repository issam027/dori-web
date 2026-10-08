import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  personsControllerCreateNote,
  personsControllerGetNotes,
} from '@/api/generated/persons/persons';
import { Modal } from '@/design-system/components/Modal';

export function PersonNotesViewer({
  personId,
  open,
  onOpenChange,
}: {
  personId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [index, setIndex] = useState(0);
  const [adding, setAdding] = useState(false);
  const [content, setContent] = useState('');
  const notes = useQuery({
    queryKey: ['persons', personId, 'notes'],
    queryFn: () =>
      personsControllerGetNotes(personId, { page: 1, pageSize: 100, sort: 'createdAt:desc' }),
    enabled: open,
  });
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
      title="Notes personne"
      actions={
        <>
          {!adding ? (
            <button
              className="button"
              type="button"
              onClick={() => {
                setAdding(true);
              }}
            >
              Ajouter
            </button>
          ) : null}
        </>
      }
    >
      {adding ? (
        <div className="form-stack">
          <textarea
            aria-label="Nouvelle note"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
            }}
          />
          <button
            className="button button-primary"
            type="button"
            onClick={() => {
              void add();
            }}
          >
            Enregistrer
          </button>
          <button
            className="button"
            type="button"
            onClick={() => {
              setAdding(false);
            }}
          >
            Annuler
          </button>
        </div>
      ) : current ? (
        <article>
          <p>{current.content}</p>
          <small>
            {current.authorUsername ?? `Utilisateur ${String(current.createdByUserId)}`} ·{' '}
            {new Date(current.createdAt).toLocaleString()}
          </small>
          <div className="pagination">
            <button
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
              type="button"
              disabled={index === 0}
              onClick={() => {
                setIndex(index - 1);
              }}
            >
              Suivante
            </button>
          </div>
        </article>
      ) : (
        <p>Aucune note.</p>
      )}
    </Modal>
  );
}
