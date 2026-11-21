import 'server-only';
import { ApiError } from '../api-errors';

export function asaasReadiness() {
  const environment = process.env.ASAAS_ENVIRONMENT ?? 'sandbox';
  const missing = ['ASAAS_API_KEY', 'ASAAS_WEBHOOK_TOKEN', 'APP_ORIGIN'].filter(key => !process.env[key]);
  if (environment !== 'sandbox') missing.push('ASAAS_ENVIRONMENT (somente sandbox nesta versão)');
  if (process.env.ASAAS_WEBHOOK_TOKEN && (!/^[^\s]{32,255}$/u.test(process.env.ASAAS_WEBHOOK_TOKEN) || process.env.ASAAS_WEBHOOK_TOKEN === process.env.ASAAS_API_KEY)) missing.push('ASAAS_WEBHOOK_TOKEN (token próprio de 32–255 caracteres)');
  try {
    const origin = new URL(process.env.APP_ORIGIN ?? '');
    const local = process.env.NODE_ENV !== 'production' && origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname);
    if ((!local && origin.protocol !== 'https:') || origin.username || origin.password || origin.pathname !== '/' || origin.hash || origin.search) missing.push('APP_ORIGIN (origem válida)');
  } catch { if (process.env.APP_ORIGIN) missing.push('APP_ORIGIN (origem HTTPS pública)'); }
  return { provider: 'asaas' as const, environment: environment === 'production' ? 'production' as const : 'sandbox' as const, configured: missing.length === 0, missing, chargingEnabled: environment === 'sandbox' && missing.length === 0 };
}

export function requireSandbox() {
  if (!asaasReadiness().chargingEnabled) throw new ApiError(503, 'Configure o Sandbox do Asaas. Cobranças reais estão desativadas.');
  return { key: process.env.ASAAS_API_KEY!, token: process.env.ASAAS_WEBHOOK_TOKEN!, origin: new URL(process.env.APP_ORIGIN!).origin };
}
