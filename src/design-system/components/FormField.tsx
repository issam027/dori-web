import { Children, cloneElement, isValidElement, useId, type ReactNode } from 'react';

type DescribedControlProps = {
  id?: string;
  required?: boolean;
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
        required: required || control.props.required || undefined,
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

function RequiredMark() {
  return (
    <span className="required-mark" aria-hidden="true">
      *
    </span>
  );
}
