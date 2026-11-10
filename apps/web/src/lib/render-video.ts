import { requireActor } from './auth/session';
import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { prisma } from '@wls/database';
import { projectBackgrounds, type CompositionProps, type VisualProjectDocument } from '@wls/shared';
import { ApiError } from './api-errors';
import { workspaceRoot } from './server-paths';
import { readMedia } from './storage/local';
import { validateProjectMedia } from './visual-project-data';

// Local Node deployment: one render per process. A hosted multi-instance SaaS
// should replace this admission control with a durable queue and render workers.
const globalRender = globalThis as unknown as { wlsRender?: { busy: boolean } };
const state = globalRender.wlsRender ??= { busy: false };
export async function renderProjectVideo(document: VisualProjectDocument) {
  const {churchId}=await requireActor('edit');
  if (state.busy) throw new ApiError(429, 'Outro vídeo está sendo gerado. Tente novamente em instantes.');
  state.busy = true;
  const directory = resolve(workspaceRoot(), '.data/renders', randomUUID());
  const dispose = () => rm(directory, { recursive: true, force: true });
  try {
    await validateProjectMedia(document);
    const ids = [...new Set(projectBackgrounds(document).flatMap(background => background.type === 'gradient' ? [] : [background.assetId]))];
    const assets = await prisma.mediaAsset.findMany({ where: { churchId, id: { in: ids } } });
    const publicDir = resolve(directory, 'public');
    await mkdir(publicDir, { recursive: true });
    const media: CompositionProps['media'] = {};
    for (const asset of assets) {
      await writeFile(resolve(publicDir, asset.storageKey), await readMedia(asset.storageKey));
      media[asset.id] = { src: `static:${asset.storageKey}`, durationMs: asset.durationMs };
    }
    const serveUrl = await bundle({ entryPoint: resolve(workspaceRoot(), 'packages/video/src/remotion/index.ts'), outDir: resolve(directory, 'bundle'), publicDir });
    const inputProps: CompositionProps = { document, media };
    const composition = await selectComposition({ serveUrl, id: 'WorshipLyrics', inputProps });
    const path = resolve(directory, 'video.mp4');
    await renderMedia({ composition, serveUrl, inputProps, outputLocation: path, codec: 'h264', pixelFormat: 'yuv420p', muted: true, concurrency: 2 });
    return { path, dispose };
  } catch (error) { await dispose(); throw error; }
  finally { state.busy = false; }
}
