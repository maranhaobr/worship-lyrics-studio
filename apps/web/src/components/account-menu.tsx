'use client';
import { useTranslation } from '@/components/preferences-provider';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
export function AccountMenu({ churches, current, compact = false }: { churches: { id: string; name: string }[]; current: string; compact?: boolean }) {
  const t = useTranslation();
  const router = useRouter(); const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function action(path: string, body: object) { setBusy(true); setError(''); try { const response = await fetch(`/api/auth/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!response.ok) throw new Error('Não foi possível concluir a ação'); router.push(path === 'logout' ? '/login' : '/dashboard'); router.refresh(); } catch (error) { setError(error instanceof Error ? error.message : 'Erro de conexão'); setBusy(false); } }
  return <div className="space-y-2">{!compact && churches.length > 1 && <label><span className="label">{t("Igreja ativa")}</span><select disabled={busy} value={current} onChange={event => void action('switch', { churchId: event.target.value })}>{churches.map(church => <option key={church.id} value={church.id}>{church.name}</option>)}</select></label>}<button aria-label={t("Sair da conta")} title={t("Sair da conta")} className={`btn-secondary w-full ${compact ? '!px-1 text-xs' : ''}`} disabled={busy} onClick={() => void action('logout', {})}>{compact ? t("Sair") : t("Sair da conta")}</button>{error && <p role="alert" className="text-red-300 text-sm">{error}</p>}</div>;
}
