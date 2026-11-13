'use client';
import { useTranslation } from '@/components/preferences-provider';
import { resolveClipStyle, type VisualProjectDocument } from '@wls/shared';
export function SlideNavigator({ document, selectedId, onSelect }: { document: VisualProjectDocument; selectedId: string | null; onSelect: (id: string) => void }) {
  const t = useTranslation();
  const index = document.clips.findIndex(clip => clip.id === selectedId);
  return <section className="card space-y-3 min-w-0"><div className="flex justify-between items-center gap-2 flex-wrap"><h2 className="font-bold">{t("Slides · ")}{document.clips.length}</h2><div className="flex gap-2"><button className="btn-secondary" disabled={index <= 0} onClick={() => onSelect(document.clips[index - 1].id)}>{t("← Anterior")}</button><button className="btn-secondary" disabled={index >= document.clips.length - 1} onClick={() => onSelect(document.clips[index + 1].id)}>{t("Próximo →")}</button></div></div>
    <div className="flex gap-3 overflow-x-auto pb-2">{document.clips.map((clip, index) => {
      const style = resolveClipStyle(document.style, clip), background = style.background;
      return <button key={clip.id} aria-pressed={selectedId === clip.id} className={`studio-slide-thumb shrink-0 w-44 rounded-xl border-2 overflow-hidden text-left ${selectedId === clip.id ? 'border-accent' : 'border-slate-700'}`} onClick={() => onSelect(clip.id)}>
        <div className="flex items-center justify-center p-3 text-xs text-center font-bold" style={{ aspectRatio: `${document.width} / ${document.height}`, color: style.text.color, backgroundColor: '#111827', backgroundImage: background.type === 'gradient' ? `linear-gradient(${background.angle}deg,${background.from},${background.to})` : background.type === 'image' ? `linear-gradient(#0007,#0007),url(/api/media/${background.assetId}/content)` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}><span className="line-clamp-3">{clip.text}</span></div>
        <div className="p-2 text-xs bg-surface"><strong>{t("Slide ")}{index + 1}</strong><span className="float-right text-slate-400">{((clip.endMs - clip.startMs) / 1000).toFixed(1)}{"s"}</span><p className="text-slate-400 truncate mt-1">{clip.section} · {style.animation.type}</p></div>
      </button>;
    })}</div>
  </section>;
}
