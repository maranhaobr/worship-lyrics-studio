import type { CSSProperties } from 'react';
import type { VisualStyle } from '@wls/shared';

export function animationStyle(elapsedMs: number, durationMs: number, type: VisualStyle['animation']['type']): CSSProperties {
  const progress = Math.min(1, Math.max(0, elapsedMs / durationMs));
  const eased = 1 - Math.pow(1 - progress, 3);
  return {
    opacity: progress,
    transform: type === 'slide' ? `translateY(${(1 - eased) * 60}px)` : type === 'zoom' ? `scale(${0.8 + eased * 0.2})` : undefined,
  };
}
