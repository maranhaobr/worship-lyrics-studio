import assert from 'node:assert/strict';
import test from 'node:test';
import { animationStyle, exitAnimationStyle } from '../packages/video/src/animations';
import { displayClipAt, projectFromSong } from '../packages/shared/src';
import { rhythmState } from '../packages/video/src/rhythm';
import { visualStyleSchema, templatePresets } from '../packages/shared/src';
import { defaultWordEmphasis, isEmphasizedWord } from '../packages/shared/src';
import { wordEmphasisStyle } from '../packages/video/src/word-emphasis';

test('keyword emphasis matches whole words without changing lyrics', () => {
  for (const word of ['JESUS', 'Jesus!', '(Deus)', 'sánto']) assert.ok(isEmphasizedWord(word, defaultWordEmphasis.words));
  for (const word of ['deuses', 'santos', 'JesusCristo', '']) assert.equal(isEmphasizedWord(word, defaultWordEmphasis.words), false);
  assert.equal(isEmphasizedWord('Jesus', []), false);
  const legacy = structuredClone(templatePresets.find(preset => preset.id === 'builtin-bold')!.style);
  assert.ok(visualStyleSchema.safeParse(legacy).success);
  legacy.text.emphasis = { ...defaultWordEmphasis, sizeScale: 9 };
  assert.equal(visualStyleSchema.safeParse(legacy).success, false);
});
test('keyword animation is deterministic and settles after entry', () => {
  const style = (ms: number) => wordEmphasisStyle(defaultWordEmphasis, ms, 20, 30, undefined);
  assert.equal(style(-1).transform, 'scale(1)');
  assert.equal(style(1000).transform, 'scale(1)');
  assert.notEqual(style(160).transform, 'scale(1)');
  assert.deepEqual(style(160), style(160));
  assert.equal(wordEmphasisStyle({ ...defaultWordEmphasis, placement: 'line', animation: 'none' }, 160, 1, 30, undefined).display, 'block');
});

test('rhythmic scenes use a deterministic global beat clock with tempo, phase and freeze controls', () => {
  const first = rhythmState(8, 30, 120, 0);
  rhythmState(1000, 30, 120, 0);
  assert.deepEqual(rhythmState(8, 30, 120, 0), first);
  assert.equal(rhythmState(15, 30, 120).phase, 0);
  assert.equal(rhythmState(15, 30, 60).phase, .5);
  assert.equal(rhythmState(15, 30, 120, 500).phase, 0);
  assert.deepEqual(rhythmState(999, 30, 200, -500, false), rhythmState(0, 30, 40, 1000, false));
  for (let frame = 0; frame < 100; frame++) {
    const value = rhythmState(frame, 30, 128, 1000);
    assert.ok(value.phase >= 0 && value.phase < 1 && value.pulse >= 0 && value.pulse <= 1);
  }
});
test('rhythmic presets validate and legacy themes keep optional tempo compatibility', () => {
  for (const preset of templatePresets) assert.ok(visualStyleSchema.safeParse(preset.style).success, preset.id);
  for (const theme of ['pulse', 'kinetic', 'neon']) assert.ok(templatePresets.some(preset => preset.style.decoration?.theme === theme));
  const style = structuredClone(templatePresets.find(preset => preset.id === 'builtin-bold')!.style);
  assert.ok(visualStyleSchema.safeParse(style).success);
  for (const bpm of [0, 39, 201, 120.5]) assert.equal(visualStyleSchema.safeParse({ ...style, decoration: { ...style.decoration, bpm } }).success, false);
});
test('animations can be sought deterministically and clamp at either end', () => {
  for (const type of ['fade', 'slide', 'zoom', 'words'] as const) {
    assert.equal(animationStyle(-100, 600, type).opacity, 0);
    assert.equal(animationStyle(1000, 600, type).opacity, 1);
    const middle = animationStyle(300, 600, type);
    animationStyle(500, 600, type);
    assert.deepEqual(animationStyle(300, 600, type), middle);
  }
  assert.equal(animationStyle(600, 600, 'slide').transform, 'translateY(0px)');
  assert.equal(animationStyle(600, 600, 'zoom').transform, 'scale(1)');
});

test('display tails preserve introductions, word times and stop at the next phrase', () => {
  const document = projectFromSong({ title: 'Teste', sections: [{ type: 'VERSE', label: 'Verso', lines: [
    { text: 'Primeira', startMs: 9000, endMs: 10000 },
    { text: 'Segunda', startMs: 10500, endMs: 12000 },
  ] }] }, () => crypto.randomUUID());
  const before = structuredClone(document);
  assert.equal(displayClipAt(document, 8999), undefined);
  assert.equal(displayClipAt(document, 10200)?.clip.id, document.clips[0].id);
  assert.equal(displayClipAt(document, 10200)?.endMs, 10500);
  assert.equal(displayClipAt(document, 10500)?.clip.id, document.clips[1].id);
  assert.equal(displayClipAt(document, 12000), undefined);
  assert.deepEqual(document, before);
  document.clips[1].startMs = 11500;
  assert.equal(displayClipAt(document, 10699)?.clip.id, document.clips[0].id);
  assert.equal(displayClipAt(document, 10700), undefined);
  document.clips[0].style = { animation: { type: 'fade', durationMs: 600, holdMs: 0, exitType: 'none' } };
  assert.equal(displayClipAt(document, 10000), undefined);
});

test('exit effects fade deterministically and shorten for short adjacent clips', () => {
  for (const type of ['fade', 'slide', 'zoom'] as const) {
    assert.equal(exitAnimationStyle(400, 300, type).opacity, 1);
    assert.equal(exitAnimationStyle(150, 300, type).opacity, .5);
    assert.equal(exitAnimationStyle(-1, 300, type).opacity, 0);
  }
  assert.deepEqual(exitAnimationStyle(0, 300, 'none'), {});
  const document = projectFromSong({ title: 'Teste', sections: [{ type: 'VERSE', label: 'Verso', lines: [
    { text: 'Um', startMs: 0, endMs: 100 }, { text: 'Dois', startMs: 100, endMs: 200 },
  ] }] }, () => crypto.randomUUID());
  assert.equal(displayClipAt(document, 0)?.exitMs, 50);
  assert.equal(displayClipAt(document, 100)?.clip.text, 'Dois');
});
