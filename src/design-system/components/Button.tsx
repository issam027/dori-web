import {
  Children,
  createContext,
  forwardRef,
  Fragment,
  isValidElement,
  cloneElement,
  useContext,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';

type ButtonVariant = 'default' | 'primary' | 'success' | 'info' | 'danger' | 'unstyled';
type ButtonSize = 'default' | 'small' | 'icon';
type ButtonLabelMode = 'responsive' | 'always' | 'icon-only';

const ButtonLabelModeContext = createContext<ButtonLabelMode>('always');

export const ButtonLabelModeProvider = ButtonLabelModeContext.Provider;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pending?: boolean;
  icon?: ReactElement;
  label?: ReactNode;
  labelMode?: ButtonLabelMode;
  unavailableReason?: ReactNode;
}

function buttonClassName(
  variant: ButtonVariant,
  size: ButtonSize,
  className: string | undefined,
  labelMode: ButtonLabelMode,
  hasIcon: boolean,
): string | undefined {
  const classes = [
    variant === 'unstyled' ? undefined : 'button',
    variant !== 'unstyled' && size === 'small' ? 'button-small' : undefined,
    variant !== 'unstyled' && size === 'icon' ? 'icon-button' : undefined,
    variant !== 'unstyled' && variant === 'primary' ? 'button-primary' : undefined,
    variant !== 'unstyled' && variant === 'success' ? 'button-success' : undefined,
    variant !== 'unstyled' && variant === 'info' ? 'button-info' : undefined,
    variant !== 'unstyled' && variant === 'danger' ? 'button-danger' : undefined,
    `button-label-${labelMode}`,
    hasIcon ? 'button-has-icon' : undefined,
    className,
  ].filter(Boolean);
  return classes.length ? classes.join(' ') : undefined;
}

function containsIcon(children: ReactNode): boolean {
  return Children.toArray(children).some((child) => {
    if (!isValidElement<{ children?: ReactNode; 'aria-hidden'?: boolean }>(child)) return false;
    if (child.type === Fragment) return containsIcon(child.props.children);
    return (
      child.type === 'svg' ||
      (typeof child.type !== 'string' && child.props['aria-hidden'] === true)
    );
  });
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
    labelMode: requestedLabelMode,
    children,
    unavailableReason,
    ...props
  },
  ref,
) {
  const inheritedLabelMode = useContext(ButtonLabelModeContext);
  const labelMode = requestedLabelMode ?? inheritedLabelMode;
  const hasIcon = Boolean(icon) || containsIcon(children);
  const decorativeIcon = isValidElement<{ 'aria-hidden'?: boolean }>(icon)
    ? cloneElement(icon, { 'aria-hidden': true })
    : icon;

  const button = (
    <button
      {...props}
      ref={ref}
      type={type}
      className={buttonClassName(variant, size, className, labelMode, hasIcon)}
      disabled={disabled || pending}
      title={props.title ?? (typeof unavailableReason === 'string' ? unavailableReason : undefined)}
      aria-busy={pending || undefined}
      aria-label={
        props['aria-label'] ??
        (labelMode === 'icon-only' && typeof label === 'string' ? label : undefined)
      }
    >
      {decorativeIcon}
      {label !== undefined ? <span className="button-label">{label}</span> : children}
    </button>
  );
  if (!disabled || !unavailableReason) return button;
  return (
    <span className="disabled-action">
      {button}
      <small>{unavailableReason}</small>
    </span>
  );
});
