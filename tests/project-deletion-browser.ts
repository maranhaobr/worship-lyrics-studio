import assert from 'node:assert/strict';
import { openBrowser } from '@remotion/renderer';
import { prisma } from '@wls/database';
import { authenticatedFetch, browserLogin, cleanupTestAccount, testAccount } from './auth-helper';
import type { ProjectView } from '@wls/shared';
const base = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
async function main() {
  const browser = await openBrowser('chrome', { browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE });
  let projectId: string | undefined, otherChurch: string | undefined, mediaId: string | undefined;
  try {
    const page = await browser.newPage({ context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: () => undefined, onLog: () => undefined });
    const ready = async (owner: boolean) => {
      for (let i = 0; i < 100; i++) {
        try { if (await page.evaluate((owner: boolean) => location.pathname === '/visual-projects' && document.readyState === 'complete' && Boolean(document.querySelector('h1')) && (!owner || Boolean(document.querySelector('button[aria-label^="Excluir projeto:"]:not(:disabled)'))), owner)) return; } catch { /* Development refresh can replace the browsing context. */ }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error('Project list did not initialize');
    };
    await browserLogin(page); const account = await testAccount();
    const created = await authenticatedFetch(`${base}/api/visual-projects/from-lyrics`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Excluir projeto temporário', lyrics: 'Minha alegria', templateId: 'builtin-atmospheric', pace: 'balanced', varyEffects: false }) });
    assert.equal(created.status, 201); projectId = (await created.json()).id;
    const project = await (await authenticatedFetch(`${base}/api/visual-projects/${projectId}`)).json() as ProjectView;
    const asset = await prisma.mediaAsset.create({ data: { churchId: account.churchId, kind: 'audio', name: 'Deletion fixture (no file)', mimeType: 'audio/wav', storageKey: `deletion-fixture-${projectId}.wav`, size: 0 } }); mediaId = asset.id;
    const job = await prisma.alignmentJob.create({ data: { projectId: projectId!, audioAssetId: asset.id, document: {}, status: 'CANCELLED' } });
    const church = await prisma.church.create({ data: { name: 'Isolated deletion fixture' } }); otherChurch = church.id;
    const foreign = await prisma.visualProject.create({ data: { churchId: church.id, name: 'Foreign project', document: project.document } });
    const remove = (id: string, revision = project.revision, origin = new URL(base).origin) => fetch(`${base}/api/visual-projects/${id}`, { method: 'DELETE', headers: { Cookie: account.cookie, Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ revision }) });
    assert.equal((await fetch(`${base}/api/visual-projects/${projectId}`, { method: 'DELETE' })).status, 401);
    assert.equal((await remove(projectId!, project.revision, 'https://invalid.example')).status, 403);
    assert.equal((await remove(foreign.id)).status, 404);
    assert.equal((await remove(projectId!, project.revision + 1)).status, 409);
    for (const role of ['EDITOR', 'VIEWER'] as const) {
      await prisma.membership.updateMany({ where: { churchId: account.churchId, userId: account.userId }, data: { role } });
      assert.equal((await remove(projectId!)).status, 403);
      await page.goto({ url: `${base}/visual-projects`, timeout: 60000 });
      await ready(false);
      assert.equal(await page.evaluate(() => document.querySelectorAll('button[aria-label^="Excluir projeto:"]').length), 0);
    }
    await prisma.membership.updateMany({ where: { churchId: account.churchId, userId: account.userId }, data: { role: 'OWNER' } });
    await page.goto({ url: `${base}/visual-projects`, timeout: 60000 });
    await ready(true);
    const clickDelete = () => page.evaluate(() => document.querySelector<HTMLButtonElement>('button[aria-label^="Excluir projeto:"]')!.click());
    await clickDelete();
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.equal(await page.evaluate(() => Boolean(document.querySelector('dialog[open]'))), true);
    await page.evaluate(() => Array.from(document.querySelectorAll<HTMLButtonElement>('dialog[open] button')).find(button => button.textContent === 'Cancelar')!.click());
    assert.ok(await prisma.visualProject.findUnique({ where: { id: projectId } }));
    await clickDelete();
    await page.evaluate(() => Array.from(document.querySelectorAll<HTMLButtonElement>('dialog[open] button')).find(button => button.textContent === 'Excluir definitivamente')!.click());
    for (let i = 0; i < 100; i++) { if (!await prisma.visualProject.findUnique({ where: { id: projectId } })) break; await new Promise(resolve => setTimeout(resolve, 100)); }
    assert.equal(await prisma.visualProject.findUnique({ where: { id: projectId } }), null);
    assert.equal(await prisma.alignmentJob.findUnique({ where: { id: job.id } }), null);
    if (project.songId) assert.ok(await prisma.song.findUnique({ where: { id: project.songId } }));
    assert.ok(await prisma.mediaAsset.findUnique({ where: { id: asset.id } }));
    assert.ok(await prisma.visualProject.findUnique({ where: { id: foreign.id } }));
    assert.equal((await remove(projectId!)).status, 404);
    console.log('Project deletion passed: confirmation/cancel, OWNER, EDITOR/VIEWER denial, CSRF, church isolation, stale revision, cascading jobs and preserved song/media.');
  } finally {
    await browser.close({ silent: true });
    if (projectId) await prisma.visualProject.deleteMany({ where: { id: projectId } });
    if (otherChurch) { await prisma.visualProject.deleteMany({ where: { churchId: otherChurch } }); await prisma.church.delete({ where: { id: otherChurch } }); }
    if (mediaId) await prisma.mediaAsset.deleteMany({ where: { id: mediaId } });
    const account = await testAccount(); await prisma.song.deleteMany({ where: { churchId: account.churchId } });
    await cleanupTestAccount(); await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
