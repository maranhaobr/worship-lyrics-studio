'use client';
import { useEffect, useRef, useState } from 'react';
import { alignmentJobSchema, type AlignmentJobView, type MediaView, type ProjectView, type VisualProjectDocument } from '@wls/shared';
import { readResponse } from '@/hooks/use-visual-editor';
import { useToast, useToastFeedback } from '@/components/toast-provider';

export function AlignmentPanel({ projectId, revision, dirty, saving, document, assets, onAudio, onRemoveAudio, onApplied, onApplying }: {
  projectId: string; revision: number; dirty: boolean; saving: boolean; document: VisualProjectDocument; assets: MediaView[];
  onAudio: (asset: MediaView) => void; onRemoveAudio: () => void; onApplied: (project: ProjectView) => void;
  onApplying: (busy: boolean) => void;
}) {
  const [job, setJob] = useState<AlignmentJobView | null>(null);
  const [busy, setBusy] = useState(false), [refresh, setRefresh] = useState(0);
  const { setError, setMessage } = useToastFeedback();
  const notify = useToast();
  const lastStatus = useRef<string | null>(null), connectionError = useRef(false);
  const [reviewed, setReviewed] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const active = job?.status === 'QUEUED' || job?.status === 'PROCESSING';
  useEffect(() => {
    let live = true, timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    async function poll() {
      try {
        const response = await fetch(`/api/visual-projects/${projectId}/alignment`, { signal: controller.signal });
        const data = await readResponse<unknown>(response);
        const next = data === null ? null : alignmentJobSchema.parse(data);
        if (!live) return;
        setError('');
        if (connectionError.current) { notify('Conexão com o alinhamento restabelecida.', 'info'); connectionError.current = false; }
        const statusKey = next ? `${next.id}:${next.status}` : null;
        if (lastStatus.current && statusKey !== lastStatus.current) {
          if (next?.status === 'FAILED') setError(next.error ?? 'Falha no alinhamento');
          if (next?.status === 'COMPLETED') notify(next.result?.warnings.length ? 'Alinhamento concluído com trechos para revisar. Abra Áudio e sincronização.' : 'Alinhamento concluído. Abra Áudio e sincronização para aplicar.', next.result?.warnings.length ? 'warning' : 'success');
        }
        lastStatus.current = statusKey;
        setJob(next);
        if (next?.status === 'QUEUED' || next?.status === 'PROCESSING') timer = setTimeout(poll, 2000);
      } catch { if (live) { if (!connectionError.current) { notify('Não foi possível consultar o alinhamento. Tentando novamente...', 'warning'); connectionError.current = true; } timer = setTimeout(poll, 5000); } }
    }
    void poll();
    return () => { live = false; controller.abort(); if (timer) clearTimeout(timer); };
  }, [projectId, refresh, notify, setError]);
  async function upload(file: File) {
    setBusy(true); setError('');
    try {
      if (!/\.(mp3|wav|m4a)$/iu.test(file.name) || file.size > 50 * 1024 * 1024) throw new Error('Envie MP3, WAV ou M4A de até 50 MB.');
      const form = new FormData(); form.append('file', file);
      const asset = await readResponse<MediaView>(await fetch('/api/media', { method: 'POST', body: form }));
      if (asset.kind !== 'audio') throw new Error('O arquivo precisa conter apenas áudio');
      onAudio(asset);
      setMessage('Áudio enviado. Salve o projeto para iniciar o alinhamento.');
    } catch (error) { setError(error instanceof Error ? error.message : 'Falha no envio do áudio'); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  }
  async function action(method: 'POST' | 'PUT' | 'DELETE') {
    setBusy(true); setError('');
    if (method === 'PUT') onApplying(true);
    try {
      const data = await readResponse<unknown>(await fetch(`/api/visual-projects/${projectId}/alignment`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision, jobId: job?.id }) }));
      if (method === 'PUT') onApplied(data as ProjectView);
      if (method === 'POST') notify('Alinhamento enviado para processamento.', 'info');
      if (method === 'DELETE') notify('Alinhamento cancelado.', 'info');
      setReviewed(false); setRefresh(value => value + 1);
    } catch (error) { setError(error instanceof Error ? error.message : 'Falha no alinhamento'); }
    finally { setBusy(false); if (method === 'PUT') onApplying(false); }
  }
  const warnings = job?.result?.warnings ?? [];
  return <section className="card space-y-3"><h2 className="font-bold">Sincronizar com a música</h2>
    <p className="text-sm text-slate-400">Envie a gravação correspondente à letra. O áudio será ouvido no preview; o MP4 continuará sem áudio.</p>
    <fieldset disabled={busy || saving || active} className="space-y-3">
      <label><span className="label">Áudio de referência</span><select value={document.referenceAudio?.assetId ?? ''} onChange={event => { const asset = assets.find(item => item.id === event.target.value); if (asset) onAudio(asset); else onRemoveAudio(); }}><option value="">Sem áudio</option>{assets.filter(asset => asset.kind === 'audio').map(asset => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></label>
      <label><span className="label">Enviar MP3, WAV ou M4A · até 50 MB</span><input ref={input} type="file" accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4" onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); }} /></label>
      <button className="btn-secondary" disabled={dirty || !document.referenceAudio} onClick={() => void action('POST')}>Alinhar letra automaticamente</button>
    </fieldset>
    {dirty && <p className="text-sm text-amber-200">Salve o projeto antes de iniciar ou aplicar o alinhamento.</p>}
    {active && <div className="space-y-2"><p className="text-sm">{job.status === 'QUEUED' ? 'Na fila de processamento' : `Analisando áudio e letra · ${job.progress}%`}</p><progress className="w-full" max={100} value={job.progress} />{!job.workerOnline && <p className="text-sm text-amber-200">O serviço de alinhamento está indisponível no momento. A tarefa permanece na fila.</p>}<button className="btn-secondary" disabled={busy} onClick={() => void action('DELETE')}>Cancelar alinhamento</button></div>}
    {job?.status === 'FAILED' && <p role="alert" className="text-red-300">{job.error}</p>}
    {job?.status === 'COMPLETED' && <div className="space-y-3"><p className="text-emerald-300">Alinhamento concluído. Revise no preview após aplicar.</p>{warnings.length > 0 && <><p className="text-sm text-amber-200">{warnings.length} trecho(s) precisam de revisão; alguns tempos foram estimados entre palavras reconhecidas.</p><ul className="text-xs text-slate-400 list-disc pl-4">{warnings.slice(0, 5).map((warning, i) => <li key={i}>{warning}</li>)}</ul><label className="flex gap-2 items-center text-sm"><input type="checkbox" className="!w-auto" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />Vou conferir os trechos sinalizados</label></>}
      <button className="btn" disabled={dirty || saving || busy || (warnings.length > 0 && !reviewed)} onClick={() => void action('PUT')}>Aplicar tempos à timeline</button>
    </div>}
    {job?.status === 'APPLIED' && <p className="text-sm text-emerald-300">Tempos aplicados. Você pode refinar cada frase e palavra na timeline.</p>}
    {busy && <p className="text-sm text-slate-400">Processando solicitação...</p>}
  </section>;
}
