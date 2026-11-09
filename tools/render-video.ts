import { readFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { z } from 'zod';
import { projectBackgrounds, visualProjectSchema } from '../packages/shared/src/visual/project';

async function main() {
  const [, , input, output = 'out/worship.mp4'] = process.argv;
  if (!input) throw new Error('Uso: npm run render:video -- projeto.json [out/video.mp4]');
  const inputProps = z.object({ document: visualProjectSchema, media: z.record(z.object({ src: z.string().url(), durationMs: z.number().int().positive().nullable() })) }).parse(JSON.parse(await readFile(resolve(input), 'utf8')));
  for (const background of projectBackgrounds(inputProps.document)) {
    if (background.type !== 'gradient' && !inputProps.media[background.assetId]) throw new Error('Mídia do fundo não encontrada no projeto');
  }
  const serveUrl = await bundle({ entryPoint: resolve('packages/video/src/remotion/index.ts') });
  const composition = await selectComposition({ serveUrl, id: 'WorshipLyrics', inputProps });
  await mkdir(dirname(resolve(output)), { recursive: true });
  await renderMedia({ composition, serveUrl, inputProps, outputLocation: resolve(output), codec: 'h264', pixelFormat: 'yuv420p', muted: true, overwrite: false, concurrency: 2 });
  console.log(`MP4 sem áudio salvo em ${resolve(output)}`);
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Erro ao renderizar'); process.exitCode = 1; });
