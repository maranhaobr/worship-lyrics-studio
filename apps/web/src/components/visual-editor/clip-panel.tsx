'use client';
import { useTranslation } from '@/components/preferences-provider';
import { useEffect, useRef, useState } from 'react';
import { distributeWords, getSectionHeading, resizeClip, type LyricClip } from '@wls/shared';

export type ClipDraft = { dirty: boolean; commit: () => boolean };
export function ClipPanel({ clip, onSave, onRepeat, onDelete, onError, onDraft }: { clip: LyricClip; onSave: (clip: LyricClip) => boolean; onRepeat: () => void; onDelete: () => void; onError: (message: string) => void; onDraft: (draft: ClipDraft | null) => void }) {
  const t = useTranslation();
  const [text, setText] = useState(clip.text);
  const [section, setSection] = useState(clip.section);
  const [start, setStart] = useState(String(clip.startMs / 1000));
  const [end, setEnd] = useState(String(clip.endMs / 1000));
  const [words, setWords] = useState(clip.words);
  const previous = useRef(clip);
  useEffect(() => {
    const before = previous.current;
    // Merge external visual/timeline changes without destroying text being typed.
    setText(value => value === before.text ? clip.text : value);
    setSection(value => value === before.section ? clip.section : value);
    setStart(value => value === String(before.startMs / 1000) ? String(clip.startMs / 1000) : value);
    setEnd(value => value === String(before.endMs / 1000) ? String(clip.endMs / 1000) : value);
    setWords(value => JSON.stringify(value) === JSON.stringify(before.words) ? clip.words : value);
    previous.current = clip;
  }, [clip]);
  function commit() {
    const startMs = Math.round(Number(start) * 1000), endMs = Math.round(Number(end) * 1000);
    if (!text.trim() || !start || !end || !Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) { onError('Preencha uma letra e um intervalo válido'); return false; }
    const normalized = text.trim();
    const next = resizeClip({ ...clip, words }, startMs, endMs);
    const updated = { ...next, text: normalized, section, words: normalized !== clip.text ? distributeWords(normalized, endMs - startMs) : next.words };
    const accepted = onSave(updated);
    if (accepted) { setText(updated.text); setStart(String(updated.startMs / 1000)); setEnd(String(updated.endMs / 1000)); setWords(updated.words); }
    return accepted;
  }
  useEffect(() => {
    const dirty = text !== clip.text || section !== clip.section || start !== String(clip.startMs / 1000) || end !== String(clip.endMs / 1000) || JSON.stringify(words) !== JSON.stringify(clip.words);
    onDraft({ dirty, commit });
    // Publish only when form values change; callbacks read the current render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, section, start, end, words, clip, onDraft]);
  useEffect(() => () => onDraft(null), [onDraft]);
  function save(event: React.FormEvent) { event.preventDefault(); commit(); }
  return <section className="card space-y-4"><h2 className="font-bold">{t("Bloco selecionado")}</h2>{getSectionHeading(clip.text) && <p className="text-sm text-slate-400">{t("Este bloco é um marcador de seção e não aparece como letra no vídeo. Seu intervalo e fundo são preservados; você pode removê-lo da timeline se desejar.")}</p>}<form className="space-y-3" onSubmit={save}>
    <label><span className="label">{t("Seção")}</span><input value={section} maxLength={100} onChange={event => setSection(event.target.value)} /></label>
    <label><span className="label">{t("Letra")}</span><textarea value={text} maxLength={500} rows={3} required onChange={event => setText(event.target.value)} /></label>
    <div className="grid grid-cols-2 gap-3"><label><span className="label">{t("Início (s)")}</span><input type="number" min={0} max={3600} step={0.001} required value={start} onChange={event => setStart(event.target.value)} /></label><label><span className="label">{t("Fim (s)")}</span><input type="number" min={0} max={3600} step={0.001} required value={end} onChange={event => setEnd(event.target.value)} /></label></div>
    <details><summary className="cursor-pointer text-sm">{t("Tempos por palavra")}</summary><p className="text-xs text-slate-400 my-2">{t("Segundos relativos ao início do bloco. Alterar a letra redistribui as palavras; redimensionar o bloco escala seus tempos.")}</p>
      <button className="btn-secondary text-xs mb-2" type="button" onClick={() => setWords(distributeWords(clip.text, clip.endMs - clip.startMs))}>{t("Redistribuir palavras")}</button>
      <div className="space-y-2 max-h-64 overflow-y-auto">{words.map((word, index) => <div key={index} className="grid grid-cols-[1fr_90px_90px] gap-2 items-center"><span className="text-sm break-all">{word.text}</span>
        <input aria-label={`Início da palavra ${index + 1}: ${word.text}`} type="number" min={0} step={0.001} value={word.startMs / 1000} onChange={event => setWords(words.map((item, i) => i === index ? { ...item, startMs: Math.round(Number(event.target.value) * 1000) } : item))} />
        <input aria-label={`Fim da palavra ${index + 1}: ${word.text}`} type="number" min={0} step={0.001} value={word.endMs / 1000} onChange={event => setWords(words.map((item, i) => i === index ? { ...item, endMs: Math.round(Number(event.target.value) * 1000) } : item))} />
      </div>)}</div></details>
    <button className="btn" type="submit">{t("Aplicar ao bloco")}</button>
  </form><div className="flex gap-2"><button className="btn-secondary" onClick={onRepeat}>{t("Repetir no final")}</button><button className="btn-secondary" onClick={onDelete}>{t("Remover bloco")}</button></div></section>;
}
