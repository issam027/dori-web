import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { InternationalPhoneInput } from './InternationalPhoneInput';

function Harness() {
  const [value, setValue] = useState('');
  return (
    <>
      <InternationalPhoneInput
        value={value}
        onChange={setValue}
        countryLabel="Indicatif pays"
        phoneLabel="Téléphone"
      />
      <output>{value}</output>
    </>
  );
}

describe('InternationalPhoneInput', () => {
  it('normalizes a French national number to E.164', async () => {
    render(<Harness />);
    await userEvent.type(screen.getByRole('textbox'), '06 12 34 56 78');
    expect(screen.getByRole('status')).toHaveTextContent('+33612345678');
  });

  it('changes the prefix and visible flag with the selected country', async () => {
    render(<Harness />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Indicatif pays' }), 'TN');
    await userEvent.type(screen.getByRole('textbox'), '20 123 456');
    expect(screen.getByRole('status')).toHaveTextContent('+21620123456');
    expect(document.querySelector('use')).toHaveAttribute('href', '#phone-flag-tn');
  });
});
