import { prisma, type ChurchSubscription, type Prisma } from '@wls/database';
import { billingPolicy, getPaidPlan, planPriceCents } from '@wls/shared';
import { z } from 'zod';
import { ApiError } from '../api-errors';
import { checkoutInput, paymentSchema, providerId, subscriptionSchema, safeInvoiceUrl, paymentState, webhookSchema } from './validation';

export function createBillingService(dependencies: { gateway: (path: string, method?: 'GET' | 'POST' | 'DELETE', body?: object) => Promise<unknown>; assertConfigured: () => unknown }) {
const asaas = dependencies.gateway;
const requireSandbox = dependencies.assertConfigured;
const reference = (row: ChurchSubscription) => `wls:${row.id}`;
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const listSubscriptions = z.object({ data: z.array(subscriptionSchema) });
const listPayments = z.object({ data: z.array(paymentSchema), hasMore: z.boolean().optional() });

function verifySubscription(row: ChurchSubscription, remote: z.infer<typeof subscriptionSchema>) {
  const expectedType = row.billingType === 'PIX' ? 'BOLETO' : row.billingType;
  if (remote.externalReference !== reference(row) || remote.customer !== row.customerId || Math.round(remote.value * 100) !== row.priceCents || remote.cycle !== (row.cycle === 'annual' ? 'YEARLY' : 'MONTHLY') || remote.billingType !== expectedType) throw new ApiError(409, 'A assinatura no Asaas diverge do contrato salvo. Conciliação manual necessária.');
}
function verifyPayment(row: ChurchSubscription, payment: z.infer<typeof paymentSchema>) {
  if (payment.subscription !== row.providerId || payment.customer !== row.customerId || Math.round(payment.value * 100) !== row.priceCents) throw new ApiError(409, 'Cobrança divergente. Conciliação manual necessária.');
}
async function lock(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT id FROM "ChurchSubscription" WHERE id=${id} FOR UPDATE`;
}
async function storePayment(tx: Prisma.TransactionClient, row: ChurchSubscription, payment: z.infer<typeof paymentSchema>) {
  verifyPayment(row, payment);
  if (row.billingType === 'PIX' && payment.status === 'PENDING' && !payment.deleted) {
    // Recurring boleto invoices support Pix. Verify availability before offering a Pix checkout.
    z.object({ payload: z.string().min(1) }).parse(await asaas(`/payments/${payment.id}/pixQrCode`));
  }
  // Partial refunds may retain RECEIVED upstream. Keep these under conservative review.
  const data = { subscriptionId: row.id, status: payment.deleted ? 'DELETED' : payment.refunds?.length ? 'REFUND_IN_PROGRESS' : payment.status, priceCents: row.priceCents, dueDate: payment.dueDate, invoiceUrl: safeInvoiceUrl(payment.invoiceUrl) };
  await tx.billingInvoice.upsert({ where: { id: payment.id }, create: { id: payment.id, ...data }, update: data });
}
async function updateState(tx: Prisma.TransactionClient, row: ChurchSubscription, deleted: boolean) {
  const invoice = await tx.billingInvoice.findFirst({ where: { subscriptionId: row.id, dueDate: { lte: today() } }, orderBy: [{ dueDate: 'desc' }, { id: 'desc' }] });
  const latestLink = await tx.billingInvoice.findFirst({ where: { subscriptionId: row.id, status: { not: 'DELETED' } }, orderBy: [{ dueDate: 'desc' }, { id: 'desc' }] });
  return tx.churchSubscription.update({ where: { id: row.id }, data: { status: deleted ? 'CANCELED' : invoice ? paymentState(invoice.status, invoice.status === 'DELETED') : 'PENDING', invoiceUrl: latestLink?.invoiceUrl ?? null } });
}
function subscriptionView(row: ChurchSubscription | null) {
  return row ? { planId: row.planId, cycle: row.cycle, priceCents: row.priceCents, billingType: row.billingType, status: row.status, invoiceUrl: safeInvoiceUrl(row.invoiceUrl), environment: row.environment } : null;
}
async function getSubscription(churchId: string) {
  return prisma.churchSubscription.findUnique({ where: { churchId_environment: { churchId, environment: 'sandbox' } } });
}
async function createCheckout(churchId: string, email: string, input: z.infer<typeof checkoutInput>) {
  requireSandbox();
  const existing = await getSubscription(churchId);
  if (existing) {
    if (existing.planId !== input.planId || existing.cycle !== input.cycle || existing.billingType !== input.billingType) throw new ApiError(409, 'Já existe uma contratação de teste para esta igreja. Não é possível criar outra assinatura.');
    return reconcileSubscription(churchId);
  }
  const plan = getPaidPlan(input.planId)!;
  // Unique church/environment is a durable lock, including across processes and timeouts.
  let row: ChurchSubscription;
  try {
    row = await prisma.churchSubscription.create({ data: { churchId, environment: 'sandbox', planId: plan.id, cycle: input.cycle, priceCents: planPriceCents(plan, input.cycle), policyVersion: billingPolicy.version, billingType: input.billingType } });
  } catch { throw new ApiError(409, 'Já existe uma solicitação de contratação. Atualize a situação antes de continuar.'); }
  try {
    const customer = z.object({ id: providerId }).parse(await asaas('/customers', 'POST', { name: input.name, cpfCnpj: input.cpfCnpj, email, externalReference: reference(row), notificationDisabled: true }));
    row = await prisma.churchSubscription.update({ where: { id: row.id }, data: { customerId: customer.id } });
    const remote = subscriptionSchema.parse(await asaas('/subscriptions', 'POST', {
      customer: customer.id, billingType: input.billingType === 'PIX' ? 'BOLETO' : input.billingType, value: row.priceCents / 100,
      nextDueDate: today(), cycle: input.cycle === 'annual' ? 'YEARLY' : 'MONTHLY',
      description: `Worship Lyrics Studio — ${plan.name} (${input.cycle === 'annual' ? 'anual' : 'mensal'}) — TESTE`, externalReference: reference(row),
    }));
    verifySubscription(row, remote);
    await prisma.churchSubscription.update({ where: { id: row.id }, data: { providerId: remote.id, status: 'PENDING' } });
  } catch (error) {
    await prisma.churchSubscription.update({ where: { id: row.id }, data: { status: 'UNKNOWN' } });
    throw error instanceof ApiError ? error : new ApiError(502, 'Resposta inesperada do Asaas. Concilie antes de tentar novamente.');
  }
  return reconcileSubscription(churchId);
}

async function reconcileSubscription(churchId: string) {
  requireSandbox();
  const found = await getSubscription(churchId);
  if (!found) return null;
  return prisma.$transaction(async tx => {
    await lock(tx, found.id);
    let row = (await tx.churchSubscription.findUniqueOrThrow({ where: { id: found.id } }));
    // A crashed request may already have created remote objects: lookup, never POST again.
    if (!row.customerId) {
      const customers = z.object({ data: z.array(z.object({ id: providerId, externalReference: z.string().nullish() })) }).parse(await asaas(`/customers?externalReference=${encodeURIComponent(reference(row))}`));
      const matching = customers.data.filter(item => item.externalReference === reference(row));
      if (matching.length !== 1) throw new ApiError(409, 'Cadastro sem confirmação. Conciliação manual necessária; nenhuma cobrança será repetida.');
      row = await tx.churchSubscription.update({ where: { id: row.id }, data: { customerId: matching[0].id } });
    }
    if (!row.providerId) {
      const matches = listSubscriptions.parse(await asaas(`/subscriptions?externalReference=${encodeURIComponent(reference(row))}`)).data.filter(item => item.externalReference === reference(row));
      if (matches.length !== 1) throw new ApiError(409, 'Assinatura sem confirmação. Conciliação manual necessária; nenhuma cobrança será repetida.');
      verifySubscription(row, matches[0]);
      row = await tx.churchSubscription.update({ where: { id: row.id }, data: { providerId: matches[0].id } });
    }
    const remote = subscriptionSchema.parse(await asaas(`/subscriptions/${row.providerId}`));
    verifySubscription(row, remote);
    for (let offset = 0; ; offset += 100) {
      const payments = listPayments.parse(await asaas(`/subscriptions/${row.providerId}/payments?limit=100&offset=${offset}`));
      for (const payment of payments.data) await storePayment(tx, row, payment);
      if (!payments.hasMore) break;
      if (offset >= 900) throw new ApiError(503, 'Histórico extenso; conciliação operacional necessária.');
    }
    return updateState(tx, row, remote.deleted ?? false);
  }, { timeout: 60000, maxWait: 10000 });
}

async function processWebhook(event: z.infer<typeof webhookSchema>) {
  requireSandbox();
  const eventId = `sandbox:${event.id}`;
  if (await prisma.billingEvent.findUnique({ where: { id: eventId } })) return;
  let payment: z.infer<typeof paymentSchema> | undefined;
  let remoteId: string | undefined;
  if (event.event.startsWith('PAYMENT_') && event.payment) {
    // Only canonical resource IDs from this account determine the owning church.
    const raw = await asaas(`/payments/${event.payment.id}`);
    const linked = z.object({ subscription: providerId.nullish() }).parse(raw);
    if (!linked.subscription) return;
    payment = paymentSchema.parse(raw);
    remoteId = payment.subscription;
  } else if (event.event.startsWith('SUBSCRIPTION_') && event.subscription) remoteId = event.subscription.id;
  if (!remoteId) return; // Unused resource types have no entitlement effect.
  const canonicalSubscription = subscriptionSchema.parse(await asaas(`/subscriptions/${remoteId}`));
  const found = await prisma.churchSubscription.findUnique({ where: { providerId: remoteId } })
    ?? (canonicalSubscription.externalReference.startsWith('wls:') ? await prisma.churchSubscription.findUnique({ where: { id: canonicalSubscription.externalReference.slice(4) } }) : null);
  if (!found || found.environment !== 'sandbox') return;
  await prisma.$transaction(async tx => {
    await lock(tx, found.id);
    if (await tx.billingEvent.findUnique({ where: { id: eventId } })) return;
    let row = await tx.churchSubscription.findUniqueOrThrow({ where: { id: found.id } });
    const remote = subscriptionSchema.parse(await asaas(`/subscriptions/${remoteId}`));
    verifySubscription(row, remote);
    if (row.providerId && row.providerId !== remoteId) throw new ApiError(409, 'Assinatura divergente');
    if (!row.providerId) row = await tx.churchSubscription.update({ where: { id: row.id }, data: { providerId: remoteId } });
    // Re-fetch under lock so a concurrent older event cannot overwrite a newer snapshot.
    if (payment) await storePayment(tx, row, paymentSchema.parse(await asaas(`/payments/${payment.id}`)));
    await updateState(tx, row, remote.deleted ?? false);
    await tx.billingEvent.create({ data: { id: eventId, environment: 'sandbox', eventType: event.event, resourceId: payment?.id ?? remoteId! } });
  }, { timeout: 30000, maxWait: 10000 });
}

return { subscriptionView, getSubscription, createCheckout, reconcileSubscription, processWebhook };
}
