import assert from 'node:assert/strict';
import { readFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { prisma } from '@wls/database';
import type { AlignmentJobView, ProjectView } from '@wls/shared';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000';
const json = (method: string, body: unknown) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
async function main() {
  let id: string | undefined, audioId: string | undefined;
  try {
    const form = new FormData(); form.append('file', new Blob([new Uint8Array(await readFile('out/alignment-reference.wav'))], { type: 'audio/wav' }), 'worker-smoke.wav');
    const upload = await fetch(`${base}/api/media`, { method: 'POST', body: form }); assert.equal(upload.status, 201);
    const audio = await upload.json() as { id: string; durationMs: number }; audioId = audio.id;
    const created = await fetch(`${base}/api/visual-projects/from-lyrics`, json('POST', { title: 'Real worker smoke (synthetic Portuguese speech)', lyrics: 'Santo para sempre\nToda honra e toda glória ao Senhor' })); assert.equal(created.status, 201);
    id = (await created.json() as { id: string }).id;
    const url = `${base}/api/visual-projects/${id}`;
    const project = await (await fetch(url)).json() as ProjectView;
    project.document.referenceAudio = { assetId: audio.id };
    assert.equal((await fetch(url, json('PUT', { name: project.name, revision: 1, document: project.document }))).status, 200);
    const enqueued = await fetch(`${url}/alignment`, json('POST', { revision: 2 })); assert.equal(enqueued.status, 202);
    const started = Date.now();
    let result: AlignmentJobView | null = null, previous = '';
    while (Date.now() - started < 20 * 60_000) {
      const response = await fetch(`${url}/alignment`);
      if (!response.ok) { console.log(`Status temporarily unavailable (${response.status}); retrying`); await new Promise(resolve => setTimeout(resolve, 2000)); continue; }
      const job = await response.json() as AlignmentJobView;
      const status = `${job.status} ${job.progress}% workerOnline=${job.workerOnline}`;
      if (status !== previous) { console.log(status); previous = status; }
      if (job.status === 'FAILED') throw new Error(job.error ?? 'Worker failed');
      if (job.status === 'COMPLETED') { result = job; break; }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    assert.ok(result?.result, 'Real model alignment must finish');
    assert.equal(result.result.clips.length, 2);
    assert.ok(result.result.clips[0].startMs >= 1000, 'must detect the leading silence');
    assert.ok(result.result.clips[1].startMs - result.result.clips[0].endMs >= 500, 'must detect the pause between phrases');
    const applied = await fetch(`${url}/alignment`, json('PUT', { revision: 2, jobId: result.id })); assert.equal(applied.status, 200);
    const aligned = await applied.json() as ProjectView;
    assert.equal(aligned.document.durationMs, result.result.durationMs);
    console.log(JSON.stringify({ durationMs: aligned.document.durationMs, timings: aligned.document.clips.map(clip => ({ text: clip.text, startMs: clip.startMs, endMs: clip.endMs })), warnings: result.result.warnings }));
    console.log('Real Portuguese models passed end-to-end on synthetic speech. Singing accuracy still requires evaluation on real recordings.');
  } finally {
    if (id) await prisma.visualProject.deleteMany({ where: { id } });
    if (audioId) { const asset = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: audioId } }); await unlink(resolve(process.env.MEDIA_STORAGE_DIR ?? '.data/media', asset.storageKey)); await prisma.mediaAsset.delete({ where: { id: audioId } }); }
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
