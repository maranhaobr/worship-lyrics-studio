import type { CSSProperties } from 'react';
import type { VisualStyle } from '@wls/shared';
import { rhythmState } from './rhythm';

export function wordEmphasisStyle(emphasis: NonNullable<VisualStyle['text']['emphasis']>, elapsedWordMs: number, globalFrame: number, fps: number, decoration: VisualStyle['decoration']): CSSProperties {
  const progress = Math.max(0, Math.min(1, elapsedWordMs / 320));
  const pulse = rhythmState(globalFrame, fps, decoration?.bpm, decoration?.beatOffsetMs).pulse;
  const scale = emphasis.animation === 'pop' ? 1 + Math.sin(progress * Math.PI) * .12 : emphasis.animation === 'beat' ? 1 + pulse * .035 : 1;
  return { display: emphasis.placement === 'line' ? 'block' : 'inline-block', maxWidth: '100%',
    fontFamily: `"${emphasis.fontFamily}", sans-serif`, fontWeight: Number(emphasis.fontWeight), color: emphasis.color,
    fontSize: `${emphasis.sizeScale}em`, textTransform: emphasis.uppercase ? 'uppercase' : 'none',
    transform: `scale(${scale})`, transformOrigin: 'center', overflowWrap: 'anywhere' };
}
