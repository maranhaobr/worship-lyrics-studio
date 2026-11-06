import assert from 'node:assert/strict';
import test from 'node:test';
import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { prisma } from '@wls/database';
import type { ProjectView, TemplatePreset } from '@wls/shared';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000';
async function request(path: string, method = 'GET', body?: unknown) {
  return fetch(`${base}${path}`, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) });
}

test('song CRUD, independent visual projects, revisions, templates and persistent media', async t => {
  let songId: string | undefined, projectId: string | undefined, templateId: string | undefined, mediaId: string | undefined;
  const song = { title: `Integration ${Date.now()}`, artist: 'Teste', sections: [{ type: 'VERSE', label: 'Verso', lines: [{ text: 'Santo para sempre' }, { text: 'Glória a Ti' }] }] };
  try {
    await t.test('existing song CRUD and validation', async () => {
      const invalid = await request('/api/songs', 'POST', { title: '' }); assert.equal(invalid.status, 422);
      const created = await request('/api/songs', 'POST', song); assert.equal(created.status, 201);
      songId = (await created.json() as { id: string }).id;
      const listed = await request(`/api/songs?q=${encodeURIComponent(song.title)}`);
      assert.ok((await listed.json() as { id: string }[]).some(item => item.id === songId));
      const updated = await request(`/api/songs/${songId}`, 'PUT', { ...song, artist: 'Atualizado' }); assert.equal(updated.status, 200);
    });
    let project: ProjectView;
    await t.test('creates a valid snapshot and detects concurrent saves', async () => {
      assert.equal((await request('/api/visual-projects', 'POST', { songId: 'missing' })).status, 404);
      const created = await request('/api/visual-projects', 'POST', { songId }); assert.equal(created.status, 201);
      projectId = (await created.json() as { id: string }).id;
      const response = await request(`/api/visual-projects/${projectId}`); assert.equal(response.status, 200);
      project = await response.json() as ProjectView;
      assert.equal(project.document.clips.length, 2);
      const payload = { name: 'Projeto de integração', revision: project.revision, document: project.document };
      assert.equal((await request(`/api/visual-projects/${projectId}`, 'PUT', payload)).status, 200);
      assert.equal((await request(`/api/visual-projects/${projectId}`, 'PUT', payload)).status, 409);
      const invalid = structuredClone(payload); invalid.revision = 2; invalid.document.clips[1].startMs = 0;
      assert.equal((await request(`/api/visual-projects/${projectId}`, 'PUT', invalid)).status, 422);
      const unchanged = await (await request(`/api/visual-projects/${projectId}`)).json() as ProjectView;
      assert.equal(unchanged.revision, 2);
    });
    await t.test('templates are reusable and can be updated', async () => {
      const response = await request('/api/visual-templates', 'POST', { name: 'Teste temporário', style: project.document.style }); assert.equal(response.status, 201);
      const template = await response.json() as TemplatePreset; templateId = template.id;
      assert.equal((await request(`/api/visual-templates/${templateId}`, 'PUT', { name: 'Teste atualizado', style: template.style })).status, 200);
      const list = await (await request('/api/visual-templates')).json() as TemplatePreset[];
      assert.ok(list.some(item => item.id === templateId && item.name === 'Teste atualizado'));
    });
    await t.test('image upload persists, supports ranges, and validates media types', async () => {
      const form = new FormData();
      const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP1cAAAAASUVORK5CYII=', 'base64');
      form.append('file', new Blob([png], { type: 'image/png' }), 'test.png');
      const upload = await fetch(`${base}/api/media`, { method: 'POST', body: form }); assert.equal(upload.status, 201);
      mediaId = (await upload.json() as { id: string }).id;
      const full = await fetch(`${base}/api/media/${mediaId}/content`); assert.equal(full.status, 200);
      assert.deepEqual(Buffer.from(await full.arrayBuffer()), png);
      const partial = await fetch(`${base}/api/media/${mediaId}/content`, { headers: { Range: 'bytes=0-7' } }); assert.equal(partial.status, 206);
      assert.equal((await partial.arrayBuffer()).byteLength, 8);
      const invalidRange = await fetch(`${base}/api/media/${mediaId}/content`, { headers: { Range: 'bytes=9000-' } }); assert.equal(invalidRange.status, 416);
      const updated = structuredClone(project.document); updated.style.background = { type: 'image', assetId: mediaId! };
      assert.equal((await request(`/api/visual-projects/${projectId}`, 'PUT', { name: 'Com imagem', revision: 2, document: updated })).status, 200);
      updated.style.background = { type: 'video', assetId: mediaId! };
      assert.equal((await request(`/api/visual-projects/${projectId}`, 'PUT', { name: 'Inválido', revision: 3, document: updated })).status, 422);
      const unsupported = new FormData(); unsupported.append('file', new Blob(['<svg/>'], { type: 'image/svg+xml' }), 'unsafe.svg');
      assert.equal((await fetch(`${base}/api/media`, { method: 'POST', body: unsupported })).status, 422);
    });
    await t.test('deleting a song preserves the project and snapshot', async () => {
      assert.equal((await request(`/api/songs/${songId}`, 'DELETE')).status, 204);
      assert.equal((await request(`/api/songs/${songId}`)).status, 404);
      const response = await request(`/api/visual-projects/${projectId}`); assert.equal(response.status, 200);
      const preserved = await response.json() as ProjectView;
      assert.equal(preserved.songId, null); assert.equal(preserved.document.clips[0].text, 'Santo para sempre');
    });
  } finally {
    if (projectId) await prisma.visualProject.deleteMany({ where: { id: projectId } });
    if (templateId) await prisma.visualTemplate.deleteMany({ where: { id: templateId } });
    if (songId) await prisma.song.deleteMany({ where: { id: songId } });
    if (mediaId) {
      const asset = await prisma.mediaAsset.findUnique({ where: { id: mediaId } });
      if (asset) {
        await unlink(resolve(process.env.MEDIA_STORAGE_DIR ?? '.data/media', asset.storageKey));
        await prisma.mediaAsset.delete({ where: { id: mediaId } });
      }
    }
    await prisma.$disconnect();
  }
});
