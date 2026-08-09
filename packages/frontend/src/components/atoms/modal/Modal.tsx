import { useEffect, useRef } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { GlassPanel } from '../glassPanel/GlassPanel';
import './Modal.css';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  // A click fires on the common ancestor of its mousedown and mouseup, so dragging out of
  // the panel would otherwise read as a backdrop click.
  const pressedBackdrop = useRef(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
      <div role="dialog" aria-modal="true">
        <GlassPanel className="modal-panel">
          <h2 className="modal-title">{title}</h2>
          {children}
        </GlassPanel>
      </div>
    </div>
  );
}
