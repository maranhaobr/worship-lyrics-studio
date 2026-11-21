import { z } from 'zod';

// Operational command, only Sandbox. No secrets or upstream response bodies go to stdout.
async function main() {
  if ((process.env.ASAAS_ENVIRONMENT ?? 'sandbox') !== 'sandbox') throw new Error('Somente Sandbox é permitido.');
  const key = process.env.ASAAS_API_KEY, token = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!key || !token || !/^[^\s]{32,255}$/u.test(token) || key === token) throw new Error('Configure chave e token próprios do Sandbox.');
  const origin = new URL(process.env.APP_ORIGIN ?? '');
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash || ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)) throw new Error('APP_ORIGIN precisa ser uma origem HTTPS pública. Localhost não recebe eventos do Asaas.');
  const endpoint = new URL('/api/billing/webhooks/asaas', origin).href;
  console.log(`Webhook Sandbox: ${endpoint}`);
  const health = await fetch(endpoint, { headers: { 'asaas-access-token': token }, redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (!health.ok) throw new Error('Endpoint público não está pronto ou o token diverge. Nenhum webhook foi criado.');
  z.object({ provider: z.literal('asaas'), environment: z.literal('sandbox'), ready: z.literal(true) }).parse(await health.json());
  const api = async (method: 'GET' | 'POST', body?: object) => {
    const response = await fetch('https://api-sandbox.asaas.com/v3/webhooks', { method, headers: { access_token: key!, 'Content-Type': 'application/json', 'User-Agent': 'WorshipLyricsStudio/1.0' }, body: body ? JSON.stringify(body) : undefined, redirect: 'error', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Asaas respondeu HTTP ${response.status}; nenhum segredo foi exibido.`);
    return await response.json() as unknown;
  };
  const events = ['PAYMENT_CREATED', 'PAYMENT_UPDATED', 'PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'PAYMENT_OVERDUE', 'PAYMENT_DELETED', 'PAYMENT_RESTORED', 'PAYMENT_REFUNDED', 'PAYMENT_PARTIALLY_REFUNDED', 'PAYMENT_REFUND_IN_PROGRESS', 'PAYMENT_CHARGEBACK_REQUESTED', 'PAYMENT_CHARGEBACK_DISPUTE', 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL', 'SUBSCRIPTION_CREATED', 'SUBSCRIPTION_UPDATED', 'SUBSCRIPTION_DELETED'];
  const list = z.object({ data: z.array(z.object({ url: z.string(), enabled: z.boolean(), interrupted: z.boolean(), events: z.array(z.string()) })) }).parse(await api('GET'));
  const existing = list.data.filter(item => item.url === endpoint);
  if (existing.length) {
    if (existing.length !== 1 || !existing[0].enabled || existing[0].interrupted || events.some(event => !existing[0].events.includes(event))) throw new Error('Webhook existente exige revisão no painel. Não foi alterado nem duplicado.');
    console.log('Webhook já cadastrado e habilitado. Confira o token no painel se os eventos retornarem 401.'); return;
  }
  if (!process.argv.includes('--register')) { console.log('Endpoint acessível. Execute com --register para cadastrar o webhook.'); return; }
  const email = z.string().email().parse(process.env.ASAAS_WEBHOOK_EMAIL);
  await api('POST', { name: 'Worship Lyrics Studio — Sandbox', url: endpoint, email, enabled: true, interrupted: false, authToken: token, sendType: 'SEQUENTIALLY', events });
  console.log('Webhook de teste cadastrado. Valide a entrega de eventos no painel do Asaas.');
}
main().catch(() => { console.error('Não foi possível validar/cadastrar o webhook. Verifique APP_ORIGIN HTTPS público, endpoint publicado, ASAAS_WEBHOOK_EMAIL, credenciais e conectividade. Nenhum segredo foi exibido.'); process.exitCode = 1; });
