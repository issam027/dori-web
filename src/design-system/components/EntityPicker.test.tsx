import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntityPicker } from './EntityPicker';

const entities = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
];

it('exposes selection through listbox semantics and selects an entity', async () => {
  const onSelect = vi.fn();
  render(
    <EntityPicker
      entities={entities}
      selectedKey={1}
      getKey={(entity) => entity.id}
      render={(entity) => entity.name}
      onSelect={onSelect}
      label="Personnes"
    />,
  );

  expect(screen.getByRole('listbox', { name: 'Personnes' })).toBeVisible();
  expect(screen.getByRole('option', { name: 'Alice' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('option', { name: 'Bob' })).toHaveAttribute('aria-selected', 'false');

  await userEvent.click(screen.getByRole('option', { name: 'Bob' }));

  expect(onSelect).toHaveBeenCalledOnce();
  expect(onSelect).toHaveBeenCalledWith(entities[1]);
});
