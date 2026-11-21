import { NextResponse } from 'next/server';
import { apiResponse, ApiError } from '@/lib/api-errors';
import { assertOrigin, requireActor, rateLimit } from '@/lib/auth/session';
import { getSubscription, reconcileSubscription, subscriptionView } from '@/lib/billing/subscription-service';
export const runtime = 'nodejs';
async function owner() {
  const actor = await requireActor();
  if (actor.role !== 'OWNER') throw new ApiError(403, 'Somente o Responsável pode consultar a cobrança');
  return actor;
}
export async function GET() {
  return apiResponse(async () => NextResponse.json({ subscription: subscriptionView(await getSubscription((await owner()).churchId)) }));
}
export async function POST() {
  return apiResponse(async () => {
    const actor = await owner();
    await assertOrigin();
    await rateLimit(`billing:sync:${actor.churchId}`, 10);
    return NextResponse.json({ subscription: subscriptionView(await reconcileSubscription(actor.churchId)) });
  });
}
