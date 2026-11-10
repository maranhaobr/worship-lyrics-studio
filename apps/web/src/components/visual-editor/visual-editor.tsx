'use client';
import { usePermission } from '@/components/permissions-provider';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { PlayerRef } from '@remotion/player';
import { distributeWords, durationInFrames, msToFrame, projectFromSong, resolveClipStyle, type MediaView, type ProjectView, type SongInput, type TemplatePreset, type VisualStyle } from '@wls/shared';
import { useVisualEditor } from '@/hooks/use-visual-editor';
import { useEditorPlayback } from '@/hooks/use-editor-playback';
import { PreviewPlayer } from './preview-player';
import { TemplatePicker } from './template-picker';
import { BackgroundPanel } from './background-panel';
import { TextStylePanel } from './text-style-panel';
import { ThemePanel } from './theme-panel';
import { AnimationPanel } from './animation-panel';
import { Timeline } from './timeline/timeline';
import { ClipPanel } from './clip-panel';
import { SlideNavigator } from './slide-navigator';
import { ExportPanel } from './export-panel';
import { AlignmentPanel } from './alignment-panel';
import { EditorTabs } from './editor-tabs';
import { ProPresenterExportButton } from '@/components/propresenter-export-button';

const inspectorTabs = [{ id: 'templates', label: 'Templates' }, { id: 'background', label: 'Fundo' }, { id: 'theme', label: 'Tema' }, { id: 'text', label: 'Texto' }, { id: 'animation', label: 'Animação' }] as const;
const workspaceTabs = [{ id: 'timeline', label: 'Slides e timeline' }, { id: 'audio', label: 'Áudio e sincronização' }, { id: 'export', label: 'Exportar e arquivo' }] as const;

export default function VisualEditor({ project, initialTemplates, initialAssets, sourceSong, autoExport = false }: { project: ProjectView; initialTemplates: TemplatePreset[]; initialAssets: MediaView[]; sourceSong: SongInput | null; autoExport?: boolean }) {
  const canEdit=usePermission('edit');
  const editor = useVisualEditor(project);
  const { document, change } = editor;
  const [templates, setTemplates] = useState(initialTemplates);
  const [assets, setAssets] = useState(initialAssets);
  const [selectedId, setSelectedId] = useState<string | null>(document.clips[0]?.id ?? null);
  const [styleScope, setStyleScope] = useState<'video' | 'slide'>('slide');
  const [applyingAlignment, setApplyingAlignment] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<typeof inspectorTabs[number]['id']>('templates');
  const [workspaceTab, setWorkspaceTab] = useState<typeof workspaceTabs[number]['id']>(autoExport ? 'export' : 'timeline');
  const inspectorScroll = useRef<HTMLDivElement>(null);
  const workspaceScroll = useRef<HTMLDivElement>(null);
  useEffect(() => { if (inspectorScroll.current) inspectorScroll.current.scrollTop = 0; }, [inspectorTab]);
  useEffect(() => { if (workspaceScroll.current) workspaceScroll.current.scrollTop = 0; }, [workspaceTab]);
  const editingLocked = editor.saving || !canEdit || applyingAlignment;
  const clock = useEditorPlayback(document.fps);
  const playerRef = useRef<PlayerRef>(null);
  const pendingSeek = useRef<number | null>(null);
  useEffect(() => {
    if (pendingSeek.current === null) return;
    playerRef.current?.pause();
    playerRef.current?.seekTo(Math.min(durationInFrames(document) - 1, msToFrame(pendingSeek.current, document.fps)));
    pendingSeek.current = null;
  }, [document]);
  const selected = document.clips.find(clip => clip.id === selectedId);
  const targetId = styleScope === 'slide' ? selected?.id : undefined;
  const activeStyle = targetId ? resolveClipStyle(document.style, selected) : document.style;
  function seek(ms: number) { playerRef.current?.pause(); playerRef.current?.seekTo(Math.max(0, Math.min(durationInFrames(document) - 1, msToFrame(ms, document.fps)))); }
  function selectSlide(id: string) { setSelectedId(id); const clip = document.clips.find(item => item.id === id); if (clip) seek(clip.startMs + Math.min(800, (clip.endMs - clip.startMs) / 2)); }
  function styleChanged(style: VisualStyle) {
    if (!targetId) { change(current => ({ ...current, style })); return; }
    const patch: Partial<VisualStyle> = {};
    for (const key of Object.keys(style) as (keyof VisualStyle)[]) {
      if (JSON.stringify(style[key]) !== JSON.stringify(activeStyle[key])) Object.assign(patch, { [key]: style[key] });
    }
    change(current => ({ ...current, clips: current.clips.map(clip => clip.id === targetId ? { ...clip, style: { ...clip.style, ...patch } } : clip) }));
  }
  function append(repeat = false) {
    const startMs = document.clips.at(-1)?.endMs ?? 0;
    const length = repeat && selected ? selected.endMs - selected.startMs : 4000;
    const text = repeat && selected ? selected.text : 'Nova linha';
    const clip = { id: crypto.randomUUID(), section: repeat && selected ? selected.section : 'Personalizado', text, startMs, endMs: startMs + length, words: repeat && selected ? structuredClone(selected.words) : distributeWords(text, length), ...(repeat && selected?.style ? { style: structuredClone(selected.style) } : {}) };
    if (change({ ...document, durationMs: Math.max(document.durationMs, clip.endMs), clips: [...document.clips, clip] })) { setSelectedId(clip.id); pendingSeek.current = clip.startMs; }
  }
  function download() {
    const blob = new Blob([JSON.stringify({ document, media: Object.fromEntries(assets.map(asset => [asset.id, { src: `${window.location.origin}/api/media/${asset.id}/content`, durationMs: asset.durationMs }])) }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const link = window.document.createElement('a'); link.href = url; link.download = `worship-${project.id}.json`; link.click(); URL.revokeObjectURL(url);
  }
  return <div className="editor-workspace min-w-0 flex flex-col gap-3">
    <header className="flex items-center justify-between flex-wrap sm:flex-nowrap gap-x-4 gap-y-2 min-w-0">
      <div className="flex-1 min-w-0"><div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400"><Link href="/visual-projects" className="hover:text-white">← Projetos visuais</Link><h1 className="text-xs">Editor Visual 2.0</h1><p>{editor.dirty ? 'Alterações não salvas' : 'Projeto salvo'} · revisão {editor.revision}</p></div>
        <label className="block mt-1 max-w-xl"><span className="sr-only">Nome do projeto</span><input className="!py-1.5 !px-2 text-base font-semibold !bg-transparent !border-transparent hover:!border-slate-700 focus:!border-accent" value={editor.name} maxLength={200} disabled={editingLocked} onChange={event => editor.setName(event.target.value)} /></label>
      </div>
      <div className="flex gap-2 shrink-0"><button className="btn-secondary !py-2 !px-3 text-sm" disabled={editingLocked || !editor.canUndo} onClick={editor.undo}>Desfazer</button><button className="btn-secondary !py-2 !px-3 text-sm" disabled={editingLocked || !editor.canRedo} onClick={editor.redo}>Refazer</button><button className="btn !py-2 !px-3 text-sm" disabled={editingLocked || !editor.dirty} onClick={editor.save}>{editor.saving ? 'Salvando...' : 'Salvar projeto'}</button></div>
    </header>
    <div className="editor-columns grid lg:grid-cols-[minmax(0,1fr)_340px] gap-4 min-h-0 flex-1">
      <div className="flex flex-col gap-3 min-w-0 min-h-0"><div data-editor-preview className="editor-preview shrink-0 w-full mx-auto"><PreviewPlayer document={document} assets={assets} playerRef={playerRef} onFrame={clock.reportFrame} /></div>
        <EditorTabs id="workspace" label="Ferramentas do projeto" tabs={workspaceTabs} value={workspaceTab} onChange={setWorkspaceTab} />
        <div ref={workspaceScroll} data-workspace-scroll className="editor-scroll min-h-0 min-w-0 flex-1 space-y-3">
        <div hidden={workspaceTab !== 'audio'} role="tabpanel" id="workspace-panel-audio" aria-labelledby="workspace-tab-audio">
        <AlignmentPanel projectId={project.id} revision={editor.revision} dirty={editor.dirty} saving={editingLocked} document={document} assets={assets} onApplying={setApplyingAlignment}
          onAudio={asset => { setAssets(items => [asset, ...items.filter(item => item.id !== asset.id)]); change(current => ({ ...current, referenceAudio: { assetId: asset.id }, durationMs: Math.max(current.durationMs, asset.durationMs ?? 0) })); }}
          onRemoveAudio={() => change(current => ({ ...current, referenceAudio: undefined }))}
          onApplied={project => { editor.acceptSaved(project); pendingSeek.current = project.document.clips[0]?.startMs ?? 0; }} /></div>
        <div hidden={workspaceTab !== 'timeline'} role="tabpanel" id="workspace-panel-timeline" aria-labelledby="workspace-tab-timeline"><fieldset disabled={editingLocked} className="min-w-0 space-y-4">
          <SlideNavigator document={document} selectedId={selectedId} onSelect={selectSlide} />
          <Timeline document={document} clock={clock} selectedId={selectedId} onSelect={selectSlide} onSeek={seek} onChange={change} />
          <div className="card flex items-end gap-4 flex-wrap"><button className="btn-secondary" onClick={() => append()}>Adicionar bloco</button>
            <label><span className="label">Duração total (s)</span><input key={document.durationMs} className="!w-40" type="number" min={0.1} max={3600} step={0.1} defaultValue={document.durationMs / 1000} onBlur={event => { const durationMs = Math.round(Number(event.target.value) * 1000); if (durationMs !== document.durationMs && !change({ ...document, durationMs })) event.target.value = String(document.durationMs / 1000); }} /></label>
          </div>
          {selected && <ClipPanel key={JSON.stringify(selected)} clip={selected} onError={editor.setError} onSave={clip => change({ ...document, clips: document.clips.map(item => item.id === clip.id ? clip : item) })} onRepeat={() => append(true)} onDelete={() => { if (change({ ...document, clips: document.clips.filter(item => item.id !== selected.id) })) setSelectedId(null); }} />}
        </fieldset></div>
        <div hidden={workspaceTab !== 'export'} role="tabpanel" id="workspace-panel-export" aria-labelledby="workspace-tab-export" className="space-y-3">
        <ExportPanel projectId={project.id} document={document} autoExport={autoExport} />
        <section className="card space-y-3"><h2 className="font-bold">ProPresenter</h2><p className="text-sm text-slate-400">Exporte os slides atuais como letras editáveis e grupos. O arquivo .pro usa um visual básico; fundos, efeitos e tempos sincronizados não são transferidos. Para reproduzir o visual completo no ProPresenter, use o MP4.</p><ProPresenterExportButton projectId={project.id} document={document} /></section>
        <details className="card"><summary className="cursor-pointer text-sm">Arquivo do projeto</summary><button className="btn-secondary mt-3" onClick={download}>Baixar projeto editável (JSON)</button></details>
        {sourceSong && <section className="card space-y-3"><h2 className="font-bold">Letra de origem</h2><p className="text-sm text-slate-400">O projeto tem uma cópia independente da letra. Reimportar substitui todos os blocos e tempos pela versão da música carregada nesta página.</p><button disabled={editingLocked} className="btn-secondary" onClick={() => { if (confirm('Substituir todos os blocos e tempos pela letra de origem? Esta ação pode ser desfeita.')) { const next = projectFromSong(sourceSong, () => crypto.randomUUID()); if (change({ ...next, style: document.style })) { setSelectedId(null); seek(0); } } }}>Reimportar letra</button></section>}
        </div></div>
      </div>
      <div className="flex flex-col gap-3 min-h-0 min-w-0"><EditorTabs id="inspector" label="Configurações visuais" tabs={inspectorTabs} value={inspectorTab} onChange={setInspectorTab} />
      <div ref={inspectorScroll} data-inspector-scroll className="editor-scroll min-h-0 flex-1"><fieldset disabled={editingLocked} className="space-y-3 min-w-0">
        <section className="card space-y-3"><label><span className="label">Aplicar alterações a</span><select value={selected ? styleScope : 'video'} onChange={event => setStyleScope(event.target.value as 'video' | 'slide')}><option value="video">Visual padrão do vídeo</option><option value="slide" disabled={!selected}>Slide {selected ? document.clips.indexOf(selected) + 1 : ''} selecionado</option></select></label>
          <p className="text-xs text-slate-400">{targetId ? 'Fundo, texto e efeito serão alterados apenas neste slide.' : 'Slides com visual próprio mantêm suas personalizações.'}</p>
          {targetId && selected?.style && <button className="btn-secondary text-sm" onClick={() => change(current => ({ ...current, clips: current.clips.map(clip => clip.id === targetId ? { ...clip, style: undefined } : clip) }))}>Usar visual padrão neste slide</button>}
        </section>
        <div hidden={inspectorTab !== 'templates'} role="tabpanel" id="inspector-panel-templates" aria-labelledby="inspector-tab-templates"><TemplatePicker templates={templates} style={activeStyle} onApply={styleChanged} onError={editor.setError} onSaved={template => { setTemplates(items => [...items, template]); editor.setMessage('Template salvo'); }} /></div>
        <div hidden={inspectorTab !== 'background'} role="tabpanel" id="inspector-panel-background" aria-labelledby="inspector-tab-background"><BackgroundPanel style={activeStyle} assets={assets} onChange={styleChanged} onUploaded={asset => { if (asset.kind === 'audio') { editor.setError('Selecione imagem ou vídeo como fundo'); return; } const kind = asset.kind; setAssets(items => [asset, ...items]); change(current => targetId ? { ...current, clips: current.clips.map(clip => clip.id === targetId ? { ...clip, style: { ...clip.style, background: { type: kind, assetId: asset.id } } } : clip) } : { ...current, style: { ...current.style, background: { type: kind, assetId: asset.id } } }); }} onError={editor.setError} /></div>
        <div hidden={inspectorTab !== 'theme'} role="tabpanel" id="inspector-panel-theme" aria-labelledby="inspector-tab-theme"><ThemePanel style={activeStyle} onChange={styleChanged} /></div>
        <div hidden={inspectorTab !== 'text'} role="tabpanel" id="inspector-panel-text" aria-labelledby="inspector-tab-text"><TextStylePanel style={activeStyle} onChange={styleChanged} /></div>
        <div hidden={inspectorTab !== 'animation'} role="tabpanel" id="inspector-panel-animation" aria-labelledby="inspector-tab-animation"><AnimationPanel style={activeStyle} onChange={styleChanged} /></div>
      </fieldset></div></div>
    </div>
  </div>;
}
