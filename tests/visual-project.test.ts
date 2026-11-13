import assert from 'node:assert/strict';
import test from 'node:test';
import { distributeWords, durationInFrames, frameToMs, msToFrame, projectFromSong, resizeClip, templatePresets, visualProjectSchema, parseLyrics, projectFromLyrics, resolveClipStyle, lyricsImportSchema, getSectionHeading, type SongInput } from '../packages/shared/src';
import { editorReducer } from '../apps/web/src/lib/editor/reducer';

const song: SongInput = { title: 'Teste', sections: [{ type: 'VERSE', label: 'Verso 1', lines: [{ text: 'Santo para sempre' }, { text: 'Toda glória a Ti' }] }] };
let counter = 0;
const create = () => projectFromSong(song, () => `clip-${++counter}`);

test('output sizes preserve lyrics and reject dimensions incompatible with MP4 or resource limits', async () => {
  const { resolutionPresets } = await import('../packages/shared/src');
  const original = create();
  for (const size of [...resolutionPresets, { width: 1600, height: 900 }]) {
    const parsed = visualProjectSchema.parse({ ...original, width: size.width, height: size.height });
    assert.deepEqual(parsed.clips, original.clips);
    assert.equal(parsed.width, size.width);
    assert.equal(parsed.height, size.height);
  }
  for (const size of [{ width: 1279, height: 720 }, { width: 1920, height: 0 }, { width: 1920.5, height: 1080 }, { width: 5000, height: 1080 }, { width: 4096, height: 4096 }]) {
    assert.equal(visualProjectSchema.safeParse({ ...original, ...size }).success, false);
  }
  const resized = { ...original, width: 1080, height: 1920 };
  const history = editorReducer({ past: [], present: original, future: [] }, { type: 'change', document: resized });
  assert.equal(editorReducer(history, { type: 'undo' }).present, original);
});

test('seasonal and typography templates round-trip all styling without altering lyrics or timing', () => {
  for (const preset of templatePresets) {
    const document = create();
    const before = structuredClone(document.clips);
    document.style = structuredClone(preset.style);
    const parsed = visualProjectSchema.parse(JSON.parse(JSON.stringify(document)));
    assert.deepEqual(parsed.style, preset.style);
    assert.deepEqual(parsed.clips, before);
    if (preset.style.decoration) {
      parsed.clips[0].style = { text: parsed.style.text, decoration: parsed.style.decoration };
      assert.equal(visualProjectSchema.safeParse(parsed).success, true);
      assert.deepEqual(resolveClipStyle(parsed.style, parsed.clips[0]).decoration, preset.style.decoration);
    }
  }
  const invalid = create();
  invalid.style.text.offsetX = 100;
  assert.equal(visualProjectSchema.safeParse(invalid).success, false);
});

test('snapshots have independent IDs, copied style, and preserve the source song', () => {
  const first = create(), second = create();
  assert.equal(visualProjectSchema.safeParse(first).success, true);
  assert.notEqual(first.clips[0].id, second.clips[0].id);
  first.clips[0].text = 'Alterada'; first.style.text.fontSize = 100;
  assert.equal(song.sections[0].lines[0].text, 'Santo para sempre');
  assert.equal(second.style.text.fontSize, templatePresets[0].style.text.fontSize);
});
test('timings from songs are preserved when valid and normalized when overlapping', () => {
  const project = projectFromSong({ ...song, sections: [{ ...song.sections[0], lines: [{ text: 'Primeira', startMs: 1000, endMs: 3000 }, { text: 'Segunda', startMs: 2000, endMs: 5000 }] }] }, () => String(++counter));
  assert.equal(project.clips[0].startMs, 1000);
  assert.equal(project.clips[1].startMs, 3000);
  assert.equal(project.durationMs, 5000);
});
test('rejects overlapping, reversed, duplicate, out-of-range and unordered clips', () => {
  const overlap = create(); overlap.clips[1].startMs = 3999;
  assert.equal(visualProjectSchema.safeParse(overlap).success, false);
  const reversed = create(); reversed.clips[0].endMs = 0;
  assert.equal(visualProjectSchema.safeParse(reversed).success, false);
  const duplicate = create(); duplicate.clips[1].id = duplicate.clips[0].id;
  assert.equal(visualProjectSchema.safeParse(duplicate).success, false);
  const outside = create(); outside.durationMs = 4000;
  assert.equal(visualProjectSchema.safeParse(outside).success, false);
  const unordered = create(); unordered.clips.reverse();
  assert.equal(visualProjectSchema.safeParse(unordered).success, false);
});
test('allows intentional gaps and empty timelines', () => {
  const document = create(); document.clips = [document.clips[1]];
  assert.equal(visualProjectSchema.safeParse(document).success, true);
  document.clips = [];
  assert.equal(visualProjectSchema.safeParse(document).success, true);
});
test('word times cover the line, remain relative, and scale when resizing', () => {
  const words = distributeWords('  Santo   para sempre  ', 1000);
  assert.equal(words[0].startMs, 0); assert.equal(words.at(-1)?.endMs, 1000);
  const project = create(); const clip = project.clips[0];
  const resized = resizeClip(clip, 500, 8500);
  assert.equal(resized.words[0].startMs, 0);
  assert.equal(resized.words.at(-1)?.endMs, 8000);
  assert.equal(resized.startMs, 500);
});
test('rejects invalid word timings and words which no longer match the line', () => {
  const overlap = create(); overlap.clips[0].words[1].startMs = 0;
  assert.equal(visualProjectSchema.safeParse(overlap).success, false);
  const outside = create(); outside.clips[0].words.at(-1)!.endMs = 9000;
  assert.equal(visualProjectSchema.safeParse(outside).success, false);
  const mismatch = create(); mismatch.clips[0].words[0].text = 'Diferente';
  assert.equal(visualProjectSchema.safeParse(mismatch).success, false);
});
test('frame conversion stays within half a frame and duration rounds up', () => {
  for (const time of [0, 33, 100, 5333, 3_599_999]) assert.ok(Math.abs(frameToMs(msToFrame(time, 30), 30) - time) <= 1000 / 60);
  const project = create(); project.durationMs = 8001;
  assert.equal(durationInFrames(project), 241);
});
test('undo/redo restores snapshots and a new edit clears the redo branch', () => {
  const original = create(); const changed = { ...original, durationMs: 9000 };
  const initial = { past: [], present: original, future: [] };
  const edited = editorReducer(initial, { type: 'change', document: changed });
  const undone = editorReducer(edited, { type: 'undo' });
  assert.equal(undone.present, original);
  assert.equal(editorReducer(undone, { type: 'redo' }).present, changed);
  assert.equal(editorReducer(undone, { type: 'change', document: { ...original, durationMs: 10000 } }).future.length, 0);
});

test('imports the whole lyric, preserves repeats, recognizes headings and splits long phrases without losing words', () => {
  const long = 'Toda glória e toda honra ao Senhor '.repeat(8).trim();
  const text = `\uFEFF[Verso 1]\r\nSanto para sempre\r\n\r\n[Refrão]\r\nGlória a Ti\r\nGlória a Ti\r\n${long}`;
  const slides = parseLyrics(text);
  assert.equal(slides[0].section, 'Verso 1'); assert.equal(slides[1].section, 'Refrão');
  assert.equal(slides[1].text, slides[2].text);
  assert.equal(slides.slice(3).map(slide => slide.text).join(' '), long);
  assert.ok(slides.every(slide => slide.text.length <= 90));
});

test('generates a complete timeline with estimated timings, word times and optional varied effects', () => {
  const input = lyricsImportSchema.parse({ title: 'Importada', lyrics: '[Verso]\nSanto para sempre\nGlória a Ti' });
  const document = projectFromLyrics(input, () => String(++counter));
  assert.equal(visualProjectSchema.safeParse(document).success, true);
  assert.equal(document.clips.length, 2);
  assert.equal(document.clips[0].startMs, 0);
  assert.equal(document.clips[1].startMs, document.clips[0].endMs);
  assert.equal(document.clips[1].endMs, document.durationMs);
  assert.notEqual(document.clips[0].style?.animation?.type, document.clips[1].style?.animation?.type);
  const slow = projectFromLyrics({ ...input, pace: 'slow', varyEffects: false }, () => String(++counter));
  assert.ok(slow.durationMs > document.durationMs);
  assert.equal(slow.clips[0].style, undefined);
  assert.throws(() => projectFromLyrics({ ...input, lyrics: '[Refrão]' }, () => 'x'));
});

test('slide styles inherit defaults and do not alter other slides or legacy projects', () => {
  const document = create(), first = document.clips[0], second = document.clips[1];
  first.style = { background: { type: 'gradient', from: '#000000', to: '#ffffff', angle: 90 }, animation: { type: 'zoom', durationMs: 500 } };
  const style = resolveClipStyle(document.style, first);
  assert.equal(style.animation.type, 'zoom'); assert.equal(style.text, document.style.text);
  assert.equal(resolveClipStyle(document.style, second).animation.type, 'fade');
  assert.equal(visualProjectSchema.safeParse(document).success, true);
  first.style = undefined;
  assert.deepEqual(resolveClipStyle(document.style, first), document.style);
});

test('recognizes standalone Portuguese section markers, with numbering, accents, punctuation and wrappers', () => {
  for (const label of ['Verso 1', 'Verso 2', 'Verso 30', 'Pré-refrão', 'PRÉ-REFRÃO', 'Pré Refrão', 'Pre–Refrao 2:', 'Refrão', 'Refrao:', 'Tag', 'Instrumental', 'Prelúdio', 'Ponte', '[Verso 3]', '(Refrão)', '[Ponte]:']) {
    assert.ok(getSectionHeading(label), label);
  }
  for (const phrase of ['Uma ponte sobre as águas', 'Este é o verso da minha canção', 'No instrumental eu vou cantar', 'Tagarela', 'Verso 1 da minha vida', '(Santo é o Senhor)']) assert.equal(getSectionHeading(phrase), null, phrase);
});

test('plain section labels group lyrics without consuming slides or timing', () => {
  const input = lyricsImportSchema.parse({ title: 'Seções', lyrics: 'Verso 1\nSanto para sempre\n\nPré-refrão:\n\nTu és digno\nRefrão\nGlória a Ti\nTag\nGlória a Ti\nInstrumental\nPrelúdio\nPonte\nUma ponte sobre as águas' });
  const slides = parseLyrics(input.lyrics);
  assert.deepEqual(slides.map(slide => slide.section), ['Verso 1', 'Pré-refrão', 'Refrão', 'Tag', 'Ponte']);
  const project = projectFromLyrics(input, () => String(++counter));
  assert.equal(project.clips.length, 5);
  assert.equal(project.clips[0].text, 'Santo para sempre');
  assert.equal(project.clips[0].startMs, 0);
  assert.ok(project.clips.every(clip => getSectionHeading(clip.text) === null));
});

test('projects from saved songs also treat embedded labels as section metadata', () => {
  const project = projectFromSong({ title: 'Salva', sections: [{ type: 'VERSE', label: 'Personalizado', lines: [{ text: 'Verso 1' }, { text: 'Santo para sempre' }, { text: 'Refrão' }, { text: 'Glória a Ti' }] }] }, () => String(++counter));
  assert.equal(project.clips.length, 2);
  assert.equal(project.clips[0].section, 'Verso 1');
  assert.equal(project.clips[1].section, 'Refrão');
  assert.equal(project.durationMs, 8000);
});
