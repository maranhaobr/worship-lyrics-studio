import { AbsoluteFill } from 'remotion';
import type { CompositionProps } from '@wls/shared';
import { BackgroundLayer } from './BackgroundLayer';
import { LyricLayer } from './LyricLayer';

export function LyricComposition(props: CompositionProps) {
  return <AbsoluteFill><BackgroundLayer {...props} /><LyricLayer document={props.document} /></AbsoluteFill>;
}
