import { NextResponse } from 'next/server';
import { apiResponse, ApiError } from '@/lib/api-errors';
import { assertOrigin, requireActor, rateLimit } from '@/lib/auth/session';
import { boundedJson, checkoutInput } from '@/lib/billing/validation';
import { createCheckout, subscriptionView } from '@/lib/billing/subscription-service';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  return apiResponse(async () => {
    const actor = await requireActor();
    if (actor.role !== 'OWNER') throw new ApiError(403, 'Somente o Responsável pode contratar planos');
    await assertOrigin();
    await rateLimit(`billing:checkout:${actor.churchId}`, 5);
    let body: unknown;
    try { body = await boundedJson(request, 4096); } catch { throw new ApiError(400, 'Solicitação inválida ou muito grande'); }
    const input = checkoutInput.parse(body);
    return NextResponse.json({ subscription: subscriptionView(await createCheckout(actor.churchId, actor.user.email, input)) });
  });
}
