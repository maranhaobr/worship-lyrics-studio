import { Composition } from 'remotion';
import { durationInFrames, projectFromSong, visualProjectSchema, type CompositionProps } from '@wls/shared';
import { LyricComposition } from '../LyricComposition';

const document = projectFromSong({ title: 'Prévia', sections: [{ type: 'VERSE', label: 'Verso', lines: [{ text: 'Worship Lyrics Studio' }] }] }, () => 'sample');
export function RemotionRoot() {
  return <Composition id="WorshipLyrics" component={LyricComposition} width={1920} height={1080} fps={30} durationInFrames={120}
    defaultProps={{ document, media: {} } satisfies CompositionProps}
    calculateMetadata={({ props }) => {
      const document = visualProjectSchema.parse(props.document);
      return { durationInFrames: durationInFrames(document), fps: document.fps, width: document.width, height: document.height };
    }} />;
}
