import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, RenderInternals, selectComposition } from '@remotion/renderer';
import { distributeWords, projectFromSong, templatePresets, type CompositionProps } from '@wls/shared';

async function main() {
  const output = resolve('out/rhythmic-themes'); await mkdir(output, { recursive: true });
  const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE;
  const serveUrl = await bundle({ entryPoint: resolve('packages/video/src/remotion/index.ts') });
  const presets = templatePresets.filter(item => ['pulse', 'kinetic', 'neon'].includes(item.style.decoration?.theme ?? ''));
  for (const preset of presets) {
    const document = projectFromSong({ title: 'Ritmo', sections: [{ type: 'VERSE', label: 'Verso', lines: [{ text: 'Tua alegria me move' }] }] }, () => 'clip');
    document.width = 960; document.height = 540; document.durationMs = 3000;
    document.clips[0].endMs = 3000; document.clips[0].words = distributeWords(document.clips[0].text, 3000);
    document.style = structuredClone(preset.style);
    document.style.animation = { type: 'fade', durationMs: 100, exitType: 'none' };
    const inputProps: CompositionProps = { document, media: {} };
    let composition = await selectComposition({ serveUrl, id: 'WorshipLyrics', inputProps, browserExecutable });
    async function still(frame: number, file: string) { await renderStill({ serveUrl, composition, inputProps, frame, output: resolve(output, file), browserExecutable }); return readFile(resolve(output, file)); }
    const first = await still(30, `${preset.id}.png`), next = await still(38, `${preset.id}-next.png`);
    assert.notDeepEqual(first, next, `${preset.id} must visibly move`);
    document.style.decoration!.motion = false;
    composition = await selectComposition({ serveUrl, id: 'WorshipLyrics', inputProps, browserExecutable });
    const frozen = await still(30, `${preset.id}-frozen.png`), frozenNext = await still(38, `${preset.id}-frozen-next.png`);
    assert.deepEqual(frozen, frozenNext, `${preset.id} must freeze completely when motion is disabled`);
    console.log(`${preset.name}: movement and freeze verified in rendered frames.`);
  }
  let id = 0;
  const document = projectFromSong({ title: 'Temas rítmicos', sections: [{ type: 'VERSE', label: 'Verso', lines: presets.map(() => ({ text: 'Tua alegria me move' })) }] }, () => `clip-${++id}`);
  document.width = 960; document.height = 540; document.durationMs = 6000;
  document.style = structuredClone(presets[0].style);
  document.clips.forEach((clip, i) => { clip.startMs = i * 2000; clip.endMs = (i + 1) * 2000; clip.words = distributeWords(clip.text, 2000); clip.style = structuredClone(presets[i].style); });
  const inputProps: CompositionProps = { document, media: {} };
  const composition = await selectComposition({ serveUrl, id: 'WorshipLyrics', inputProps, browserExecutable });
  const outputLocation = resolve(output, 'rhythmic-themes.mp4');
  await renderMedia({ serveUrl, composition, inputProps, outputLocation, codec: 'h264', muted: true, concurrency: 2, browserExecutable });
  const probe = await RenderInternals.callFf({ bin: 'ffprobe', args: ['-v', 'error', '-show_streams', '-of', 'json', outputLocation], indent: false, logLevel: 'error', binariesDirectory: null, cancelSignal: undefined });
  const streams = (JSON.parse(probe.stdout) as { streams: { codec_type: string; width: number; height: number }[] }).streams;
  assert.equal(streams.length, 1); assert.equal(streams[0].codec_type, 'video'); assert.equal(streams[0].width, 960); assert.equal(streams[0].height, 540);
  console.log('Three rhythmic themes rendered to MP4 without audio.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
