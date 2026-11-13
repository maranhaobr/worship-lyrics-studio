'use client';
import { useTranslation } from '@/components/preferences-provider';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SongInput } from '@wls/shared';
import { readResponse } from '@/hooks/use-visual-editor';
import { useToast } from './toast-provider';
import { usePermission } from './permissions-provider';
type ImportPreview = { song: SongInput; slides: number; emptySlides: number; warnings: string[] };

export function ProPresenterImporter() {
  const t = useTranslation();
  const [preview, setPreview] = useState<ImportPreview | null>(null), [busy, setBusy] = useState(false);
  const canEdit = usePermission('edit');
  const createdSong = useRef<string | null>(null);
  const notify = useToast(), router = useRouter();
  async function analyze(file: File) {
    setBusy(true); setPreview(null); createdSong.current = null;
    try {
      if (!/\.pro$/iu.test(file.name) || file.size > 5 * 1024 * 1024) throw new Error('Envie um arquivo .pro de até 5 MB.');
      const form = new FormData(); form.append('file', file);
      const result = await readResponse<ImportPreview>(await fetch('/api/songs/import/propresenter', { method: 'POST', body: form }));
      setPreview(result); notify('Apresentação lida. Confira os slides antes de importar.', 'info');
    } catch (error) { notify(error instanceof Error ? error.message : 'Falha ao ler o arquivo', 'error'); }
    finally { setBusy(false); }
  }
  async function save(visual: boolean) {
    if (!preview || busy) return;
    setBusy(true);
    try {
      if (!createdSong.current) { const song = await readResponse<{ id: string }>(await fetch('/api/songs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(preview.song) })); createdSong.current = song.id; }
      if (visual) {
        const project = await readResponse<{ id: string }>(await fetch('/api/visual-projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ songId: createdSong.current }) }));
        notify('Música importada e projeto visual criado.', 'success'); router.push(`/visual-projects/${project.id}`);
      } else { notify('Música importada para a biblioteca.', 'success'); router.push('/songs'); }
      router.refresh();
    } catch (error) { notify(error instanceof Error ? error.message : 'Falha ao importar', 'error'); setBusy(false); }
  }
  return <div className="space-y-5"><section className="card space-y-3"><label><span className="label">{t("Apresentação ProPresenter (.pro, até 5 MB)")}</span><input disabled={busy || !canEdit} type="file" accept=".pro" onChange={event => { const file = event.target.files?.[0]; if (file) void analyze(file); event.target.value = ''; }} /></label><p className="text-sm text-slate-400">{t("A leitura não altera o arquivo original. Confira a ordem dos slides e os avisos antes de salvar.")}</p>{busy && <p role="status">{t("Processando...")}</p>}</section>
    {preview && <><section className="card space-y-3"><h2 className="font-bold text-xl">{preview.song.title}</h2><p>{preview.slides}{t(" slides com letras · ")}{preview.song.sections.length}{t(" grupos")}</p><ul className="text-sm text-amber-200 list-disc pl-5 space-y-1">{preview.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul><div className="flex flex-wrap gap-3"><button className="btn" disabled={busy || !canEdit} onClick={() => void save(true)}>{t("Importar e abrir editor visual")}</button><button className="btn-secondary" disabled={busy || !canEdit} onClick={() => void save(false)}>{t("Importar na biblioteca")}</button></div></section>
    <div className="space-y-4">{preview.song.sections.map((section, index) => <section className="card space-y-3" key={index}><h3 className="font-bold">{section.label}</h3><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{section.lines.map((line, i) => <div className="rounded-lg bg-panel p-4" key={i}><p className="text-xs text-slate-400 mb-2">{t("Slide ")}{i + 1}</p><p className="whitespace-pre-line">{line.text}</p></div>)}</div></section>)}</div></>}
  </div>;
}
