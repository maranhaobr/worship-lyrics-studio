import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { prisma } from '@wls/database';
import { distributeWords, type ProjectView } from '@wls/shared';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000';
const json = (method: string, body: unknown) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
test('audio upload, persistent queue, cancellation and conflict-safe application of a synthetic worker result', async () => {
  let id: string | undefined, audioId: string | undefined;
  try {
    const form = new FormData(); form.append('file', new Blob([new Uint8Array(await readFile('out/alignment-reference.wav'))], { type: 'audio/wav' }), 'reference.wav');
    const upload = await fetch(`${base}/api/media`, { method: 'POST', body: form }); assert.equal(upload.status, 201);
    const audio = await upload.json() as { id: string; kind: string; durationMs: number }; audioId = audio.id;
    assert.equal(audio.kind, 'audio'); assert.ok(audio.durationMs > 5000);
    const created = await fetch(`${base}/api/visual-projects/from-lyrics`, json('POST', { title: 'Alignment contract test', lyrics: 'Santo para sempre\nToda honra e toda glória ao Senhor' })); assert.equal(created.status, 201);
    id = (await created.json() as { id: string }).id;
    const url = `${base}/api/visual-projects/${id}`;
    let project = await (await fetch(url)).json() as ProjectView;
    project.document.referenceAudio = { assetId: audioId }; project.document.clips[0].style = { background: { type: 'gradient', from: '#000000', to: '#ff0000', angle: 90 } };
    assert.equal((await fetch(url, json('PUT', { name: project.name, revision: 1, document: project.document }))).status, 200);
    const queued = await fetch(`${url}/alignment`, json('POST', { revision: 2 })); assert.equal(queued.status, 202);
    const jobId = (await queued.json() as { id: string }).id;
    assert.equal((await (await fetch(`${url}/alignment`, json('POST', { revision: 2 }))).json() as { id: string }).id, jobId);
    assert.equal((await fetch(`${url}/alignment`, json('DELETE', { jobId }))).status, 200);
    const job = await prisma.alignmentJob.findUniqueOrThrow({ where: { id: jobId } }); assert.equal(job.status, 'CANCELLED');
    const next = await fetch(`${url}/alignment`, json('POST', { revision: 2 })); const nextId = (await next.json() as { id: string }).id;
    const result = { durationMs: audio.durationMs, warnings: [], clips: project.document.clips.map((clip, i) => ({ clipId: clip.id, startMs: 2000 + i * 4000, endMs: 3500 + i * 4000, words: distributeWords(clip.text, 1500), needsReview: false })) };
    await prisma.alignmentJob.update({ where: { id: nextId }, data: { status: 'COMPLETED', result, progress: 100 } });
    project = await (await fetch(url)).json() as ProjectView;
    project.document.style.text.fontSize = 110;
    assert.equal((await fetch(url, json('PUT', { name: project.name, revision: 2, document: project.document }))).status, 200);
    assert.equal((await fetch(`${url}/alignment`, json('PUT', { revision: 2, jobId: nextId }))).status, 409);
    const applied = await fetch(`${url}/alignment`, json('PUT', { revision: 3, jobId: nextId })); assert.equal(applied.status, 200);
    const aligned = await applied.json() as ProjectView;
    assert.equal(aligned.document.style.text.fontSize, 110); assert.deepEqual(aligned.document.clips[0].style, project.document.clips[0].style);
    assert.equal(aligned.document.clips[0].startMs, 2000); assert.equal(aligned.document.referenceAudio?.assetId, audioId);
    assert.equal((await fetch(`${url}/alignment`, json('PUT', { revision: 4, jobId: nextId }))).status, 404);
  } finally {
    if (id) await prisma.visualProject.deleteMany({ where: { id } });
    if (audioId) { const asset = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: audioId } }); await unlink(resolve(process.env.MEDIA_STORAGE_DIR ?? '.data/media', asset.storageKey)); await prisma.mediaAsset.delete({ where: { id: audioId } }); }
    await prisma.$disconnect();
  }
});
