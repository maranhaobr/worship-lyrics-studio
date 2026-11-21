import assert from 'node:assert/strict';
import test from 'node:test';
import { billingPolicy, estimateAlignmentMinutes, estimateContribution, estimateExportCredits, getPaidPlan, paidPlans, planPriceCents, trialLimits } from '../packages/shared/src';

test('draft plan prices use BRL cents with one annual payment of ten monthly prices', () => {
  assert.equal(billingPolicy.proposed, true); assert.equal(billingPolicy.trialDays, 14);
  assert.deepEqual(paidPlans.map(plan => plan.monthlyCents), [4900, 9900, 19900]);
  for (const plan of paidPlans) {
    assert.equal(planPriceCents(plan, 'monthly'), plan.monthlyCents);
    assert.equal(planPriceCents(plan, 'annual'), plan.monthlyCents * 10);
    assert.ok(plan.limits.exportCredits > trialLimits.exportCredits);
  }
  assert.equal(getPaidPlan('client-controlled-price'), undefined);
});
test('export estimates charge by inspected duration and pixels rather than number of files', () => {
  assert.equal(estimateExportCredits(300000, 1920, 1080), 5);
  assert.equal(estimateExportCredits(300000, 3840, 2160), 20);
  assert.equal(estimateExportCredits(300000, 1080, 1920), 5);
  assert.equal(estimateExportCredits(300000, 1280, 720), 3);
  assert.equal(estimateExportCredits(100, 1920, 1080), 1);
  for (const [duration, width, height] of [[0, 1920, 1080], [NaN, 1920, 1080], [3600001, 1920, 1080], [5000, 1279, 720], [5000, 4096, 4096]]) assert.throws(() => estimateExportCredits(duration, width, height), RangeError);
  assert.equal(estimateAlignmentMinutes(60001), 2); assert.throws(() => estimateAlignmentMinutes(Infinity), RangeError);
});
test('cost simulation accounts for processor, taxes, variable costs and shared fixed costs', () => {
  const input = { revenueCents: 14900, processorPercent: 4, processorFixedCents: 50, taxPercent: 6, variableCostCents: 2500, monthlyFixedCostCents: 50000, activeChurches: 50 };
  const result = estimateContribution(input);
  assert.equal(result.paymentCents, 646); assert.equal(result.taxCents, 894); assert.equal(result.fixedShareCents, 1000); assert.equal(result.contributionCents, 9860);
  assert.ok(estimateContribution({ ...input, activeChurches: 1 }).contributionCents < 0, 'fixed costs can make early pricing unprofitable');
  assert.throws(() => estimateContribution({ ...input, activeChurches: 0 }), RangeError);
  assert.throws(() => estimateContribution({ ...input, processorPercent: 101 }), RangeError);
  assert.throws(() => estimateContribution({ ...input, revenueCents: 12.5 }), RangeError);
});
