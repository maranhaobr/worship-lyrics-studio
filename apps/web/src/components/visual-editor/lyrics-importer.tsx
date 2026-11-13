'use client';
import { useTranslation } from '@/components/preferences-provider';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { lyricsImportSchema, projectFromLyrics, type LyricsImportInput, type TemplatePreset } from '@wls/shared';
import { readResponse } from '@/hooks/use-visual-editor';
import { useToastFeedback } from '@/components/toast-provider';

export function LyricsImporter({ templates }: { templates: TemplatePreset[] }) {
  const t = useTranslation();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? 'builtin-atmospheric');
  const [pace, setPace] = useState<LyricsImportInput['pace']>('balanced');
  const [varyEffects, setVaryEffects] = useState(true);
  const [busy, setBusy] = useState(false), [reading, setReading] = useState(false);
  const { setError, setMessage } = useToastFeedback();
  const preview = useMemo(() => {
    if (!lyrics.trim()) return null;
    try {
      let index = 0;
      return { document: projectFromLyrics({ title: title || 'Prévia', lyrics, templateId, pace, varyEffects }, () => `preview-${++index}`, templates.find(template => template.id === templateId)?.style), error: '' };
    } catch { return { document: null, error: 'Não foi possível organizar esta letra. Use frases menores e uma duração total de até uma hora.' }; }
  }, [lyrics, title, templateId, pace, varyEffects, templates]);
  async function readFile(file: File) {
    setError(''); setReading(true);
    try {
      if (!file.name.toLowerCase().endsWith('.txt') || file.size > 400_000) throw new Error('Envie um arquivo .txt de até 400 KB, salvo em UTF-8.');
      const text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
      if (text.length > 100_000) throw new Error('A letra deve ter até 100 mil caracteres.');
      setLyrics(text); if (!title.trim()) setTitle(file.name.replace(/\.txt$/iu, '').slice(0, 200));
      setMessage('Letra importada');
    } catch (error) { setError(error instanceof TypeError ? 'Salve o arquivo de texto com codificação UTF-8 e tente novamente.' : error instanceof Error ? error.message : 'Erro ao ler arquivo'); }
    finally { setReading(false); }
  }
  async function create(render: boolean) {
    const parsed = lyricsImportSchema.safeParse({ title, lyrics, templateId, pace, varyEffects });
    if (!parsed.success) { setError('Preencha o título e a letra completa para continuar.'); return; }
    setBusy(true); setError('');
    try {
      const project = await readResponse<{ id: string }>(await fetch('/api/visual-projects/from-lyrics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data) }));
      setMessage('Projeto criado com a letra completa'); router.push(`/visual-projects/${project.id}${render ? '?export=1' : ''}`);
    } catch (error) { setError(error instanceof Error ? error.message : 'Erro ao preparar vídeo'); setBusy(false); }
  }
  return <form className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start" onSubmit={event => { event.preventDefault(); void create(true); }}>
    <fieldset disabled={busy || reading} className="card space-y-4 min-w-0"><label><span className="label">{t("Título do vídeo")}</span><input value={title} maxLength={200} required onChange={event => setTitle(event.target.value)} placeholder={t("Ex.: Santo para sempre")} /></label>
      <label><span className="label">{t("Enviar a letra completa (.txt, UTF-8)")}</span><input type="file" accept=".txt,text/plain" onChange={event => { const file = event.target.files?.[0]; if (file) void readFile(file); event.target.value = ''; }} /></label>
      <label><span className="label">{t("Ou cole a letra aqui")}</span><textarea rows={16} maxLength={100_000} required value={lyrics} onChange={event => setLyrics(event.target.value)} placeholder={'[Verso 1]\nPrimeira frase da música\nSegunda frase da música\n\n[Refrão]\nFrase do refrão'} /></label>
      <p className="text-sm text-slate-400">{t("Cada linha vira um slide. Frases longas são divididas automaticamente. Linhas em branco separam partes; títulos como [Refrão] organizam as seções.")}</p>
    </fieldset>
    <fieldset disabled={busy || reading} className="card space-y-4"><h2 className="font-bold text-lg">{t("Da letra ao vídeo completo")}</h2>
      <label><span className="label">{t("Visual inicial")}</span><select value={templateId} onChange={event => setTemplateId(event.target.value)}>{templates.map(template => <option key={template.id} value={template.id}>{template.id.startsWith('builtin-') ? t(template.name) : template.name}</option>)}</select></label>
      <label><span className="label">{t("Ritmo dos slides")}</span><select value={pace} onChange={event => setPace(event.target.value as typeof pace)}><option value="slow">{t("Mais pausado")}</option><option value="balanced">{t("Equilibrado")}</option><option value="fast">{t("Mais rápido")}</option></select></label>
      <label className="flex items-center gap-3 text-sm"><input className="!w-auto" type="checkbox" checked={varyEffects} onChange={event => setVaryEffects(event.target.checked)} />{t("Variar efeitos entre as frases")}</label>
      {preview?.document && <p role="status" className="rounded-lg bg-panel p-3 text-sm">{preview.document.clips.length}{t(" slides · duração estimada ")}{(preview.document.durationMs / 60000).toFixed(1)}{" min"}</p>}
      <p className="text-sm text-slate-400">{t("O vídeo fica pronto em MP4 sem áudio. Os tempos são estimados pela letra; não são sincronizados automaticamente com uma gravação.")}</p>
      {preview?.error && <p role="alert" className="text-red-300 text-sm">{preview.error}</p>}
      <button className="btn w-full" disabled={!lyrics.trim() || Boolean(preview?.error)} type="submit">{busy ? t("Preparando vídeo...") : t("Gerar vídeo completo")}</button>
      <button className="btn-secondary w-full" disabled={!lyrics.trim() || Boolean(preview?.error)} type="button" onClick={() => void create(false)}>{t("Revisar slides antes de gerar")}</button>
      <p className="text-xs text-slate-400">{t("Você poderá editar cada frase, trocar fundos e efeitos e gerar novas versões a qualquer momento.")}</p>
    </fieldset>
  </form>;
}
