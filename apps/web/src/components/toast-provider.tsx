'use client';
import { useTranslation } from '@/components/preferences-provider';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'warning' | 'info';
type Toast = { id: number; message: string; kind: ToastKind };
type Notify = (message: string, kind?: ToastKind) => void;
const ToastContext = createContext<Notify | null>(null);
const appearance = {
  success: { label: 'Sucesso', Icon: CheckCircle2, color: 'border-emerald-500/60 bg-emerald-950 text-emerald-100', duration: 4000 },
  error: { label: 'Erro', Icon: AlertCircle, color: 'border-red-500/60 bg-red-950 text-red-100', duration: 7000 },
  warning: { label: 'Atenção', Icon: AlertTriangle, color: 'border-amber-500/60 bg-amber-950 text-amber-100', duration: 6000 },
  info: { label: 'Informação', Icon: Info, color: 'border-blue-500/60 bg-blue-950 text-blue-100', duration: 5000 },
};

function ToastItem({ toast, dismiss }: { toast: Toast; dismiss: (id: number) => void }) {
  const t = useTranslation();
  const [paused, setPaused] = useState(false);
  const { Icon, label, color, duration } = appearance[toast.kind];
  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => dismiss(toast.id), duration);
    return () => clearTimeout(timer);
  }, [toast.id, duration, paused, dismiss]);
  return <div data-toast-kind={toast.kind} className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-2xl ${color}`} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
    <Icon size={21} className="shrink-0 mt-0.5" aria-hidden="true" />
    <div className="flex-1 min-w-0" role={toast.kind === 'error' ? "alert" : "status"} aria-atomic="true"><p className="font-semibold text-sm">{t(label)}</p><p className="text-sm break-words mt-1">{t(toast.message)}</p></div>
    <button aria-label={`${t('Fechar notificação')}: ${t(toast.message)}`} className="shrink-0 rounded p-1 hover:bg-white/10 focus-visible:outline focus-visible:outline-2" onClick={() => dismiss(toast.id)}><X size={16} /></button>
  </div>;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslation();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const sequence = useRef(0);
  const dismiss = useCallback((id: number) => setToasts(items => items.filter(item => item.id !== id)), []);
  const notify = useCallback<Notify>((message, kind = 'info') => {
    if (!message.trim()) return;
    const id = ++sequence.current;
    setToasts(items => [...items.filter(item => item.message !== message || item.kind !== kind), { id, message, kind }].slice(-4));
  }, []);
  return <ToastContext.Provider value={notify}>{children}<section aria-label={t("Notificações")} className="fixed z-[100] top-4 right-4 left-4 sm:left-auto sm:w-96 pointer-events-none flex flex-col gap-3 max-h-[calc(100dvh-32px)] overflow-y-auto">{toasts.map(toast => <ToastItem key={toast.id} toast={toast} dismiss={dismiss} />)}</section></ToastContext.Provider>;
}

export function useToast() {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error('useToast requer ToastProvider');
  return notify;
}

/** Event callbacks accept empty strings so existing reset calls remain harmless. */
export function useToastFeedback() {
  const notify = useToast();
  return useMemo(() => ({ setError: (message: string) => notify(message, 'error'), setMessage: (message: string) => notify(message, 'success') }), [notify]);
}
