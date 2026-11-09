import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { displayClipAt, frameToMs, getSectionHeading, resolveClipStyle, type VisualProjectDocument } from '@wls/shared';
import { animationStyle, exitAnimationStyle } from './animations';

export function LyricLayer({ document }: { document: VisualProjectDocument }) {
  const time = frameToMs(useCurrentFrame(), document.fps);
  const display = displayClipAt(document, time);
  if (!display || getSectionHeading(display.clip.text)) return null;
  const { clip, endMs, exitMs } = display;
  const { text, animation } = resolveClipStyle(document.style, clip);
  const elapsed = time - clip.startMs;
  const shadow = text.shadow ?? 'soft';
  const textShadow = shadow === 'none' ? 'none' : shadow === 'strong' ? '0 5px 4px #000b, 0 12px 28px #0009' : shadow === 'glow' ? `0 0 20px ${text.color}88, 0 0 55px ${text.color}44` : '0 3px 16px rgba(0,0,0,.65)';
  return <AbsoluteFill style={{ justifyContent: text.position === 'top' ? 'flex-start' : text.position === 'bottom' ? 'flex-end' : 'center', alignItems: text.align === 'left' ? 'flex-start' : text.align === 'right' ? 'flex-end' : 'center', padding: 100 }}>
    <div style={{ width: `${text.widthPercent ?? 100}%`, transform: `translate(${(text.offsetX ?? 0) * document.width / 100}px, ${(text.offsetY ?? 0) * document.height / 100}px)` }}><div style={exitAnimationStyle(endMs - time, exitMs, animation.exitType ?? 'fade')}><div style={{ textAlign: text.align, color: text.color, fontFamily: `"${text.fontFamily}", ${['Georgia', 'Playfair Display', 'Dancing Script'].includes(text.fontFamily) ? 'serif' : 'sans-serif'}`, fontSize: text.fontSize, fontWeight: Number(text.fontWeight ?? '700'), fontStyle: text.italic ? 'italic' : 'normal', textTransform: text.uppercase ? 'uppercase' : 'none', letterSpacing: text.letterSpacing ?? 0, lineHeight: text.lineHeight ?? 1.3, overflowWrap: 'anywhere', textShadow, WebkitTextStroke: `${text.strokeWidth ?? 0}px ${text.strokeColor ?? '#000000'}`, paintOrder: 'stroke fill', whiteSpace: 'pre-line', backgroundColor: text.plate === 'dark' ? '#0009' : text.plate === 'light' ? '#ffffffe0' : undefined, borderRadius: 16, padding: text.plate && text.plate !== 'none' ? '24px 40px' : undefined, ...animationStyle(elapsed, Math.min(animation.durationMs, clip.endMs - clip.startMs), animation.type) }}>
      {animation.type === 'words' ? clip.words.map((word, index) => <span key={index} style={{ opacity: Math.max(0, Math.min(1, (elapsed - word.startMs) / Math.max(1, Math.min(animation.durationMs, word.endMs - word.startMs)))) }}>{index ? ' ' : ''}{word.text}</span>) : clip.text}
    </div></div></div>
  </AbsoluteFill>;
}
