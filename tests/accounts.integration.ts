import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import { prisma } from '@wls/database';
import type { VisualProjectDocument } from '@wls/shared';
const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000';
const origin = new URL(base).origin;
class Client {
  cookie = '';
  async request(path: string, method = 'GET', body?: object | FormData, externalOrigin = origin) {
    const response = await fetch(base + path, { method, headers: { ...(this.cookie ? { Cookie: this.cookie } : {}), ...(method !== 'GET' ? { Origin: externalOrigin } : {}), ...(body instanceof FormData || !body ? {} : { 'Content-Type': 'application/json' }) }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
    const cookie = response.headers.get('set-cookie'); if (cookie) this.cookie = cookie.split(';')[0];
    return response;
  }
}
test('church isolation, role hierarchy, invitations, sessions and last-owner protection', { timeout: 240000 }, async () => {
  const prefix = `accounts-${randomBytes(6).toString('hex')}`, password = randomBytes(24).toString('base64url');
  const emails = Array.from({ length: 5 }, (_, i) => `${prefix}-${i}@example.test`);
  const churches: string[] = [];
  const song = { title: 'Teste de acesso', sections: [{ type: 'VERSE', label: 'Verso', lines: [{ text: 'Santo para sempre' }] }] };
  const a = new Client(), b = new Client(), viewer = new Client(), admin = new Client(), outsider = new Client();
  try {
    assert.equal((await outsider.request('/api/songs')).status, 401);
    assert.equal((await outsider.request('/api/songs/import/propresenter', 'POST', new FormData())).status, 401);
    for (const [client, i] of [[a, 0], [b, 1]] as const) {
      const response = await client.request('/api/auth/register', 'POST', { email: emails[i], password, name: `Pessoa ${i}`, churchName: `Igreja ${prefix}-${i}` });
      assert.equal(response.status, 201, await response.clone().text());
      assert.match(response.headers.get('set-cookie') ?? '', /HttpOnly/i);
      const church = await (await client.request('/api/church')).json(); churches.push(church.church.id);
      assert.deepEqual(await (await client.request('/api/songs')).json(), [], 'registration cannot claim the legacy archive');
    }
    assert.equal((await a.request('/api/songs', 'POST', song, 'https://attacker.example')).status, 403);
    const created = await (await a.request('/api/songs', 'POST', song)).json(); assert.ok(created.id);
    assert.equal((await b.request(`/api/songs/${created.id}`)).status, 404);
    assert.equal((await b.request(`/api/songs/${created.id}`, 'PUT', song)).status, 404);
    assert.equal((await b.request(`/api/songs/${created.id}`, 'DELETE')).status, 404);
    const project = await (await a.request('/api/visual-projects', 'POST', { songId: created.id })).json(); assert.ok(project.id);
    assert.equal((await b.request(`/api/visual-projects/${project.id}`)).status, 404);
    assert.equal((await b.request(`/api/visual-projects/${project.id}/alignment`)).status, 404);
    assert.equal((await b.request(`/api/visual-projects/${project.id}/export`, 'POST', {})).status, 404);
    assert.equal((await b.request(`/api/songs/${created.id}/propresenter`)).status, 404);
    assert.equal((await b.request(`/api/visual-projects/${project.id}/propresenter`, 'POST', {})).status, 404);
    const projectView = await (await a.request(`/api/visual-projects/${project.id}`)).json() as { document: VisualProjectDocument };
    const mediaForm = new FormData(); mediaForm.append('file', new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP1cAAAAASUVORK5CYII=', 'base64')], { type: 'image/png' }), 'test.png');
    const media = await (await a.request('/api/media', 'POST', mediaForm)).json(); assert.ok(media.id);
    assert.equal((await b.request(`/api/media/${media.id}/content`)).status, 404);
    assert.equal((await outsider.request(`/api/media/${media.id}/content`)).status, 401);
    const template = await (await a.request('/api/visual-templates', 'POST', { name: 'Privado', style: projectView.document.style })).json(); assert.ok(template.id);
    assert.ok(!(await (await b.request('/api/visual-templates')).json()).some((item: { id: string }) => item.id === template.id));
    const bProject = await (await b.request('/api/visual-projects/from-lyrics', 'POST', { title: 'Teste B', lyrics: 'Santo para sempre', templateId: 'builtin-atmospheric', pace: 'balanced', varyEffects: false })).json();
    const bView = await (await b.request(`/api/visual-projects/${bProject.id}`)).json();
    bView.document.style.background = { type: 'image', assetId: media.id };
    assert.equal((await b.request(`/api/visual-projects/${bProject.id}`, 'PUT', { name: 'Teste B', revision: 1, document: bView.document })).status, 422);
    const owner = await (await a.request('/api/church')).json();
    assert.equal((await a.request(`/api/church/members/${owner.members[0].id}`, 'DELETE')).status, 409);
    async function invite(client: Client, email: string, role: string) { const r = await client.request('/api/church/invitations', 'POST', { email, role }); assert.equal(r.status, 201); return new URL((await r.json()).path, base).searchParams.get('invitation')!; }
    const viewerToken = await invite(a, emails[2], 'VIEWER');
    assert.equal((await b.request('/api/auth/accept-invitation', 'POST', { invitation: viewerToken })).status, 422);
    assert.equal((await viewer.request('/api/auth/register', 'POST', { email: emails[2], password, name: 'Leitor', invitation: viewerToken })).status, 201);
    assert.equal((await viewer.request(`/api/songs/${created.id}`)).status, 200);
    assert.equal((await viewer.request('/api/songs', 'POST', song)).status, 403);
    assert.equal((await viewer.request('/api/songs/import/propresenter', 'POST', new FormData())).status, 403);
    assert.equal((await viewer.request(`/api/visual-projects/${project.id}/propresenter`, 'POST', {})).status, 403);
    assert.equal((await viewer.request(`/api/songs/${created.id}`, 'DELETE')).status, 403);
    assert.equal((await viewer.request(`/api/visual-projects/${project.id}/export`, 'POST', projectView.document)).status, 403);
    assert.equal((await viewer.request('/api/auth/accept-invitation', 'POST', { invitation: viewerToken })).status, 422);
    const adminToken = await invite(a, emails[3], 'ADMIN');
    assert.equal((await admin.request('/api/auth/register', 'POST', { email: emails[3], password, name: 'Administrador', invitation: adminToken })).status, 201);
    assert.equal((await admin.request(`/api/church/members/${owner.members[0].id}`, 'PATCH', { role: 'VIEWER' })).status, 403);
    assert.equal((await admin.request('/api/church/invitations', 'POST', { email: emails[4], role: 'ADMIN' })).status, 403);
    const editorToken = await invite(a, emails[1], 'EDITOR');
    const secondB = new Client();
    assert.equal((await secondB.request('/api/auth/login', 'POST', { email: emails[1], password, invitation: editorToken })).status, 200);
    assert.equal((await secondB.request('/api/songs', 'POST', song)).status, 201);
    assert.equal((await secondB.request(`/api/songs/${created.id}`, 'DELETE')).status, 403);
    const state = await (await a.request('/api/church')).json();
    const bMember = state.members.find((m: { user: { email: string } }) => m.user.email === emails[1]);
    const viewerMember = state.members.find((m: { user: { email: string } }) => m.user.email === emails[2]);
    assert.equal((await a.request(`/api/church/members/${viewerMember.id}`, 'PATCH', { role: 'EDITOR' })).status, 200);
    assert.equal((await viewer.request('/api/songs', 'POST', song)).status, 201, 'role changes apply to an existing session');
    assert.equal((await secondB.request('/api/auth/switch', 'POST', { churchId: churches[1] })).status, 200);
    assert.equal((await secondB.request(`/api/songs/${created.id}`)).status, 404);
    assert.equal((await secondB.request('/api/auth/switch', 'POST', { churchId: churches[0] })).status, 200);
    assert.equal((await secondB.request(`/api/songs/${created.id}`)).status, 200);
    assert.equal((await a.request(`/api/church/members/${bMember.id}`, 'DELETE')).status, 200);
    assert.equal((await secondB.request('/api/songs')).status, 401);
    const passwordSession = new Client();
    assert.equal((await passwordSession.request('/api/auth/login', 'POST', { email: emails[1], password })).status, 200);
    assert.equal((await b.request('/api/auth/password', 'POST', { current: password, password: `${password}new` })).status, 200);
    assert.equal((await passwordSession.request('/api/songs')).status, 401);
    assert.equal((await b.request('/api/auth/logout', 'POST', {})).status, 200);
    assert.equal((await b.request('/api/songs')).status, 401);
    const adminMember = state.members.find((m: { user: { email: string } }) => m.user.email === emails[3]);
    assert.equal((await a.request(`/api/church/members/${adminMember.id}`, 'PATCH', { role: 'OWNER' })).status, 200);
    const results = await Promise.all([a.request(`/api/church/members/${owner.members[0].id}`, 'DELETE'), admin.request(`/api/church/members/${adminMember.id}`, 'DELETE')]);
    assert.deepEqual(results.map(r => r.status).sort(), [200, 409], 'concurrent owner removal must leave one owner');
    console.log('Accounts validated: isolation, roles, invites, revocation, CSRF and sessions.');
  } finally {
    const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
    for (const churchId of churches) {
      await prisma.alignmentJob.deleteMany({ where: { project: { churchId } } });
      await prisma.visualProject.deleteMany({ where: { churchId } });
      await prisma.song.deleteMany({ where: { churchId } });
      await prisma.visualTemplate.deleteMany({ where: { churchId } });
      const media = await prisma.mediaAsset.findMany({ where: { churchId } });
      const { unlink } = await import('node:fs/promises'); const { resolve } = await import('node:path');
      for (const asset of media) await unlink(resolve(process.env.MEDIA_STORAGE_DIR ?? '.data/media', asset.storageKey)).catch(() => undefined);
      await prisma.mediaAsset.deleteMany({ where: { churchId } });
      await prisma.church.deleteMany({ where: { id: churchId } });
    }
    await prisma.user.deleteMany({ where: { id: { in: users.map(u => u.id) } } });
    await prisma.$disconnect();
  }
});
