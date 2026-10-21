import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from './Button';

export function MobileCardActionsMenu({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="row-actions-menu">
      <Button
        variant="unstyled"
        className="button button-small"
        type="button"
        title={label}
        aria-label={label}
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
        }}
      >
        <MoreHorizontal aria-hidden="true" />
      </Button>
      {open ? (
        <div
          className="row-actions-popover"
          onClick={() => {
            setOpen(false);
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
