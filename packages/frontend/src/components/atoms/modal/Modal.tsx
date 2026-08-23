import { useEffect, useId, useRef } from 'react';
import type { MouseEvent, ReactNode, RefObject } from 'react';
import { Surface } from '../surface/Surface';
import './Modal.css';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  returnFocusTo?: RefObject<HTMLElement | null>;
}

export function Modal({ title, onClose, children, returnFocusTo }: ModalProps) {
  // A click fires on the common ancestor of its mousedown and mouseup, so dragging out of
  // the panel would otherwise read as a backdrop click.
  const pressedBackdrop = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const triggerOnOpen = useRef<HTMLElement | null>(
    typeof document === 'undefined' ? null : (document.activeElement as HTMLElement | null)
  );

  useEffect(() => {
    const focusable = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      );

    focusable()[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      const explicit = returnFocusTo?.current;
      const captured = triggerOnOpen.current;
      const target =
        explicit && explicit.isConnected
          ? explicit
          : captured && captured.isConnected
            ? captured
            : null;
      target?.focus();
    };
  }, [onClose, returnFocusTo]);

  const handleMouseDown = (event: MouseEvent) => {
    pressedBackdrop.current = event.target === event.currentTarget;
  };

  const handleClick = (event: MouseEvent) => {
    if (pressedBackdrop.current && event.target === event.currentTarget) onClose();
    pressedBackdrop.current = false;
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      role="presentation"
    >
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} ref={panelRef}>
        <Surface className="modal-panel">
          <h2 className="modal-title" id={titleId}>
            {title}
          </h2>
          {children}
        </Surface>
      </div>
    </div>
  );
}
