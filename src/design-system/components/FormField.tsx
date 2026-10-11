import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';

type DescribedControlProps = {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
  'aria-required'?: boolean;
};

export function FormField({
  label,
  required = false,
  hint,
  error,
  success,
  children,
}: {
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  success?: ReactNode;
  children: ReactNode;
}) {
  const generatedId = useId();
  const child = Children.only(children);
  const candidate = isValidElement<DescribedControlProps>(child) ? child : null;
  const isContainer =
    candidate &&
    typeof candidate.type === 'string' &&
    !['input', 'select', 'textarea'].includes(candidate.type);
  const control = isContainer ? null : candidate;
  const controlId = control?.props.id ?? `field-${generatedId}`;
  const messageId = error
    ? `${controlId}-error`
    : success
      ? `${controlId}-success`
      : hint
        ? `${controlId}-hint`
        : undefined;
  const describedBy =
    [control?.props['aria-describedby'], messageId].filter(Boolean).join(' ') || undefined;
  const enhancedControl = control
    ? cloneElement(control, {
        id: controlId,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : control.props['aria-invalid'],
        'aria-required': required || control.props['aria-required'] || undefined,
      })
    : child;

  return (
    <div className={`form-field${error ? ' has-error' : success ? ' has-success' : ''}`}>
      {isContainer ? (
        <label className="form-field-composite-label">
          <span className="field-label">
            {label}
            {required ? <RequiredMark /> : null}
          </span>
          {child}
        </label>
      ) : (
        <>
          <label className="field-label" htmlFor={controlId}>
            {label}
            {required ? <RequiredMark /> : null}
          </label>
          {enhancedControl}
        </>
      )}
      {error ? (
        <span className="field-error" id={messageId} role="alert">
          {error}
        </span>
      ) : success ? (
        <span className="field-success" id={messageId} role="status">
          {success}
        </span>
      ) : hint ? (
        <span className="field-hint" id={messageId}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export function RequiredMark() {
  return (
    <span className="required-mark" aria-hidden="true">
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
