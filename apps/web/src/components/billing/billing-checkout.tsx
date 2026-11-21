'use client';
import { useEffect, useState } from 'react';
import { getPaidPlan, planPriceCents, type BillingCycle } from '@wls/shared';
import { useToast } from '@/components/toast-provider';
import { useTranslation } from '@/components/preferences-provider';
type Subscription = { planId: string; cycle: string; priceCents: number; billingType: string; status: string; invoiceUrl: string | null; environment: string };
const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
export function BillingCheckout({ enabled, planId, cycle }: { enabled: boolean; planId: string; cycle: BillingCycle }) {
  const t = useTranslation(), notify = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loaded, setLoaded] = useState(false), [busy, setBusy] = useState(false);
  const [name, setName] = useState(''), [cpfCnpj, setCpfCnpj] = useState(''), [consent, setConsent] = useState(false);
  const [billingType, setBillingType] = useState('PIX');
  const plan = getPaidPlan(planId)!;
  useEffect(() => {
    let active = true;
    fetch('/api/billing/status').then(async response => {
      if (!response.ok) throw new Error();
      const data = await response.json() as { subscription: Subscription | null };
      if (active) { setSubscription(data.subscription); setLoaded(true); }
    }).catch(() => { if (active) notify('Não foi possível consultar a assinatura', 'error'); });
    return () => { active = false; };
  }, [notify]);
  async function submit(reconcile: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(reconcile ? '/api/billing/status' : '/api/billing/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: reconcile ? undefined : JSON.stringify({ planId, cycle, billingType, name, cpfCnpj, consent }) });
      const data = await response.json() as { subscription?: Subscription | null; error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Não foi possível concluir a operação');
      setSubscription(data.subscription ?? null); setLoaded(true); setCpfCnpj('');
      notify(reconcile ? 'Situação da assinatura atualizada' : 'Cobrança de teste criada. Abra o pagamento no Asaas.', 'success');
    } catch (error) { notify(error instanceof Error ? error.message : 'Não foi possível concluir a operação', 'error'); }
    finally { setBusy(false); }
  }
  return <section className="card space-y-4" aria-label={t('Checkout de teste')}><h2>{t('Checkout de teste')}</h2><p>{t('Somente Sandbox. Nenhum pagamento real será realizado. Os limites atuais permanecem iguais.')}</p>
    {subscription ? <><p>{t('Plano')}: {t(getPaidPlan(subscription.planId)?.name ?? subscription.planId)} · {money(subscription.priceCents)} / {t(subscription.cycle === 'annual' ? 'ano' : 'mês')}</p><p role="status">{t('Situação')}: {t(subscription.status)}</p>{subscription.invoiceUrl && <a className="btn" href={subscription.invoiceUrl} target="_blank" rel="noopener noreferrer">{t('Abrir pagamento de teste no Asaas')}</a>}<p>{t('Os dados do cartão são preenchidos apenas no Asaas. Pix e boleto exigem pagamento de cada cobrança.')}</p></> : <form className="space-y-4" onSubmit={event => { event.preventDefault(); void submit(false); }}>
      <p><strong>{t(plan.name)} · {money(planPriceCents(plan, cycle))} / {t(cycle === 'annual' ? 'ano' : 'mês')}</strong></p>
      <label className="block"><span className="label">{t('Nome do pagador de teste')}</span><input required minLength={3} maxLength={120} value={name} onChange={event => setName(event.target.value)} /></label>
      <label className="block"><span className="label">{t('CPF ou CNPJ de teste')}</span><input required maxLength={20} value={cpfCnpj} onChange={event => setCpfCnpj(event.target.value)} autoComplete="off" /></label>
      <label className="block"><span className="label">{t('Forma de pagamento')}</span><select value={billingType} onChange={event => setBillingType(event.target.value)}><option value="PIX">Pix</option><option value="BOLETO">{t('Boleto')}</option><option value="CREDIT_CARD">{t('Cartão de crédito')}</option></select></label>
      <label className="flex items-start gap-2"><input type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)} /><span>{t('Autorizo enviar o nome, CPF/CNPJ de teste e meu e-mail ao Sandbox do Asaas para criar esta assinatura recorrente de teste.')}</span></label>
      <button className="btn" disabled={!enabled || !loaded || busy || !consent}>{t(busy ? 'Aguarde...' : 'Criar assinatura de teste')}</button>
    </form>}
    <button className="btn-secondary" disabled={!enabled || busy} onClick={() => void submit(true)}>{t('Atualizar situação')}</button>
    <p>{t('Localhost não recebe webhooks externos. Use Atualizar situação para consultar o Asaas enquanto a URL pública não estiver configurada.')}</p>
    <p>{t('Para encerrar a recorrência de teste, cancele a assinatura no painel Sandbox do Asaas e atualize a situação aqui.')}</p>
  </section>;
}
