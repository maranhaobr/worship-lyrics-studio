/** Draft commercial policy. Publishing prices and activating enforcement are separate steps. */
export const billingPolicy = { version: '2026-11-draft-1', currency: 'BRL', trialDays: 14, annualPaidMonths: 10, proposed: true } as const;
export const paidPlanIds = ['essential', 'pro', 'advanced'] as const;
export type PaidPlanId = typeof paidPlanIds[number];
export type BillingCycle = 'monthly' | 'annual';
export type PlanLimits = { exportCredits: number; alignmentMinutes: number; storageBytes: number; members: number; projects: number; maxPixels: number };
export type PaidPlan = { id: PaidPlanId; name: string; monthlyCents: number; limits: PlanLimits; recommended: boolean };
const gb = 1024 ** 3;
export const paidPlans: readonly PaidPlan[] = [
  { id: 'essential', name: 'Essencial', monthlyCents: 4900, recommended: false, limits: { exportCredits: 120, alignmentMinutes: 60, storageBytes: 5 * gb, members: 3, projects: 20, maxPixels: 1920 * 1080 } },
  { id: 'pro', name: 'Pro', monthlyCents: 9900, recommended: true, limits: { exportCredits: 300, alignmentMinutes: 180, storageBytes: 20 * gb, members: 10, projects: 100, maxPixels: 3840 * 2160 } },
  { id: 'advanced', name: 'Avançado', monthlyCents: 19900, recommended: false, limits: { exportCredits: 800, alignmentMinutes: 480, storageBytes: 50 * gb, members: 25, projects: 300, maxPixels: 3840 * 2160 } },
];
export const trialLimits: Readonly<PlanLimits> = { exportCredits: 30, alignmentMinutes: 15, storageBytes: gb, members: 2, projects: 5, maxPixels: 1920 * 1080 };
export function planPriceCents(plan: PaidPlan, cycle: BillingCycle): number {
  return cycle === 'annual' ? plan.monthlyCents * billingPolicy.annualPaidMonths : plan.monthlyCents;
}
export function getPaidPlan(id: string): PaidPlan | undefined { return paidPlans.find(plan => plan.id === id); }

/** Server-side metering must use validated document dimensions and inspected media duration. */
export function estimateExportCredits(durationMs: number, width: number, height: number): number {
  if (!Number.isSafeInteger(durationMs) || durationMs <= 0 || durationMs > 3600000 || !Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 256 || height < 256 || width > 4096 || height > 4096 || width % 2 || height % 2 || width * height > 3840 * 2160) throw new RangeError('Invalid export dimensions or duration');
  const factor = Math.max(.5, width * height / (1920 * 1080));
  return Math.max(1, Math.ceil(durationMs / 60000 * factor));
}
export function estimateAlignmentMinutes(durationMs: number): number {
  if (!Number.isSafeInteger(durationMs) || durationMs <= 0 || durationMs > 3600000) throw new RangeError('Invalid audio duration');
  return Math.ceil(durationMs / 60000);
}
export type MarginInput = { revenueCents: number; processorPercent: number; processorFixedCents: number; taxPercent: number; variableCostCents: number; monthlyFixedCostCents: number; activeChurches: number };
/** Simulation only: callers must enter measured provider, infrastructure and tax costs. */
export function estimateContribution(input: MarginInput) {
  for (const value of Object.values(input)) if (!Number.isFinite(value) || value < 0) throw new RangeError('Invalid cost assumption');
  for (const value of [input.revenueCents, input.processorFixedCents, input.variableCostCents, input.monthlyFixedCostCents]) if (!Number.isSafeInteger(value)) throw new RangeError('Costs must use whole cents');
  if (!Number.isSafeInteger(input.activeChurches) || input.activeChurches < 1 || input.processorPercent > 100 || input.taxPercent > 100) throw new RangeError('Invalid cost assumption');
  const payment = Math.round(input.revenueCents * input.processorPercent / 100) + input.processorFixedCents;
  const tax = Math.round(input.revenueCents * input.taxPercent / 100);
  const fixedShare = Math.ceil(input.monthlyFixedCostCents / input.activeChurches);
  const contributionCents = input.revenueCents - payment - tax - input.variableCostCents - fixedShare;
  return { paymentCents: payment, taxCents: tax, fixedShareCents: fixedShare, contributionCents, marginPercent: input.revenueCents ? contributionCents / input.revenueCents * 100 : 0 };
}
