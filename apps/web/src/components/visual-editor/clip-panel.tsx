'use client';
import { useState } from 'react';
import { distributeWords, resizeClip, type LyricClip } from '@wls/shared';

export function ClipPanel({ clip, onSave, onRepeat, onDelete, onError }: { clip: LyricClip; onSave: (clip: LyricClip) => boolean; onRepeat: () => void; onDelete: () => void; onError: (message: string) => void }) {
  const [text, setText] = useState(clip.text);
  const [section, setSection] = useState(clip.section);
  const [start, setStart] = useState(String(clip.startMs / 1000));
  const [end, setEnd] = useState(String(clip.endMs / 1000));
  const [words, setWords] = useState(clip.words);
  function save(event: React.FormEvent) {
    event.preventDefault();
    const startMs = Math.round(Number(start) * 1000), endMs = Math.round(Number(end) * 1000);
    if (!text.trim() || !start || !end || !Number.isFinite(startMs) || endMs <= startMs) { onError('Preencha uma letra e um intervalo válido'); return; }
    const normalized = text.trim();
    const next = resizeClip({ ...clip, words }, startMs, endMs);
    onSave({ ...next, text: normalized, section, words: normalized !== clip.text ? distributeWords(normalized, endMs - startMs) : next.words });
  }
  return <section className="card space-y-4"><h2 className="font-bold">Bloco selecionado</h2><form className="space-y-3" onSubmit={save}>
    <label><span className="label">Seção</span><input value={section} maxLength={100} onChange={event => setSection(event.target.value)} /></label>
    <label><span className="label">Letra</span><textarea value={text} maxLength={500} rows={3} required onChange={event => setText(event.target.value)} /></label>
    <div className="grid grid-cols-2 gap-3"><label><span className="label">Início (s)</span><input type="number" min={0} max={3600} step={0.001} required value={start} onChange={event => setStart(event.target.value)} /></label><label><span className="label">Fim (s)</span><input type="number" min={0} max={3600} step={0.001} required value={end} onChange={event => setEnd(event.target.value)} /></label></div>
    <details><summary className="cursor-pointer text-sm">Tempos por palavra</summary><p className="text-xs text-slate-400 my-2">Segundos relativos ao início do bloco. Alterar a letra redistribui as palavras; redimensionar o bloco escala seus tempos.</p>
      <button className="btn-secondary text-xs mb-2" type="button" onClick={() => setWords(distributeWords(clip.text, clip.endMs - clip.startMs))}>Redistribuir palavras</button>
      <div className="space-y-2 max-h-64 overflow-y-auto">{words.map((word, index) => <div key={index} className="grid grid-cols-[1fr_90px_90px] gap-2 items-center"><span className="text-sm break-all">{word.text}</span>
        <input aria-label={`Início da palavra ${index + 1}: ${word.text}`} type="number" min={0} step={0.001} value={word.startMs / 1000} onChange={event => setWords(words.map((item, i) => i === index ? { ...item, startMs: Math.round(Number(event.target.value) * 1000) } : item))} />
        <input aria-label={`Fim da palavra ${index + 1}: ${word.text}`} type="number" min={0} step={0.001} value={word.endMs / 1000} onChange={event => setWords(words.map((item, i) => i === index ? { ...item, endMs: Math.round(Number(event.target.value) * 1000) } : item))} />
      </div>)}</div></details>
    <button className="btn" type="submit">Aplicar ao bloco</button>
  </form><div className="flex gap-2"><button className="btn-secondary" onClick={onRepeat}>Repetir no final</button><button className="btn-secondary" onClick={onDelete}>Remover bloco</button></div></section>;
}
