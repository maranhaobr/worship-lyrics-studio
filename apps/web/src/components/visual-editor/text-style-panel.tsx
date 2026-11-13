'use client';
import { useTranslation } from '@/components/preferences-provider';
import { fontFamilies, type VisualStyle } from '@wls/shared';
export function TextStylePanel({ style, onChange }: { style: VisualStyle; onChange: (style: VisualStyle) => void }) {
  const t = useTranslation();
  const text = style.text;
  const update = (patch: Partial<VisualStyle['text']>) => onChange({ ...style, text: { ...text, ...patch } });
  return <section className="card space-y-3"><h2 className="font-bold">{t("Texto")}</h2>
    <label><span className="label">{t("Fonte")}</span><select value={text.fontFamily} onChange={event => update({ fontFamily: event.target.value as typeof text.fontFamily })}>{fontFamilies.map(font => <option key={font}>{font}</option>)}</select></label>
    <label><span className="label">{t("Tamanho: ")}{text.fontSize}{"px"}</span><input type="range" min={24} max={240} value={text.fontSize} onChange={event => update({ fontSize: Number(event.target.value) })} /></label>
    <label><span className="label">{t("Peso")}</span><select value={text.fontWeight ?? "700"} onChange={event => update({ fontWeight: event.target.value as typeof text.fontWeight })}><option value="400">{t("Regular")}</option><option value="600">{t("Semibold")}</option><option value="700">{t("Bold")}</option><option value="900">{t("Extra forte")}</option></select></label>
    <div className="flex gap-4"><label className="flex items-center gap-2 text-sm"><input className="!w-auto" type="checkbox" checked={text.uppercase ?? false} onChange={event => update({ uppercase: event.target.checked })} />{t("CAIXA ALTA")}</label><label className="flex items-center gap-2 text-sm"><input className="!w-auto" type="checkbox" checked={text.italic ?? false} onChange={event => update({ italic: event.target.checked })} />{t("Itálico")}</label></div>
    <label><span className="label">{t("Cor do texto")}</span><input className="h-11 !p-1" type="color" value={text.color} onChange={event => onChange({ ...style, text: { ...text, color: event.target.value } })} /></label>
    <div className="grid grid-cols-2 gap-3"><label><span className="label">{t("Alinhamento")}</span><select value={text.align} onChange={event => onChange({ ...style, text: { ...text, align: event.target.value as typeof text.align } })}><option value="left">{t("Esquerda")}</option><option value="center">{t("Centro")}</option><option value="right">{t("Direita")}</option></select></label>
      <label><span className="label">{t("Posição")}</span><select value={text.position} onChange={event => onChange({ ...style, text: { ...text, position: event.target.value as typeof text.position } })}><option value="top">{t("Topo")}</option><option value="center">{t("Centro")}</option><option value="bottom">{t("Base")}</option></select></label></div>
    {([
      ['letterSpacing', 'Espaçamento entre letras', -5, 30, .5, 0],
      ['lineHeight', 'Altura da linha', .8, 2, .05, 1.3],
      ['widthPercent', 'Largura do texto (%)', 20, 100, 1, 100],
      ['offsetX', 'Deslocamento horizontal (%)', -35, 35, 1, 0],
      ['offsetY', 'Deslocamento vertical (%)', -35, 35, 1, 0],
      ['strokeWidth', 'Contorno (px)', 0, 6, .5, 0],
    ] as const).map(([key, label, min, max, step, fallback]) => <label key={key}><span className="label">{t(label)}: {text[key] ?? fallback}</span><input type="range" min={min} max={max} step={step} value={text[key] ?? fallback} onChange={event => update({ [key]: Number(event.target.value) })} /></label>)}
    <label><span className="label">{t("Cor do contorno")}</span><input type="color" className="h-11 !p-1" value={text.strokeColor ?? "#000000"} onChange={event => update({ strokeColor: event.target.value })} /></label>
    <label><span className="label">{t("Sombra e brilho")}</span><select value={text.shadow ?? "soft"} onChange={event => update({ shadow: event.target.value as typeof text.shadow })}><option value="none">{t("Sem sombra")}</option><option value="soft">{t("Sombra suave")}</option><option value="strong">{t("Sombra forte")}</option><option value="glow">{t("Brilho")}</option></select></label>
    <label><span className="label">{t("Faixa atrás do texto")}</span><select value={text.plate ?? "none"} onChange={event => update({ plate: event.target.value as typeof text.plate })}><option value="none">{t("Sem faixa")}</option><option value="dark">{t("Escura")}</option><option value="light">{t("Clara")}</option></select></label>
    <p className="text-xs text-slate-400">{t("Oswald, Montserrat, Playfair Display e Dancing Script acompanham o vídeo. Confira frases longas e deslocamentos no preview para evitar cortes.")}</p>
  </section>;
}
