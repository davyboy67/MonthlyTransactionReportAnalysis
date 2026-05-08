import type { ReactNode, ElementType, CSSProperties } from 'react';
import './GlassPanel.css';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  tint?: string;
}

export function GlassPanel({ children, className, as: Tag = 'div', tint }: GlassPanelProps) {
  const cls = `glass${tint ? ' glass--tinted' : ''}${className ? ` ${className}` : ''}`;
  const style = tint ? ({ '--glass-tint': tint } as CSSProperties) : undefined;
  return (
    <Tag className={cls} style={style}>
      {children}
    </Tag>
  );
}
