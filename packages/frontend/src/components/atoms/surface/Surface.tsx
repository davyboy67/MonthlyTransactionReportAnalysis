import type { ReactNode, ElementType } from 'react';
import './Surface.css';

/** Semantic, not a raw hex: components never name a colour value directly. */
export type SurfaceTone = 'income' | 'expenses' | 'savings' | 'warning';

interface SurfaceProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  tone?: SurfaceTone;
}

export function Surface({ children, className, as: Tag = 'div', tone }: SurfaceProps) {
  const cls = `surface${tone ? ` surface--${tone}` : ''}${className ? ` ${className}` : ''}`;
  return <Tag className={cls}>{children}</Tag>;
}
