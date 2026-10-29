import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from './Button';

export function MobileCardActionsMenu({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<'top' | 'bottom'>('bottom');
  const menuRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const focusItem = (index: number) => {
    const items = popoverRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    if (!items?.length) return;
    items[(index + items.length) % items.length]?.focus();
  };

  const close = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  };

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('pointerdown', closeOnOutsidePress);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !popoverRef.current) return;
    const bounds = popoverRef.current.getBoundingClientRect();
    setPlacement(bounds.bottom > window.innerHeight - 8 ? 'top' : 'bottom');
  }, [open]);

  const menuItems = Children.map(children, (child) =>
    isValidElement(child)
      ? cloneElement(child as ReactElement<{ role?: string; tabIndex?: number }>, {
          role: 'menuitem',
          tabIndex: -1,
        })
      : child,
  );

  return (
    <div ref={menuRef} className="row-actions-menu">
      <Button
        ref={triggerRef}
        size="small"
        type="button"
        title={label}
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-haspopup="menu"
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
            requestAnimationFrame(() => {
              focusItem(event.key === 'ArrowDown' ? 0 : -1);
            });
          }
        }}
        onClick={() => {
          setOpen((value) => !value);
        }}
      >
        <MoreHorizontal aria-hidden="true" />
      </Button>
      {open ? (
        <div
          ref={popoverRef}
          id={menuId}
          className="row-actions-popover"
          data-placement={placement}
          role="menu"
          aria-label={label}
          onKeyDown={(event) => {
            const items = Array.from(
              popoverRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
            );
            const current = items.indexOf(document.activeElement as HTMLElement);
            if (event.key === 'Escape') {
              event.preventDefault();
              close(true);
            } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              focusItem(current + (event.key === 'ArrowDown' ? 1 : -1));
            } else if (event.key === 'Home' || event.key === 'End') {
              event.preventDefault();
              focusItem(event.key === 'Home' ? 0 : -1);
            }
          }}
          onClick={() => {
            close(true);
          }}
        >
          {menuItems}
        </div>
      ) : null}
    </div>
  );
}
