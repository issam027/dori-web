import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

export function FormField({
  label,
  required = false,
  hint,
  error,
  children,
}: {
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="form-field">
      <span className="field-label">
        {label}
        {required ? <RequiredMark /> : null}
      </span>
      {children}
      {error ? (
        <span className="field-error" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="field-hint">{hint}</span>
      ) : null}
    </label>
  );
}

export function RequiredMark() {
  return (
    <span className="required-mark" aria-hidden="true">
      {' '}
      *
    </span>
  );
}

export const PhoneInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function PhoneInput(props, ref) {
    return (
      <input
        ref={ref}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        pattern="\+[1-9][0-9]{6,14}"
        {...props}
      />
    );
  },
);

export const DateInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function DateInput(props, ref) {
    return <input ref={ref} type="date" {...props} />;
  },
);

export const TimeInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TimeInput(props, ref) {
    return <input ref={ref} type="time" {...props} />;
  },
);

export function CurrencyInput({
  currencies,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { currencies: readonly string[] }) {
  const listId = useId();
  return (
    <>
      <input type="text" inputMode="decimal" list={listId} maxLength={3} {...props} />
      <datalist id={listId}>
        {currencies.map((currency) => (
          <option key={currency} value={currency} />
        ))}
      </datalist>
    </>
  );
}
