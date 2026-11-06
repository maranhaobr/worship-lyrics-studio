import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { frameToMs, type VisualProjectDocument } from '@wls/shared';
import { animationStyle } from './animations';

export function LyricLayer({ document }: { document: VisualProjectDocument }) {
  const time = frameToMs(useCurrentFrame(), document.fps);
  const clip = document.clips.find(item => time >= item.startMs && time < item.endMs);
  if (!clip) return null;
  const { text, animation } = document.style;
  const elapsed = time - clip.startMs;
  return <AbsoluteFill style={{ justifyContent: text.position === 'top' ? 'flex-start' : text.position === 'bottom' ? 'flex-end' : 'center', padding: 100 }}>
    <div style={{ textAlign: text.align, color: text.color, fontFamily: text.fontFamily, fontSize: text.fontSize, fontWeight: 700, lineHeight: 1.3, overflowWrap: 'anywhere', textShadow: '0 3px 16px rgba(0,0,0,.65)', ...animationStyle(elapsed, Math.min(animation.durationMs, clip.endMs - clip.startMs), animation.type) }}>
      {animation.type === 'words' ? clip.words.map((word, index) => <span key={index} style={{ opacity: Math.max(0, Math.min(1, (elapsed - word.startMs) / Math.max(1, Math.min(animation.durationMs, word.endMs - word.startMs)))) }}>{index ? ' ' : ''}{word.text}</span>) : clip.text}
    </div>
  </AbsoluteFill>;
}
