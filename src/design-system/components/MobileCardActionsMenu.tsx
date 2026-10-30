import {
  Children,
  useCallback,
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
  const [maxHeight, setMaxHeight] = useState<number>();
  const menuRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<number | null>(null);
  const menuId = useId();

  const focusItem = useCallback((index: number) => {
    const items = popoverRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    if (!items?.length) return;
    items[(index + items.length) % items.length]?.focus();
  }, []);

  const close = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
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
    if (!open) return;
    const viewport = window.visualViewport;
    const update = () => {
      const popover = popoverRef.current,
        trigger = triggerRef.current;
      if (!popover || !trigger) return;
      const bounds = trigger.getBoundingClientRect();
      const top = viewport?.offsetTop ?? 0;
      let bottom = top + (viewport?.height ?? window.innerHeight);
      const navigation = document.querySelector('.mobile-bottom-nav')?.getBoundingClientRect();
      if (navigation && navigation.width > navigation.height && navigation.height > 0)
        bottom = Math.min(bottom, navigation.top);
      const above = Math.max(0, Math.min(bounds.top, bottom) - top - 8);
      const below = Math.max(0, bottom - Math.max(bounds.bottom, top) - 8);
      const next = popover.scrollHeight <= below || below >= above ? 'bottom' : 'top';
      setPlacement(next);
      setMaxHeight(Math.max(44, next === 'bottom' ? below : above));
    };
    update();
    if (pendingFocus.current !== null) {
      const index = pendingFocus.current;
      pendingFocus.current = null;
      focusItem(index);
    }
    window.addEventListener('resize', update);
    document.addEventListener('scroll', update, true);
    viewport?.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      document.removeEventListener('scroll', update, true);
      viewport?.removeEventListener('resize', update);
    };
  }, [open, focusItem]);

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
            const index = event.key === 'ArrowDown' ? 0 : -1;
            if (open) focusItem(index);
            else {
              pendingFocus.current = index;
              setOpen(true);
            }
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
          style={{ maxHeight, overflowY: 'auto' }}
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
