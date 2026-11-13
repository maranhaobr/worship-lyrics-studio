'use client';
import { useTranslation } from '@/components/preferences-provider';
import { useState } from 'react';
import { resolutionPresets, videoResolutionSchema } from '@wls/shared';

type Size = { width: number; height: number };
export function ResolutionPanel({ size, disabled, onChange }: { size: Size; disabled: boolean; onChange: (size: Size) => void }) {
  const t = useTranslation();
  const preset = resolutionPresets.find(item => item.width === size.width && item.height === size.height);
  const [custom, setCustom] = useState(!preset);
  const [width, setWidth] = useState(String(size.width)), [height, setHeight] = useState(String(size.height));
  const [error, setError] = useState('');
  function apply() {
    const parsed = videoResolutionSchema.safeParse({ width: Number(width), height: Number(height) });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Resolução inválida'); return; }
    setError(''); onChange(parsed.data);
  }
  return <fieldset disabled={disabled} className="card space-y-3 min-w-0"><legend className="sr-only">{t("Resolução do vídeo")}</legend>
    <h2 className="font-bold">{t("Resolução do vídeo")}</h2>
    <label><span className="label">{t("Tamanho de saída")}</span><select value={custom ? "custom" : preset?.id ?? "custom"} onChange={event => {
      setError('');
      if (event.target.value === 'custom') { setCustom(true); setWidth(String(size.width)); setHeight(String(size.height)); return; }
      const next = resolutionPresets.find(item => item.id === event.target.value);
      if (next) { setCustom(false); onChange({ width: next.width, height: next.height }); }
    }}>{resolutionPresets.map(item => <option key={item.id} value={item.id}>{t(item.label)} · {item.width}{t(" × ")}{item.height}</option>)}<option value="custom">{t("Personalizado")}</option></select></label>
    {custom && <><div className="grid grid-cols-2 gap-3"><label><span className="label">{t("Largura (px)")}</span><input type="number" min={256} max={4096} step={2} value={width} onChange={event => setWidth(event.target.value)} /></label><label><span className="label">{t("Altura (px)")}</span><input type="number" min={256} max={4096} step={2} value={height} onChange={event => setHeight(event.target.value)} /></label></div>
      <button type="button" className="btn-secondary" onClick={apply}>{t("Aplicar resolução")}</button><p className="text-xs text-slate-400">{t("Use dimensões pares entre 256 e 4096 px, com até 8.294.400 pixels no total.")}</p></>}
    {error && <p role="alert" className="text-sm text-red-300">{t(error)}</p>}
    <p className="text-sm text-slate-400">{t("Saída atual: ")}{size.width}{t(" × ")}{size.height}{t(" px. Aplica-se ao vídeo inteiro. Confira as quebras de linha ao mudar o formato.")}</p>
  </fieldset>;
}
