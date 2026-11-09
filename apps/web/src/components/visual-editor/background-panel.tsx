'use client';
import { useRef, useState } from 'react';
import type { MediaView, VisualStyle } from '@wls/shared';
import { readResponse } from '@/hooks/use-visual-editor';
import { useToast } from '@/components/toast-provider';

async function videoDuration(file: File): Promise<number> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<number>((resolve, reject) => {
      const video = document.createElement('video');
      const timeout = window.setTimeout(() => { video.removeAttribute('src'); reject(new Error('Tempo esgotado ao abrir vídeo')); }, 15000);
      video.preload = 'metadata';
      video.onloadedmetadata = () => { window.clearTimeout(timeout); resolve(Math.round(video.duration * 1000)); video.removeAttribute('src'); };
      video.onerror = () => { window.clearTimeout(timeout); reject(new Error('O navegador não conseguiu abrir este vídeo')); };
      video.src = url;
    });
  } finally { URL.revokeObjectURL(url); }
}
export function BackgroundPanel({ style, assets, onChange, onUploaded, onError }: { style: VisualStyle; assets: MediaView[]; onChange: (style: VisualStyle) => void; onUploaded: (asset: MediaView) => void; onError: (message: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const notify = useToast();
  const input = useRef<HTMLInputElement>(null);
  const background = style.background;
  async function upload(file: File) {
    setUploading(true);
    try {
      if (file.size > 50 * 1024 * 1024) throw new Error('O arquivo deve ter até 50 MB');
      const form = new FormData(); form.append('file', file);
      if (file.type.startsWith('video/')) form.append('durationMs', String(await videoDuration(file)));
      const asset = await readResponse<MediaView>(await fetch('/api/media', { method: 'POST', body: form }));
      onUploaded(asset);
      notify('Fundo enviado', 'success');
    } catch (error) { onError(error instanceof Error ? error.message : 'Erro no upload'); }
    finally { setUploading(false); if (input.current) input.current.value = ''; }
  }
  return <section className="card space-y-3"><h2 className="font-bold">Fundo</h2>
    <label><span className="label">Tipo</span><select value={background.type} onChange={event => {
      if (event.target.value === 'gradient') onChange({ ...style, background: { type: 'gradient', from: '#0c1a35', to: '#183e62', angle: 135 } });
      else { const asset = assets.find(item => item.kind === event.target.value); if (asset && asset.kind !== 'audio') onChange({ ...style, background: { type: asset.kind, assetId: asset.id } }); else onError('Envie um arquivo desse tipo para usá-lo como fundo.'); }
    }}><option value="gradient">Gradiente</option><option value="image">Imagem</option><option value="video">Vídeo sem áudio</option></select></label>
    {background.type === 'gradient' ? <div className="grid grid-cols-2 gap-3">
      <label><span className="label">Cor inicial</span><input className="h-11 !p-1" type="color" value={background.from} onChange={event => onChange({ ...style, background: { ...background, from: event.target.value } })} /></label>
      <label><span className="label">Cor final</span><input className="h-11 !p-1" type="color" value={background.to} onChange={event => onChange({ ...style, background: { ...background, to: event.target.value } })} /></label>
      <label className="col-span-2"><span className="label">Ângulo: {background.angle}°</span><input type="range" min={0} max={360} value={background.angle} onChange={event => onChange({ ...style, background: { ...background, angle: Number(event.target.value) } })} /></label>
    </div> : <label><span className="label">Arquivo</span><select value={background.assetId} onChange={event => onChange({ ...style, background: { ...background, assetId: event.target.value } })}>{assets.filter(asset => asset.kind === background.type).map(asset => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></label>}
    <label><span className="label">Escurecimento: {Math.round(style.overlay * 100)}%</span><input type="range" min={0} max={0.9} step={0.05} value={style.overlay} onChange={event => onChange({ ...style, overlay: Number(event.target.value) })} /></label>
    <label><span className="label">Enviar imagem ou vídeo · até 50 MB</span><input ref={input} type="file" disabled={uploading} accept="image/png,image/jpeg,image/webp,video/mp4,video/webm" onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); }} /></label>
    {uploading && <p role="status" className="text-sm text-slate-400">Enviando arquivo...</p>}
  </section>;
}
