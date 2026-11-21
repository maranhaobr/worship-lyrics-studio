import { redirect } from 'next/navigation';
import { requireActor } from '@/lib/auth/session';
import { prisma } from '@wls/database';
import { asaasReadiness } from '@/lib/billing/asaas-config';
import { BillingPlanner } from '@/components/billing/billing-planner';
import '../../billing.css';
export const dynamic = 'force-dynamic';
export default async function BillingPage() {
  const actor = await requireActor();
  if (actor.role !== 'OWNER') redirect('/dashboard');
  const [members, projects, storage] = await Promise.all([
    prisma.membership.count({ where: { churchId: actor.churchId } }),
    prisma.visualProject.count({ where: { churchId: actor.churchId } }),
    prisma.mediaAsset.aggregate({ where: { churchId: actor.churchId }, _sum: { size: true } }),
  ]);
  return <BillingPlanner readiness={asaasReadiness()} current={{ members, projects, storageBytes: storage._sum.size ?? 0 }} />;
}
