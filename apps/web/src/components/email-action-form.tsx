'use client';
import { useTranslation } from '@/components/preferences-provider';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export function EmailActionForm({ mode }: { mode: 'verify' | 'forgot' | 'reset' }) {
  const t = useTranslation();
  const [token, setToken] = useState(''), [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false), [done, setDone] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    // Fragments never reach server logs or Referer headers; remove after reading.
    const raw = new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '';
    setToken(raw); setLoaded(true);
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
  }, []);
  const completing = Boolean(token) && mode !== 'forgot';
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (mode === 'reset' && data.password !== data.confirmPassword) { setError('As senhas não coincidem.'); setBusy(false); return; }
    const action = mode === 'forgot' ? 'forgot-password' : mode === 'reset' ? 'reset-password' : completing ? 'verify-email' : 'resend-verification';
    try {
      const response = await fetch(`/api/auth/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(completing ? { token, ...(mode === 'reset' ? { password: data.password } : {}) } : { email: data.email }) });
      const body = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(body.error === 'Dados inválidos' ? 'Confira os campos e a validade do link. A senha deve ter de 12 a 128 caracteres.' : body.error ?? 'Não foi possível concluir a ação.');
      setMessage(completing ? mode === 'verify' ? 'E-mail confirmado! Você já pode entrar na sua conta.' : 'Senha redefinida. Entre com a nova senha. As sessões anteriores foram encerradas.' : body.message ?? 'Confira sua caixa de entrada e a pasta de spam.');
      if (completing) { setToken(''); setDone(true); }
    } catch (error) { setError(error instanceof Error ? error.message : 'Erro de conexão. Tente novamente.'); }
    finally { setBusy(false); }
  }
  const title = mode === 'verify' ? 'Confirme seu e-mail' : mode === 'forgot' ? 'Recuperar senha' : 'Criar nova senha';
  return <main className="min-h-screen flex items-center justify-center p-5"><section className="card w-full max-w-md space-y-5">
    <p className="text-accent font-bold">Worship Lyrics Studio</p><h1 className="text-2xl font-bold">{t(title)}</h1>
    {mode === 'verify' && !completing && !done && <p className="text-sm text-slate-400">{t("Enviamos um link no cadastro. Abra o e-mail para confirmar. Se precisar de outro link, informe seu endereço abaixo.")}</p>}
    {mode === 'forgot' && <p className="text-sm text-slate-400">{t("Informe seu e-mail para receber um link de recuperação com validade de 30 minutos.")}</p>}
    {mode === 'verify' && completing && <p className="text-sm text-slate-400">{t("Clique abaixo para confirmar seu endereço de e-mail.")}</p>}
    {loaded && !done && (mode !== 'reset' || completing) && <form method="post" action={`/api/auth/${mode === 'forgot' ? 'forgot-password' : mode === 'reset' ? 'reset-password' : completing ? 'verify-email' : 'resend-verification'}`} onSubmit={submit} className="space-y-4"><fieldset disabled={busy} className="space-y-4">
      {!completing && <label><span className="label">{t("E-mail")}</span><input name="email" type="email" required maxLength={254} autoComplete="email" /></label>}
      {mode === 'reset' && <><label><span className="label">{t("Nova senha (mínimo de 12 caracteres)")}</span><input type="password" name="password" required minLength={12} maxLength={128} autoComplete="new-password" /></label><label><span className="label">{t("Confirme a nova senha")}</span><input type="password" name="confirmPassword" required minLength={12} maxLength={128} autoComplete="new-password" /></label></>}
      <button type="submit" className="btn w-full">{busy ? t("Aguarde...") : mode === 'reset' ? t("Redefinir senha") : completing ? t("Confirmar e-mail") : mode === 'forgot' ? t("Enviar link de recuperação") : t("Reenviar confirmação")}</button>
    </fieldset></form>}
    {loaded && mode === 'reset' && !completing && !done && <p className="text-sm text-amber-200">{t("Abra o link recebido por e-mail para criar uma nova senha.")}</p>}
    {error && <p role="alert" className="text-red-300 text-sm">{t(error)}</p>}{message && <p role="status" className={`text-sm ${done ? 'text-emerald-300' : 'text-blue-300'}`}>{t(message)}</p>}
    <div className="flex flex-wrap gap-3 text-sm text-accent"><Link href="/login">{t("Voltar para entrar")}</Link>{mode === 'reset' && <Link href="/forgot-password">{t("Solicitar novo link")}</Link>}{mode === 'verify' && completing && <Link href="/verify-email" onClick={() => { setToken(''); setError(''); }}>{t("Solicitar novo link")}</Link>}</div>
  </section></main>;
}
