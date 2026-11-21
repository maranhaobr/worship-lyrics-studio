'use client';
import { useEffect, useState } from 'react';
import { defaultWordEmphasis, fontFamilies, type VisualStyle } from '@wls/shared';
import { useTranslation } from '@/components/preferences-provider';

type Emphasis = NonNullable<VisualStyle['text']['emphasis']>;
export function WordEmphasisPanel({ value, onChange }: { value: Emphasis | undefined; onChange: (value: Emphasis) => void }) {
  const t = useTranslation();
  const settings = value ?? defaultWordEmphasis;
  const canonical = settings.words.join(', ');
  const [raw, setRaw] = useState(canonical);
  useEffect(() => { setRaw(current => current.split(/[,;\s]+/u).filter(Boolean).join(', ') === canonical ? current : canonical); }, [canonical]);
  const words = raw.split(/[,;\s]+/u).filter(Boolean);
  const invalid = words.length > 30 || words.some(word => word.length > 40);
  const update = (patch: Partial<Emphasis>) => onChange({ ...settings, ...patch });
  return <fieldset className="space-y-3 border-t border-slate-700 pt-4">
    <legend className="font-bold">{t('Palavras em destaque')}</legend>
    <label className="flex items-center gap-2 text-sm"><input className="!w-auto" type="checkbox" checked={value?.enabled ?? false} onChange={event => update({ enabled: event.target.checked })} />{t('Ativar destaque de palavras')}</label>
    {value?.enabled && <>
      <label><span className="label">{t('Palavras separadas por vírgula')}</span><input value={raw} aria-invalid={invalid} onChange={event => {
        const next = event.target.value; setRaw(next);
        const parsed = next.split(/[,;\s]+/u).filter(Boolean);
        if (parsed.length <= 30 && parsed.every(word => word.length <= 40)) update({ words: parsed });
      }} /></label>
      {invalid && <p role="alert" className="text-sm text-red-400">{t('Use até 30 palavras, com até 40 caracteres cada.')}</p>}
      <label><span className="label">{t('Fonte do destaque')}</span><select value={settings.fontFamily} onChange={event => update({ fontFamily: event.target.value as Emphasis['fontFamily'] })}>{fontFamilies.map(font => <option key={font}>{font}</option>)}</select></label>
      <label><span className="label">{t('Peso')}</span><select value={settings.fontWeight} onChange={event => update({ fontWeight: event.target.value as Emphasis['fontWeight'] })}>{(['400', '600', '700', '900'] as const).map(weight => <option key={weight}>{weight}</option>)}</select></label>
      <label><span className="label">{t('Cor do destaque')}</span><input type="color" className="h-11 !p-1" value={settings.color} onChange={event => update({ color: event.target.value })} /></label>
      <label><span className="label">{t('Tamanho relativo')}: {settings.sizeScale.toFixed(2)}×</span><input type="range" min={.75} max={2.5} step={.05} value={settings.sizeScale} onChange={event => update({ sizeScale: Number(event.target.value) })} /></label>
      <label><span className="label">{t('Posição do destaque')}</span><select value={settings.placement} onChange={event => update({ placement: event.target.value as Emphasis['placement'] })}><option value="inline">{t('Na frase')}</option><option value="line">{t('Em linha própria')}</option></select></label>
      <label className="flex items-center gap-2 text-sm"><input className="!w-auto" type="checkbox" checked={settings.uppercase} onChange={event => update({ uppercase: event.target.checked })} />{t('CAIXA ALTA')}</label>
      <label><span className="label">{t('Animação do destaque')}</span><select value={settings.animation} onChange={event => update({ animation: event.target.value as Emphasis['animation'] })}><option value="none">{t('Sem animação')}</option><option value="pop">{t('Pulso na entrada da palavra')}</option><option value="beat">{t('Pulso no BPM')}</option></select></label>
      <p className="text-xs text-slate-400">{t('O pulso no BPM usa o tempo manual em Tema; não detecta as batidas do áudio automaticamente.')}</p>
    </>}
  </fieldset>;
}
