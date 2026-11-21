import assert from 'node:assert/strict';
import test from 'node:test';
import { boundedJson, checkoutInput, paymentState, safeInvoiceUrl, validWebhookToken, webhookSchema } from '../apps/web/src/lib/billing/validation';
test('checkout rejects client prices, missing consent, unsupported plans and payment methods', () => {
  const input = { planId: 'pro', cycle: 'monthly', billingType: 'PIX', name: 'Pagador Teste', cpfCnpj: '123.456.789-09', consent: true };
  assert.equal(checkoutInput.parse(input).cpfCnpj, '12345678909');
  for (const change of [{ priceCents: 1 }, { consent: false }, { planId: 'free' }, { billingType: 'CASH' }, { cpfCnpj: 'abc12345678909' }]) assert.equal(checkoutInput.safeParse({ ...input, ...change }).success, false);
});
test('webhook authenticates exact tokens; ignores payload extensions and rejects unsafe IDs', () => {
  const token = 'a'.repeat(48);
  assert.ok(validWebhookToken(token, token));
  for (const value of [null, '', token + 'a', 'b'.repeat(48), 'é'.repeat(48)]) assert.equal(validWebhookToken(value, token), false);
  assert.ok(webhookSchema.safeParse({ id: 'evt_1', event: 'PAYMENT_RECEIVED', payment: { id: 'pay_1', creditCardToken: 'never-retained' }, extra: true }).success);
  assert.equal(webhookSchema.safeParse({ id: 'evt', event: 'PAYMENT_RECEIVED', payment: { id: '../customers' } }).success, false);
});
test('only Sandbox HTTPS invoice URLs can reach the client', () => {
  assert.equal(safeInvoiceUrl('https://sandbox.asaas.com/i/test'), 'https://sandbox.asaas.com/i/test');
  for (const value of ['https://asaas.com/i/test', 'https://sandbox.asaas.com.evil.test/i/test', 'http://sandbox.asaas.com/i/test', 'https://user:pass@sandbox.asaas.com/i/test', 'javascript:alert(1)', 'https://sandbox.asaas.com:8443/i/test']) assert.equal(safeInvoiceUrl(value), null);
});
test('authorization is not payment; refunds and deleted invoices do not activate subscriptions', () => {
  for (const status of ['AUTHORIZED', 'PENDING', 'AWAITING_RISK_ANALYSIS']) assert.equal(paymentState(status), 'PENDING');
  assert.equal(paymentState('CONFIRMED'), 'ACTIVE'); assert.equal(paymentState('RECEIVED'), 'ACTIVE');
  assert.equal(paymentState('OVERDUE'), 'PAST_DUE'); assert.equal(paymentState('REFUNDED'), 'REVERSED'); assert.equal(paymentState('CHARGEBACK_REQUESTED'), 'REVERSED'); assert.equal(paymentState('RECEIVED', true), 'CANCELED');
});
test('webhook body size is bounded even without Content-Length', async () => {
  const request = (body: string) => new Request('https://example.test', { method: 'POST', body });
  assert.deepEqual(await boundedJson(request('{"ok":true}')), { ok: true });
  await assert.rejects(boundedJson(request('x'.repeat(65)), 64), /BODY_TOO_LARGE/);
  await assert.rejects(boundedJson(request('{oops')));
});
