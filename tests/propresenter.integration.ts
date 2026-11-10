import { authenticatedFetch as fetch, cleanupTestAccount } from './auth-helper';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { prisma } from '@wls/database';
import { exportProPresenter, importProPresenter } from '../apps/web/src/lib/propresenter';
import type { SongInput } from '@wls/shared';
const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000';
test('analyze, import, create visual project and export native slides through the API', { timeout: 120000 }, async () => {
  let songId: string | undefined, projectId: string | undefined;
  try {
    const sample = process.env.PROPRESENTER_SAMPLE;
    const input = sample ? await readFile(sample) : exportProPresenter({ title: 'ProPresenter integration (temporário)', sections: [{ type: 'VERSE', label: 'Verso', lines: [{ text: 'Glória e paz\nSanto para sempre' }] }] });
    const form = new FormData(); form.append('file', new Blob([new Uint8Array(input)]), 'sample.pro');
    const previewResponse = await fetch(`${base}/api/songs/import/propresenter`, { method: 'POST', body: form });
    assert.equal(previewResponse.status, 200, await previewResponse.clone().text());
    const preview = await previewResponse.json() as { song: SongInput; slides: number };
    const created = await fetch(`${base}/api/songs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(preview.song) });
    assert.equal(created.status, 201); songId = (await created.json() as { id: string }).id;
    const exported = await fetch(`${base}/api/songs/${songId}/propresenter`);
    assert.equal(exported.status, 200);
    assert.match(exported.headers.get('Content-Disposition') ?? '', /attachment/);
    assert.deepEqual(importProPresenter(new Uint8Array(await exported.arrayBuffer())).song, preview.song);
    const project = await fetch(`${base}/api/visual-projects`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ songId }) });
    assert.equal(project.status, 201); projectId = (await project.json() as { id: string }).id;
    const saved = await prisma.visualProject.findUniqueOrThrow({ where: { id: projectId } });
    const visualExport = await fetch(`${base}/api/visual-projects/${projectId}/propresenter`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(saved.document) });
    assert.equal(visualExport.status, 200);
    assert.equal(importProPresenter(new Uint8Array(await visualExport.arrayBuffer())).slides, preview.slides);
    const invalid = new FormData(); invalid.append('file', new Blob(['invalid']), 'bad.pro');
    assert.equal((await fetch(`${base}/api/songs/import/propresenter`, { method: 'POST', body: invalid })).status, 422);
    console.log(`ProPresenter API validated: ${preview.slides} slides.`);
  } finally {
    if (projectId) await prisma.visualProject.deleteMany({ where: { id: projectId } });
    if (songId) await prisma.song.deleteMany({ where: { id: songId } });
    await cleanupTestAccount();
    await prisma.$disconnect();
  }
});
