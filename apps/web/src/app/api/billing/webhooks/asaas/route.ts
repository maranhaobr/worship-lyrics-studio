import { NextResponse } from 'next/server';
import { apiResponse, ApiError } from '@/lib/api-errors';
import { requireSandbox } from '@/lib/billing/asaas-config';
import { boundedJson, validWebhookToken, webhookSchema } from '@/lib/billing/validation';
import { processWebhook } from '@/lib/billing/subscription-service';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  return apiResponse(async () => {
    const { token } = requireSandbox();
    if (!validWebhookToken(request.headers.get('asaas-access-token'), token)) throw new ApiError(401, 'Webhook não autorizado');
    return NextResponse.json({ provider: 'asaas', environment: 'sandbox', ready: true });
  });
}
export async function POST(request: Request) {
  return apiResponse(async () => {
    const { token } = requireSandbox();
    if (!validWebhookToken(request.headers.get('asaas-access-token'), token)) throw new ApiError(401, 'Webhook não autorizado');
    let body: unknown;
    try { body = await boundedJson(request); } catch { throw new ApiError(400, 'Evento inválido ou muito grande'); }
    await processWebhook(webhookSchema.parse(body));
    return NextResponse.json({ received: true });
  });
}
