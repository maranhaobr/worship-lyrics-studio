import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, RenderInternals, selectComposition } from '@remotion/renderer';
import { distributeWords, projectFromSong, templatePresets, visualProjectSchema, type CompositionProps } from '@wls/shared';

async function main() {
  const output = resolve('out/word-emphasis');
  await mkdir(output, { recursive: true });
  const serveUrl = await bundle({ entryPoint: resolve('packages/video/src/remotion/index.ts') });
  const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE;
  const document = projectFromSong({ title: 'Destaque', sections: [{ type: 'VERSE', label: 'Verso', lines: [{ text: 'Tudo é para Jesus' }] }] }, () => 'emphasis');
  document.durationMs = 3000;
  document.clips[0].endMs = 3000;
  document.clips[0].words = distributeWords(document.clips[0].text, 3000);
  document.style = structuredClone(templatePresets.find(preset => preset.id === 'builtin-keyword-impact')!.style);
  const original = JSON.stringify(document.clips);
  for (const [width, height] of [[960, 540], [640, 480]]) {
    document.width = width; document.height = height;
    assert.ok(visualProjectSchema.safeParse(document).success);
    const inputProps: CompositionProps = { document, media: {} };
    const composition = await selectComposition({ serveUrl, id: 'WorshipLyrics', inputProps, browserExecutable });
    await renderStill({ serveUrl, composition, inputProps, frame: 80, output: resolve(output, `${width}x${height}.png`), browserExecutable });
    if (width === 640) {
      const outputLocation = resolve(output, 'keyword-emphasis.mp4');
      await renderMedia({ serveUrl, composition, inputProps, outputLocation, codec: 'h264', muted: true, concurrency: 2, browserExecutable });
      const probe = await RenderInternals.callFf({ bin: 'ffprobe', args: ['-v', 'error', '-show_streams', '-of', 'json', outputLocation], indent: false, logLevel: 'error', binariesDirectory: null, cancelSignal: undefined });
      const streams = (JSON.parse(probe.stdout) as { streams: { codec_type: string; width: number; height: number }[] }).streams;
      assert.equal(streams.length, 1);
      assert.equal(streams[0].codec_type, 'video');
      assert.equal(streams[0].width, width); assert.equal(streams[0].height, height);
    }
  }
  assert.equal(JSON.stringify(document.clips), original, 'Rendering must preserve lyric text and timing');
  console.log('Keyword emphasis rendered at 16:9 and 4:3; MP4 without audio; lyrics and timing preserved.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
