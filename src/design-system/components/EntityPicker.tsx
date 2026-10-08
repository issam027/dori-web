import type { Key, ReactNode } from 'react';

export function EntityPicker<TEntity>({
  entities,
  selectedKey,
  getKey,
  render,
  onSelect,
  label,
}: {
  entities: readonly TEntity[];
  selectedKey: Key | null;
  getKey: (entity: TEntity) => Key;
  render: (entity: TEntity) => ReactNode;
  onSelect: (entity: TEntity) => void;
  label: string;
}) {
  return (
    <div className="entity-picker" role="listbox" aria-label={label}>
      {entities.map((entity) => {
        const key = getKey(entity);
        const selected = key === selectedKey;
        return (
          <button
            key={key}
            type="button"
            role="option"
            aria-selected={selected}
            className={`entity-option${selected ? ' selected' : ''}`}
            onClick={() => {
              onSelect(entity);
            }}
          >
            {render(entity)}
          </button>
        );
      })}
    </div>
  );
}
