import { render, screen, within } from '@testing-library/react';
import { PersonNotesButton } from './PersonNotesButton';

it('keeps each note count inside its own positioned button', () => {
  render(
    <>
      <PersonNotesButton noteCount={2} onClick={() => undefined} />
      <PersonNotesButton noteCount={5} onClick={() => undefined} />
    </>,
  );

  const first = screen.getByRole('button', { name: /2/ });
  const second = screen.getByRole('button', { name: /5/ });
  expect(first).toHaveClass('person-notes-button');
  expect(second).toHaveClass('person-notes-button');
  expect(within(first).getByText('2', { selector: '.note-count' })).toBeInTheDocument();
  expect(within(second).getByText('5', { selector: '.note-count' })).toBeInTheDocument();
});
