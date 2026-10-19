import {
  forwardRef,
  isValidElement,
  cloneElement,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';

export type ButtonVariant = 'default' | 'primary' | 'danger' | 'unstyled';
export type ButtonSize = 'default' | 'small' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pending?: boolean;
  icon?: ReactElement;
  label?: ReactNode;
}

function buttonClassName(
  variant: ButtonVariant,
  size: ButtonSize,
  className: string | undefined,
): string | undefined {
  if (variant === 'unstyled') return className;
  const classes = [
    'button',
    size === 'small' ? 'button-small' : undefined,
    size === 'icon' ? 'icon-button' : undefined,
    variant === 'primary' ? 'button-primary' : undefined,
    variant === 'danger' ? 'button-danger' : undefined,
    className,
  ].filter(Boolean);
  return classes.length ? classes.join(' ') : undefined;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'default',
    size = 'default',
    pending = false,
    disabled,
    type = 'button',
    className,
    icon,
    label,
    children,
    ...props
  },
  ref,
) {
  const decorativeIcon = isValidElement<{ 'aria-hidden'?: boolean }>(icon)
    ? cloneElement(icon, { 'aria-hidden': true })
    : icon;

  return (
    <button
      {...props}
      ref={ref}
      type={type}
      className={buttonClassName(variant, size, className)}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
    >
      {decorativeIcon}
      {label !== undefined ? <span className="button-label">{label}</span> : children}
    </button>
  );
});
