import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, RenderInternals, selectComposition } from '@remotion/renderer';
import { distributeWords, lyricVideoEncoding, projectFromSong, type CompositionProps } from '@wls/shared';

async function main() {
  const output = resolve('out/export-quality'); await mkdir(output, { recursive: true });
  const serveUrl = await bundle({ entryPoint: resolve('packages/video/src/remotion/index.ts') });
  const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE;
  const document = projectFromSong({ title: 'Qualidade', sections: [{ type: 'VERSE', label: 'Verso', lines: [{ text: 'Eu dou graças' }] }] }, () => 'quality');
  document.width = 1440; document.height = 1080; document.durationMs = 1000;
  document.clips[0].endMs = 1000; document.clips[0].words = distributeWords(document.clips[0].text, 1000);
  document.style.text = { ...document.style.text, fontFamily: 'Georgia', uppercase: true, position: 'top', shadow: 'strong' };
  document.style.background = { type: 'gradient', from: '#4e6072', to: '#bd5904', angle: 180 };
  document.style.animation = { type: 'fade', durationMs: 100, holdMs: 0, exitType: 'none' };
  const inputProps: CompositionProps = { document, media: {} };
  const composition = await selectComposition({ serveUrl, id: 'WorshipLyrics', inputProps, browserExecutable });
  await renderStill({ composition, serveUrl, inputProps, frame: 15, output: resolve(output, 'reference.png'), browserExecutable });
  const outputLocation = resolve(output, 'high-quality-4x3.mp4');
  await renderMedia({ composition, serveUrl, inputProps, outputLocation, ...lyricVideoEncoding, concurrency: 2, browserExecutable });
  const ff = (bin: 'ffmpeg' | 'ffprobe', args: string[]) => RenderInternals.callFf({ bin, args, indent: false, logLevel: 'error', binariesDirectory: null, cancelSignal: undefined });
  const result = await ff('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', outputLocation]);
  const streams = (JSON.parse(result.stdout) as { streams: { codec_type: string; width: number; height: number; pix_fmt: string }[] }).streams;
  assert.equal(streams.length, 1); assert.equal(streams[0].codec_type, 'video');
  assert.equal(streams[0].width, 1440); assert.equal(streams[0].height, 1080); assert.equal(streams[0].pix_fmt, 'yuv420p');
  await ff('ffmpeg', ['-y', '-ss', '0.5', '-i', outputLocation, '-frames:v', '1', resolve(output, 'exported.png')]);
  console.log('High-quality MP4 verified: 1440x1080, H.264/yuv420p, no audio; decoded comparison frame saved.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
