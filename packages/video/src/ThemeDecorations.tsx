import { useId } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import type { VisualStyle } from '@wls/shared';

/** Original vector scenery; all motion is derived from the current frame. */
export function ThemeDecorations({ decoration }: { decoration: VisualStyle['decoration'] }) {
  const frame = useCurrentFrame(), { fps } = useVideoConfig();
  const id = useId().replace(/:/g, '');
  if (!decoration || decoration.theme === 'none') return null;
  const { theme, accent, intensity, motion } = decoration;
  const t = motion ? frame / fps : 0;
  const pulse = .8 + Math.sin(t * .5) * .12;
  return <AbsoluteFill style={{ pointerEvents: 'none', opacity: intensity }}>
    <svg viewBox="0 0 1920 1080" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}light`}><stop stopColor={accent} stopOpacity=".45" /><stop offset="1" stopColor={accent} stopOpacity="0" /></radialGradient>
        <radialGradient id={`${id}vignette`}><stop offset=".4" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".65" /></radialGradient>
        <filter id={`${id}grain`}><feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="3" seed="7" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
      </defs>
      {(theme === 'paper' || theme === 'bold' || theme === 'easter') && <rect width="1920" height="1080" filter={`url(#${id}grain)`} opacity={theme === 'paper' ? .19 : .08} style={{ mixBlendMode: 'multiply' }} />}
      {theme === 'christmas' && <>
        <ellipse cx="1500" cy="190" rx="650" ry="500" fill={`url(#${id}light)`} opacity={pulse} />
        <path d="M1550 0V115" stroke={accent} strokeWidth="2" opacity=".6" />
        <path d="M1550 95L1566 150L1623 151L1577 184L1595 240L1550 206L1505 240L1523 184L1477 151L1534 150Z" fill={accent} opacity={pulse} />
        {[100, 260, 1720, 1840].map((x, i) => <g key={x} transform={`translate(${x} ${720 + (i % 2) * 95})`} fill="#031b17" stroke={accent} strokeOpacity=".18" strokeWidth="2"><path d="M0 -260L-100 -80H-65L-145 65H-95L-180 220H180L95 65H145L65 -80H100Z" /><path d="M-12 220V320H12V220" /></g>)}
        {Array.from({ length: 44 }, (_, i) => <circle key={i} cx={(i * 347 + 71) % 1920} cy={((i * 191 + 53 + t * (7 + i % 9)) % 1140) - 30} r={i % 5 === 0 ? 4 : 1.8} fill={accent} opacity={.2 + (i % 4) * .12} />)}
      </>}
      {theme === 'easter' && <>
        <ellipse cx="1550" cy="570" rx="850" ry="780" fill={`url(#${id}light)`} opacity={pulse} />
        <path d="M0 1000Q400 880 900 1020Q1450 790 1920 920V1080H0Z" fill={accent} opacity=".14" />
        <path d="M0 1080Q900 980 1920 920V1080Z" fill={accent} opacity=".13" />
        <g transform="translate(1590 760) rotate(-3)" stroke={accent} strokeWidth="12" strokeLinecap="round" opacity=".65"><path d="M0 -135V170M-65 -65H65" /></g>
        <path d="M120 920Q90 800 165 738M115 875Q60 850 72 812Q115 816 115 875M127 827Q183 821 188 784Q142 780 127 827" fill="none" stroke={accent} strokeWidth="4" opacity=".4" />
      </>}
      {theme === 'cinematic' && <>
        <ellipse cx="960" cy="330" rx="800" ry="270" fill={`url(#${id}light)`} opacity={pulse} />
        <ellipse cx="960" cy="330" rx="830" ry="5" fill={`url(#${id}light)`} />
        <path d="M940 350L400 1080H1550L980 350Z" fill={`url(#${id}light)`} opacity=".45" />
        <circle cx="960" cy="330" r="12" fill={accent} opacity={pulse} />
      </>}
      {theme === 'bold' && <><ellipse cx="0" cy="160" rx="900" ry="650" fill={`url(#${id}light)`} opacity={pulse} /><path d="M0 10H1920M0 1070H1920" stroke={accent} strokeWidth="6" opacity=".35" /></>}
      {theme === 'paper' && <><ellipse cx="240" cy="150" rx="1100" ry="600" fill={`url(#${id}light)`} opacity=".3" /><path d="M0 980Q800 820 1920 970V1080H0Z" fill={accent} opacity=".1" /></>}
      {(theme === 'christmas' || theme === 'cinematic' || theme === 'bold') && <rect width="1920" height="1080" fill={`url(#${id}vignette)`} />}
    </svg>
  </AbsoluteFill>;
}
