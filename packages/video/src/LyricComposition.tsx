import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { displayClipAt, frameToMs, msToFrame, resolveClipStyle, type CompositionProps } from '@wls/shared';
import { BackgroundLayer } from './BackgroundLayer';
import { LyricLayer } from './LyricLayer';
import { useLyricFonts } from './fonts';

export function LyricComposition(props: CompositionProps) {
  useLyricFonts();
  const time = frameToMs(useCurrentFrame(), props.document.fps);
  const clip = displayClipAt(props.document, time)?.clip;
  const style = resolveClipStyle(props.document.style, clip);
  const background = <BackgroundLayer {...props} style={style} />;
  return <AbsoluteFill>{clip?.style?.background ? <Sequence key={clip.id} from={msToFrame(clip.startMs, props.document.fps)}>{background}</Sequence> : background}<LyricLayer document={props.document} /></AbsoluteFill>;
}
