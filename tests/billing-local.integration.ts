import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import { prisma } from '@wls/database';
import { createBillingService } from '../apps/web/src/lib/billing/subscription-core';

test('durable checkout, concurrency, canonical verification, deduplication and uncertain responses (mock Asaas + local PostgreSQL)', { timeout: 60000 }, async () => {
  const suffix = randomBytes(8).toString('hex');
  const churches: string[] = [];
  const remoteSubscriptions = new Map<string, Record<string, unknown>>();
  const remotePayments = new Map<string, Record<string, unknown>>();
  let creates = 0, loseResponse = false;
  const service = createBillingService({ assertConfigured: () => undefined, gateway: async (path, method = 'GET', body) => {
    const data = body as Record<string, unknown>;
    if (path === '/customers' && method === 'POST') return { id: `cus_${suffix}_${churches.length}` };
    if (path === '/subscriptions' && method === 'POST') {
      creates++;
      const id = `sub_${suffix}_${creates}`;
      const remote = { id, ...data };
      remoteSubscriptions.set(id, remote);
      const paymentId = `pay_${suffix}_${creates}`;
      remotePayments.set(paymentId, { id: paymentId, subscription: id, customer: data.customer, value: data.value, dueDate: data.nextDueDate, status: 'PENDING', invoiceUrl: `https://sandbox.asaas.com/i/${paymentId}` });
      if (loseResponse) { loseResponse = false; throw new Error('simulated network timeout after creation'); }
      return remote;
    }
    if (path.startsWith('/subscriptions?')) return { data: [...remoteSubscriptions.values()].filter(item => item.externalReference === new URL(`https://mock.test${path}`).searchParams.get('externalReference')) };
    if (path.includes('/payments?')) {
      const id = path.split('/')[2];
      return { hasMore: false, data: [...remotePayments.values()].filter(item => item.subscription === id) };
    }
    if (path.startsWith('/subscriptions/')) return remoteSubscriptions.get(path.split('/')[2]);
    if (path.endsWith('/pixQrCode')) return { payload: 'mock-pix-only' };
    if (path.startsWith('/payments/')) return remotePayments.get(path.split('/')[2]);
    throw new Error('Unexpected mock request');
  } });
  const input = { planId: 'pro', cycle: 'monthly', billingType: 'PIX', name: 'Pagador de teste', cpfCnpj: '52998224725', consent: true } as const;
  try {
    const church = await prisma.church.create({ data: { name: `Billing local ${suffix}` } }); churches.push(church.id);
    const results = await Promise.allSettled([service.createCheckout(church.id, 'test@example.test', input), service.createCheckout(church.id, 'test@example.test', input)]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(creates, 1);
    let row = (await service.getSubscription(church.id))!;
    assert.equal(row.priceCents, 9900); assert.equal(row.status, 'PENDING');
    await service.createCheckout(church.id, 'test@example.test', input); assert.equal(creates, 1);
    await assert.rejects(service.createCheckout(church.id, 'test@example.test', { ...input, planId: 'advanced' }));
    const paymentId = [...remotePayments.keys()][0];
    const event = { id: `evt_${suffix}`, event: 'PAYMENT_RECEIVED', payment: { id: paymentId } };
    await service.processWebhook(event);
    assert.equal((await service.getSubscription(church.id))!.status, 'PENDING', 'Webhook label cannot override canonical pending status');
    remotePayments.get(paymentId)!.status = 'CONFIRMED';
    const paidEvent = { ...event, id: `paid_${suffix}` };
    await Promise.all([service.processWebhook(paidEvent), service.processWebhook(paidEvent)]);
    assert.equal(await prisma.billingEvent.count({ where: { id: `sandbox:${paidEvent.id}` } }), 1);
    assert.equal((await service.getSubscription(church.id))!.status, 'ACTIVE');
    remotePayments.get(paymentId)!.value = 1;
    await assert.rejects(service.processWebhook({ ...event, id: `mismatch_${suffix}` }));
    assert.equal(await prisma.billingEvent.count({ where: { id: `sandbox:mismatch_${suffix}` } }), 0, 'Failed validation must remain retryable');
    remotePayments.get(paymentId)!.value = 99;
    remotePayments.get(paymentId)!.status = 'REFUNDED';
    await service.processWebhook({ ...event, id: `refund_${suffix}` });
    await service.processWebhook({ ...event, id: `delayed_confirmed_${suffix}`, event: 'PAYMENT_CONFIRMED' });
    assert.equal((await service.getSubscription(church.id))!.status, 'REVERSED', 'Out-of-order confirmation cannot undo a canonical refund');
    const foreign = await prisma.church.create({ data: { name: `Billing other ${suffix}` } }); churches.push(foreign.id);
    assert.equal(await service.getSubscription(foreign.id), null);
    loseResponse = true;
    await assert.rejects(service.createCheckout(foreign.id, 'other@example.test', { ...input, cycle: 'annual' }));
    row = (await service.getSubscription(foreign.id))!; assert.equal(row.status, 'UNKNOWN');
    await service.createCheckout(foreign.id, 'other@example.test', { ...input, cycle: 'annual' });
    assert.equal(creates, 2, 'Lost response must reconcile rather than POST again');
    assert.equal((await service.getSubscription(foreign.id))!.priceCents, 99000);
    remoteSubscriptions.get((await service.getSubscription(foreign.id))!.providerId!)!.deleted = true;
    await service.reconcileSubscription(foreign.id);
    assert.equal((await service.getSubscription(foreign.id))!.status, 'CANCELED');
  } finally {
    await prisma.billingEvent.deleteMany({ where: { resourceId: { contains: suffix } } });
    const rows = await prisma.churchSubscription.findMany({ where: { churchId: { in: churches } } });
    await prisma.billingInvoice.deleteMany({ where: { subscriptionId: { in: rows.map(row => row.id) } } });
    await prisma.churchSubscription.deleteMany({ where: { churchId: { in: churches } } });
    await prisma.church.deleteMany({ where: { id: { in: churches } } });
    await prisma.$disconnect();
  }
});
