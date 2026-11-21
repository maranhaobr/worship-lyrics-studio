import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { prisma } from '@wls/database';

const base = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const apiBase = 'https://api-sandbox.asaas.com/v3';
async function main() {
  assert.equal(process.env.ASAAS_ENVIRONMENT ?? 'sandbox', 'sandbox', 'Never run against production');
  assert.ok(process.env.ASAAS_API_KEY); assert.ok(process.env.ASAAS_WEBHOOK_TOKEN);
  const prefix = `billing-test-${randomBytes(8).toString('hex')}`;
  const user = await prisma.user.create({ data: { name: 'Teste de cobrança', email: `${prefix}@example.test`, passwordHash: 'test-no-login', emailVerifiedAt: new Date() } });
  const churchIds: string[] = [];
  const provider = async (path: string, method = 'GET') => {
    const response = await fetch(apiBase + path, { method, headers: { access_token: process.env.ASAAS_API_KEY!, 'User-Agent': 'WorshipLyricsStudio-SandboxTest/1.0' }, redirect: 'error', signal: AbortSignal.timeout(15000) });
    assert.ok(response.ok, `Sandbox ${method} returned HTTP ${response.status}`);
    return await response.json() as { data?: { id: string }[]; id?: string };
  };
  const request = (path: string, method = 'GET', body?: unknown, cookie?: string, origin = new URL(base).origin) => fetch(base + path, { method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const webhook = (body: unknown, token = process.env.ASAAS_WEBHOOK_TOKEN!) => fetch(base + '/api/billing/webhooks/asaas', { method: 'POST', headers: { 'Content-Type': 'application/json', 'asaas-access-token': token }, body: JSON.stringify(body) });
  try {
    assert.equal((await request('/api/billing/status')).status, 401);
    assert.equal((await webhook({} , 'invalid')).status, 401);
    for (const billingType of ['PIX', 'BOLETO', 'CREDIT_CARD'] as const) {
      const church = await prisma.church.create({ data: { name: `${prefix}-${billingType}`, memberships: { create: { userId: user.id, role: 'OWNER' } } } });
      churchIds.push(church.id);
      const raw = randomBytes(32).toString('base64url');
      await prisma.session.create({ data: { userId: user.id, activeChurchId: church.id, tokenHash: createHash('sha256').update(raw).digest('hex'), expiresAt: new Date(Date.now() + 3600000) } });
      const cookie = `wls_session=${raw}`;
      const input = { planId: 'essential', cycle: 'monthly', billingType, name: 'Pagador fictício de homologação', cpfCnpj: '52998224725', consent: true };
      assert.equal((await request('/api/billing/checkout', 'POST', input, cookie, 'https://invalid.example')).status, 403);
      assert.equal((await request('/api/billing/checkout', 'POST', { ...input, priceCents: 1 }, cookie)).status, 422);
      const created = await request('/api/billing/checkout', 'POST', input, cookie);
      assert.equal(created.status, 200, `Checkout ${billingType} failed HTTP ${created.status}`);
      const data = await created.json() as { subscription: { status: string; invoiceUrl: string; priceCents: number } };
      assert.equal(data.subscription.priceCents, 4900);
      assert.equal(data.subscription.status, 'PENDING');
      assert.match(data.subscription.invoiceUrl, /^https:\/\/sandbox\.asaas\.com\//);
      const row = await prisma.churchSubscription.findUniqueOrThrow({ where: { churchId_environment: { churchId: church.id, environment: 'sandbox' } } });
      assert.ok(row.providerId);
      const payments = await provider(`/subscriptions/${row.providerId}/payments`);
      const paymentId = payments.data![0].id;
      if (process.env.REQUIRE_EXTERNAL_WEBHOOK === 'true') {
        let delivered = false;
        for (let attempt = 0; attempt < 45; attempt++) {
          if (await prisma.billingEvent.count({ where: { resourceId: paymentId, eventType: 'PAYMENT_CREATED' } })) { delivered = true; break; }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        assert.ok(delivered, `Real PAYMENT_CREATED delivery not observed for ${billingType}`);
        console.log(`${billingType}: real Asaas webhook delivered through temporary HTTPS tunnel.`);
      }
      const event = { id: `${prefix}-${billingType}`, event: 'PAYMENT_RECEIVED', payment: { id: paymentId, status: 'RECEIVED', value: 0.01 } };
      assert.equal((await webhook(event)).status, 200);
      assert.equal((await webhook(event)).status, 200);
      assert.equal(await prisma.billingEvent.count({ where: { id: `sandbox:${event.id}` } }), 1);
      assert.equal((await prisma.churchSubscription.findUniqueOrThrow({ where: { id: row.id } })).status, 'PENDING', 'Forged payload must not grant access; canonical API is pending');
      assert.equal((await request('/api/billing/checkout', 'POST', input, cookie)).status, 200);
      assert.equal((await provider(`/subscriptions?externalReference=${encodeURIComponent(`wls:${row.id}`)}`)).data!.length, 1, 'Retries must not duplicate subscription');
      await prisma.membership.updateMany({ where: { churchId: church.id, userId: user.id }, data: { role: 'VIEWER' } });
      assert.equal((await request('/api/billing/status', 'GET', undefined, cookie)).status, 403);
      assert.equal((await request('/api/billing/checkout', 'POST', input, cookie)).status, 403);
      console.log(`${billingType}: hosted invoice, server price, canonical webhook, duplicate delivery, duplicate checkout and OWNER verified.`);
    }
  } finally {
    for (const churchId of churchIds) {
      const rows = await prisma.churchSubscription.findMany({ where: { churchId } });
      for (const row of rows) {
        const matches = await provider(`/subscriptions?externalReference=${encodeURIComponent(`wls:${row.id}`)}`);
        for (const item of matches.data ?? []) await provider(`/subscriptions/${item.id}`, 'DELETE');
        if (row.customerId) await provider(`/customers/${row.customerId}`, 'DELETE');
        await prisma.billingInvoice.deleteMany({ where: { subscriptionId: row.id } });
        await prisma.churchSubscription.delete({ where: { id: row.id } });
      }
      await prisma.church.delete({ where: { id: churchId } });
    }
    await prisma.billingEvent.deleteMany({ where: { id: { startsWith: `sandbox:${prefix}` } } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error('Homologação falhou:', error instanceof Error ? error.message : 'erro de teste'); process.exitCode = 1; });
