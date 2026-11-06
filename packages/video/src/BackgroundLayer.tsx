import { AbsoluteFill, Img, Loop, OffthreadVideo } from 'remotion';
import type { CompositionProps } from '@wls/shared';

export function BackgroundLayer({ document, media }: CompositionProps) {
  const background = document.style.background;
  const asset = background.type === 'gradient' ? undefined : media[background.assetId];
  return <AbsoluteFill style={{ background: '#050609' }}>
    {background.type === 'gradient' ? <AbsoluteFill style={{ background: `linear-gradient(${background.angle}deg, ${background.from}, ${background.to})` }} /> : asset ? (
      background.type === 'image' ? <Img src={asset.src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
        <Loop durationInFrames={Math.max(1, Math.floor((asset.durationMs ?? document.durationMs) * document.fps / 1000))}>
          <OffthreadVideo src={asset.src} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </Loop>
    ) : null}
    <AbsoluteFill style={{ backgroundColor: `rgba(0,0,0,${document.style.overlay})` }} />
  </AbsoluteFill>;
}
