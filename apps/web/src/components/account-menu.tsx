'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
export function AccountMenu({ churches, current }: { churches: { id: string; name: string }[]; current: string }) {
  const router = useRouter(); const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function action(path: string, body: object) { setBusy(true); setError(''); try { const response = await fetch(`/api/auth/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!response.ok) throw new Error('Não foi possível concluir a ação'); router.push(path === 'logout' ? '/login' : '/'); router.refresh(); } catch (error) { setError(error instanceof Error ? error.message : 'Erro de conexão'); setBusy(false); } }
  return <div className="space-y-2">{churches.length > 1 && <label><span className="label">Igreja ativa</span><select disabled={busy} value={current} onChange={event => void action('switch', { churchId: event.target.value })}>{churches.map(church => <option key={church.id} value={church.id}>{church.name}</option>)}</select></label>}<button className="btn-secondary w-full" disabled={busy} onClick={() => void action('logout', {})}>Sair da conta</button>{error && <p role="alert" className="text-red-300 text-sm">{error}</p>}</div>;
}
