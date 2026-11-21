import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export const checkoutInput = z.object({
  planId: z.enum(['essential', 'pro', 'advanced']), cycle: z.enum(['monthly', 'annual']),
  billingType: z.enum(['CREDIT_CARD', 'PIX', 'BOLETO']), name: z.string().trim().min(3).max(120),
  cpfCnpj: z.string().transform(value => value.replace(/[.\-/\s]/g, '')).refine(value => /^(\d{11}|\d{14})$/.test(value), 'Informe CPF ou CNPJ'),
  consent: z.literal(true),
}).strict();
export const providerId = z.string().min(1).max(150).regex(/^[a-zA-Z0-9_-]+$/);
export const paymentSchema = z.object({
  id: providerId, customer: providerId, subscription: providerId, value: z.number().finite().nonnegative(), status: z.string().min(1).max(80),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), invoiceUrl: z.string().url().nullish(), deleted: z.boolean().optional(),
  refunds: z.array(z.unknown()).nullish(),
});
export const subscriptionSchema = z.object({
  id: providerId, customer: providerId, externalReference: z.string(), value: z.number().finite(), cycle: z.string(), billingType: z.string(), deleted: z.boolean().optional(),
});
export const webhookSchema = z.object({
  id: z.string().min(1).max(200), event: z.string().min(1).max(100),
  payment: z.object({ id: providerId }).optional(), subscription: z.object({ id: providerId }).optional(),
});
export function validWebhookToken(actual: string | null, expected: string): boolean {
  if (!actual || actual.length > 255) return false;
  const a = Buffer.from(actual), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function safeInvoiceUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'sandbox.asaas.com' && !url.username && !url.password && !url.port ? url.href : null;
  } catch { return null; }
}
export function paymentState(status: string, deleted = false): string {
  if (deleted) return 'CANCELED';
  if (['RECEIVED', 'CONFIRMED'].includes(status)) return 'ACTIVE';
  if (status === 'OVERDUE') return 'PAST_DUE';
  if (['REFUNDED', 'REFUND_REQUESTED', 'REFUND_IN_PROGRESS', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL'].includes(status)) return 'REVERSED';
  return 'PENDING';
}
export async function boundedJson(request: Request, limit = 65536): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('EMPTY_BODY');
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new Error('BODY_TOO_LARGE'); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } finally { reader.releaseLock(); }
}
