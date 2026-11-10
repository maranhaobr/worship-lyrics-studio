import { authenticatedFetch as fetch, cleanupTestAccount } from './auth-helper';
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, RenderInternals, selectComposition } from '@remotion/renderer';
import { prisma } from '@wls/database';
import { distributeWords, projectFromSong, type CompositionProps, type MediaView } from '@wls/shared';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000';
const ff = (bin: 'ffmpeg' | 'ffprobe', args: string[]) => RenderInternals.callFf({ bin, args, indent: false, logLevel: 'error', binariesDirectory: null, cancelSignal: undefined });
test('renders gradient, image and looping video backgrounds without an audio track', { timeout: 180000 }, async () => {
  const ids: string[] = [];
  let projectId: string | undefined;
  const prefix = resolve('out', `render-test-${Date.now()}`);
  try {
    await mkdir('out', { recursive: true });
    const document = projectFromSong({ title: 'Render test', sections: [{ type: 'VERSE', label: 'Verso', lines: [{ text: 'Santo para sempre' }] }] }, () => 'clip');
    document.durationMs = 1000; document.clips[0].endMs = 1000;
    document.clips[0].words = [{ text: 'Santo', startMs: 0, endMs: 300 }, { text: 'para', startMs: 300, endMs: 600 }, { text: 'sempre', startMs: 600, endMs: 1000 }];
    document.style.animation = { type: 'words', durationMs: 100 };
    const serveUrl = await bundle({ entryPoint: resolve('packages/video/src/remotion/index.ts') });
    async function render(inputProps: CompositionProps, outputLocation: string) {
      const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE;
      const composition = await selectComposition({ serveUrl, id: 'WorshipLyrics', inputProps, browserExecutable });
      await renderMedia({ serveUrl, composition, inputProps, outputLocation, codec: 'h264', pixelFormat: 'yuv420p', muted: true, concurrency: 2, browserExecutable });
      const probe = await ff('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', outputLocation]);
      const streams = (JSON.parse(probe.stdout) as { streams: { codec_type: string; width?: number; height?: number }[] }).streams;
      assert.equal(streams.length, 1); assert.equal(streams[0].codec_type, 'video'); assert.equal(streams[0].width, 1920); assert.equal(streams[0].height, 1080);
    }
    await render({ document, media: {} }, `${prefix}-gradient.mp4`);
    // A PCM WAV fixture avoids depending on optional FFmpeg source filters.
    const pcm = Buffer.alloc(44100 * 2);
    for (let i = 0; i < 44100; i++) pcm.writeInt16LE(Math.round(Math.sin(i * 2 * Math.PI * 440 / 44100) * 1000), i * 2);
    const wav = Buffer.alloc(44); wav.write('RIFF'); wav.writeUInt32LE(36 + pcm.length, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(44100, 24); wav.writeUInt32LE(88200, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(pcm.length, 40);
    await writeFile(`${prefix}.wav`, Buffer.concat([wav, pcm]));
    await ff('ffmpeg', ['-i', `${prefix}-gradient.mp4`, '-i', `${prefix}.wav`, '-t', '0.5', '-c:v', 'copy', '-c:a', 'aac', `${prefix}-source.mp4`]);
    const sourceProbe = await ff('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=codec_type', '-of', 'json', `${prefix}-source.mp4`]);
    assert.equal((JSON.parse(sourceProbe.stdout) as { streams: unknown[] }).streams.length, 1, 'source fixture must have audio');
    async function upload(bytes: Uint8Array, name: string, mime: string, durationMs?: number): Promise<MediaView> {
      const form = new FormData(); form.append('file', new Blob([new Uint8Array(bytes)], { type: mime }), name);
      if (durationMs) form.append('durationMs', String(durationMs));
      const response = await fetch(`${base}/api/media`, { method: 'POST', body: form }); assert.equal(response.status, 201);
      const asset = await response.json() as MediaView; ids.push(asset.id); return asset;
    }
    const videoBytes = await readFile(`${prefix}-source.mp4`);
    await mkdir(resolve(serveUrl, 'public'), { recursive: true });
    await writeFile(resolve(serveUrl, 'public', 'test-video.mp4'), videoBytes);
    const video = await upload(videoBytes, 'render-test.mp4', 'video/mp4', 500);
    document.style.background = { type: 'video', assetId: video.id };
    await render({ document, media: { [video.id]: { src: 'static:test-video.mp4', durationMs: 500 } } }, `${prefix}-video.mp4`);
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP1cAAAAASUVORK5CYII=', 'base64');
    await writeFile(resolve(serveUrl, 'public', 'test-image.png'), png);
    const image = await upload(png, 'render-test.png', 'image/png');
    document.style.background = { type: 'image', assetId: image.id }; document.style.animation.type = 'zoom';
    await render({ document, media: { [image.id]: { src: 'static:test-image.png', durationMs: null } } }, `${prefix}-image.mp4`);
    const created = await fetch(`${base}/api/visual-projects/from-lyrics`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Export test', lyrics: 'Santo para sempre\nGlória a Ti' }) });
    assert.equal(created.status, 201); projectId = (await created.json() as { id: string }).id;
    document.style.background = { type: 'gradient', from: '#000000', to: '#000000', angle: 0 };
    const reference = await upload(await readFile(`${prefix}.wav`), 'reference.wav', 'audio/wav');
    document.referenceAudio = { assetId: reference.id };
    document.clips = [
      { ...document.clips[0], id: 'first', startMs: 0, endMs: 500, words: distributeWords(document.clips[0].text, 500), style: { background: { type: 'video', assetId: video.id }, animation: { type: 'slide', durationMs: 100 } } },
      { ...document.clips[0], id: 'second', startMs: 500, endMs: 1000, words: distributeWords(document.clips[0].text, 500), style: { background: { type: 'image', assetId: image.id }, animation: { type: 'zoom', durationMs: 100 } } },
    ];
    const exported = await fetch(`${base}/api/visual-projects/${projectId}/export`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(document) });
    assert.equal(exported.status, 200, await exported.clone().text().then(text => text.slice(0, 200)));
    assert.equal(exported.headers.get('content-type'), 'video/mp4');
    const exportPath = `${prefix}-slides.mp4`; await writeFile(exportPath, Buffer.from(await exported.arrayBuffer()));
    const probe = await ff('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,width,height', '-of', 'json', exportPath]);
    const streams = (JSON.parse(probe.stdout) as { streams: { codec_type: string; width: number; height: number }[] }).streams;
    assert.equal(streams.length, 1); assert.equal(streams[0].codec_type, 'video'); assert.equal(streams[0].width, 1920);
    await ff('ffmpeg', ['-ss', '0.25', '-i', exportPath, '-frames:v', '1', `${prefix}-first.png`]);
    await ff('ffmpeg', ['-ss', '0.75', '-i', exportPath, '-frames:v', '1', `${prefix}-second.png`]);
  } finally {
    if (projectId) await prisma.visualProject.deleteMany({ where: { id: projectId } });
    for (const id of ids) {
      const asset = await prisma.mediaAsset.findUniqueOrThrow({ where: { id } });
      await unlink(resolve(process.env.MEDIA_STORAGE_DIR ?? '.data/media', asset.storageKey));
      await prisma.mediaAsset.delete({ where: { id } });
    }
    await cleanupTestAccount();
    await prisma.$disconnect();
  }
});
