'use client';
import { useEffect, useRef, useState } from 'react';
import type { VisualProjectDocument } from '@wls/shared';
import { useToast, useToastFeedback } from '@/components/toast-provider';
export function ExportPanel({ projectId, document, autoExport }: { projectId: string; document: VisualProjectDocument; autoExport: boolean }) {
  const [busy, setBusy] = useState(false);
  const { setError, setMessage } = useToastFeedback();
  const notify = useToast();
  const [ready, setReady] = useState<{ url: string; document: VisualProjectDocument } | null>(null);
  const active = useRef(false), initialized = useRef(false), mounted = useRef(true), objectUrl = useRef<string | null>(null);
  async function generate() {
    if (active.current) return;
    active.current = true; setBusy(true); setError('');
    notify('Geração iniciada. Mantenha a página aberta; você pode continuar editando.', 'info');
    const snapshot = document;
    try {
      const response = await fetch(`/api/visual-projects/${projectId}/export`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(snapshot) });
      if (!response.ok) { const body = await response.json() as { error?: string }; throw new Error(body.error ?? 'Não foi possível gerar o vídeo'); }
      const blob = await response.blob();
      if (!mounted.current) return;
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      const url = URL.createObjectURL(blob); objectUrl.current = url;
      setReady({ url, document: snapshot });
      setMessage('Vídeo gerado. Abra Exportar e arquivo para baixar o MP4.');
    } catch (error) { if (mounted.current) setError(error instanceof Error ? error.message : 'Erro ao gerar vídeo'); }
    finally { active.current = false; if (mounted.current) setBusy(false); }
  }
  useEffect(() => {
    mounted.current = true;
    if (autoExport && !initialized.current) {
      initialized.current = true;
      const url = new URL(window.location.href); url.searchParams.delete('export'); window.history.replaceState(null, '', url);
      void generate();
    }
    return () => { mounted.current = false; if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); };
    // Automatic rendering runs once for the initial project, never on edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <section className="card space-y-3"><h2 className="font-bold">Seu lyric video</h2>
    <p className="text-sm text-slate-400">Gere o vídeo completo em MP4, Full HD e sem áudio, com todos os slides e suas personalizações.</p>
    <button className="btn" disabled={busy} onClick={generate}>{busy ? 'Gerando vídeo completo...' : ready ? 'Gerar nova versão' : 'Gerar MP4 completo'}</button>
    {busy && <p role="status" className="text-sm text-slate-400">Isso pode levar alguns minutos. Mantenha esta página aberta; você pode continuar editando.</p>}
    {ready && <div className="space-y-2"><a className="btn-secondary inline-block" href={ready.url} download={`worship-${projectId}.mp4`}>Baixar vídeo pronto</a>{ready.document !== document && <p className="text-sm text-amber-200">Você editou o projeto após iniciar a geração. Gere uma nova versão para incluir as alterações.</p>}</div>}
  </section>;
}
