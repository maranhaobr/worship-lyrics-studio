'use client';
import { useEffect, useMemo, useRef } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { LyricComposition } from '@wls/video';
import { Html5Audio } from 'remotion';
import { durationInFrames, type CompositionProps, type MediaView, type VisualProjectDocument } from '@wls/shared';

// Reference audio exists only in the interactive preview, never in the exported composition.
function PreviewComposition(props: CompositionProps) {
  const audio = props.document.referenceAudio ? props.media[props.document.referenceAudio.assetId] : undefined;
  return <><LyricComposition {...props} />{audio && <Html5Audio src={audio.src} />}</>;
}

export function PreviewPlayer({ document, assets, onFrame, playerRef }: {
  document: VisualProjectDocument; assets: MediaView[]; onFrame: (frame: number) => void; playerRef: React.RefObject<PlayerRef | null>;
}) {
  const callback = useRef(onFrame); callback.current = onFrame;
  const media = useMemo(() => Object.fromEntries(assets.map(asset => [asset.id, { src: `/api/media/${asset.id}/content`, durationMs: asset.durationMs }])), [assets]);
  const props = useMemo(() => ({ document, media }), [document, media]);
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const listener = (event: { detail: { frame: number } }) => callback.current(event.detail.frame);
    player.addEventListener('frameupdate', listener);
    player.addEventListener('seeked', listener);
    return () => { player.removeEventListener('frameupdate', listener); player.removeEventListener('seeked', listener); };
  }, [playerRef]);
  return <div className="overflow-hidden rounded-xl border border-slate-700 bg-black">
    <Player ref={playerRef} component={PreviewComposition} inputProps={props} durationInFrames={durationInFrames(document)}
      fps={document.fps} compositionWidth={document.width} compositionHeight={document.height} controls showVolumeControls={Boolean(document.referenceAudio)} style={{ width: '100%', aspectRatio: `${document.width} / ${document.height}` }}
      errorFallback={({ error }) => <div role="alert" className="p-6 text-red-200">Não foi possível carregar o preview: {error.message}</div>} />
  </div>;
}
