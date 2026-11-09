import { AbsoluteFill, Img, Loop, OffthreadVideo, staticFile } from 'remotion';
import type { CompositionProps, VisualStyle } from '@wls/shared';
import { ThemeDecorations } from './ThemeDecorations';

export function BackgroundLayer({ document, media, style = document.style }: CompositionProps & { style?: VisualStyle }) {
  const background = style.background;
  const asset = background.type === 'gradient' ? undefined : media[background.assetId];
  const src = asset?.src.startsWith('static:') ? staticFile(asset.src.slice(7)) : asset?.src;
  return <AbsoluteFill style={{ background: '#050609' }}>
    {background.type === 'gradient' ? <AbsoluteFill style={{ background: `linear-gradient(${background.angle}deg, ${background.from}, ${background.to})` }} /> : asset && src ? (
      background.type === 'image' ? <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
        <Loop durationInFrames={Math.max(1, Math.floor((asset.durationMs ?? document.durationMs) * document.fps / 1000))}>
          <OffthreadVideo src={src} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </Loop>
    ) : null}
    <ThemeDecorations decoration={style.decoration} />
    <AbsoluteFill style={{ backgroundColor: `rgba(0,0,0,${style.overlay})` }} />
  </AbsoluteFill>;
}
