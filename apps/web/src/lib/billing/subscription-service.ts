import 'server-only';
import { asaas } from './asaas';
import { requireSandbox } from './asaas-config';
import { createBillingService } from './subscription-core';
export const { subscriptionView, getSubscription, createCheckout, reconcileSubscription, processWebhook } = createBillingService({ gateway: asaas, assertConfigured: requireSandbox });
