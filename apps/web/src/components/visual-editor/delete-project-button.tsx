'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { useTranslation } from '@/components/preferences-provider';
import { useToast } from '@/components/toast-provider';
import { readResponse } from '@/hooks/use-visual-editor';

export function DeleteProjectButton({ id, name, revision }: { id: string; name: string; revision: number }) {
  const t = useTranslation(), notify = useToast(), router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const running = useRef(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  async function remove() {
    if (running.current) return;
    running.current = true; setBusy(true); setError('');
    try {
      await readResponse(await fetch(`/api/visual-projects/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision }) }));
      dialog.current?.close(); notify('Projeto visual excluído', 'success'); router.refresh();
    } catch (cause) { const message = cause instanceof Error ? cause.message : 'Não foi possível excluir o projeto'; setError(message); notify(message, 'error'); }
    finally { running.current = false; setBusy(false); }
  }
  return <>
    <button className="btn-secondary" disabled={!ready} aria-label={`${t('Excluir projeto')}: ${name}`} onClick={() => { setError(''); dialog.current?.showModal(); }}><Trash2 size={14} />{t('Excluir projeto')}</button>
    <dialog ref={dialog} aria-label={t('Excluir projeto visual?')} className="card w-[calc(100%_-_2rem)] max-w-lg backdrop:bg-black/70 shadow-2xl" style={{ color: 'inherit' }} onCancel={event => { if (busy) event.preventDefault(); }}>
      <h2 className="font-bold text-xl">{t('Excluir projeto visual?')}</h2><p className="my-4 font-semibold break-words">{name}</p>
      <p className="text-sm my-4">{t('Esta ação é permanente. O projeto e seu histórico de alinhamento serão excluídos. A música original e os arquivos de mídia continuarão na biblioteca.')}</p>
      {error && <p role="alert" className="text-sm text-red-400 my-4">{t(error)}</p>}
      <div className="flex justify-end gap-2"><button autoFocus className="btn-secondary" disabled={busy} onClick={() => dialog.current?.close()}>{t('Cancelar')}</button><button className="btn" style={{ backgroundColor: '#b91c1c', color: '#fff' }} disabled={busy} onClick={() => void remove()}>{t(busy ? 'Excluindo...' : 'Excluir definitivamente')}</button></div>
    </dialog>
  </>;
}
