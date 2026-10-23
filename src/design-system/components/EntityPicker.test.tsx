import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntityPicker } from './EntityPicker';

const entities = [
  { id: '00000000-0000-4000-8000-000000000001', name: 'Alice' },
  { id: '00000000-0000-4000-8000-000000000002', name: 'Bob' },
];

it('exposes selection through listbox semantics and selects an entity', async () => {
  const onSelect = vi.fn();
  render(
    <EntityPicker
      entities={entities}
      selectedKey="00000000-0000-4000-8000-000000000001"
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
