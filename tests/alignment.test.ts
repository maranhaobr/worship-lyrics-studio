import assert from 'node:assert/strict';
import test from 'node:test';
import { alignmentInputMatches, alignmentResultSchema, applyAlignment, distributeWords, projectFromLyrics, lyricsImportSchema, type AlignmentResult } from '../packages/shared/src';

const create = () => { let id = 0; return projectFromLyrics(lyricsImportSchema.parse({ title: 'Teste', lyrics: 'Santo para sempre\nGlória a Ti' }), () => String(++id)); };
const result: AlignmentResult = { durationMs: 20000, warnings: [], clips: [
  { clipId: '1', startMs: 2000, endMs: 5000, words: distributeWords('Santo para sempre', 3000), needsReview: false },
  { clipId: '2', startMs: 12000, endMs: 15000, words: distributeWords('Glória a Ti', 3000), needsReview: false },
] };

test('provisional timings require explicit review and warnings while legacy results still parse', () => {
  assert.ok(alignmentResultSchema.safeParse(result).success);
  const provisional = structuredClone(result);
  provisional.clips[0].timingSource = 'estimated';
  assert.equal(alignmentResultSchema.safeParse(provisional).success, false);
  provisional.clips[0].needsReview = true;
  assert.equal(alignmentResultSchema.safeParse(provisional).success, false);
  provisional.warnings.push('Slide 1: posição provisória; ajuste manualmente.');
  assert.ok(alignmentResultSchema.safeParse(provisional).success);
});
test('alignment changes timing while preserving IDs, text, section, audio and visual overrides', () => {
  const document = create(); document.referenceAudio = { assetId: 'audio' };
  document.clips[0].style = { background: { type: 'video', assetId: 'video' } };
  const aligned = applyAlignment(document, result);
  assert.equal(aligned.durationMs, 20000);
  assert.equal(aligned.clips[0].startMs, 2000); assert.equal(aligned.clips[1].startMs, 12000);
  assert.deepEqual(aligned.clips[0].style, document.clips[0].style);
  assert.equal(aligned.referenceAudio?.assetId, 'audio');
  assert.equal(document.clips[0].startMs, 0);
});
test('visual edits can be merged but lyric, audio and manual timing edits cause conflicts', () => {
  const before = create(), current = structuredClone(before);
  current.style.text.fontSize = 100; current.clips[0].style = { animation: { type: 'zoom', durationMs: 500 } };
  assert.ok(alignmentInputMatches(before, current));
  for (const patch of [
    (d: typeof current) => { d.clips[0].text = 'Outra letra'; },
    (d: typeof current) => { d.clips[0].startMs = 100; },
    (d: typeof current) => { d.referenceAudio = { assetId: 'other' }; },
  ]) { const changed = structuredClone(current); patch(changed); assert.equal(alignmentInputMatches(before, changed), false); }
});
test('missing slides, overlapping output and wrong words cannot be applied', () => {
  const document = create();
  assert.throws(() => applyAlignment(document, { ...result, clips: result.clips.slice(1) }));
  const overlap = structuredClone(result); overlap.clips[1].startMs = 1000;
  assert.throws(() => applyAlignment(document, overlap));
  const wrong = structuredClone(result); wrong.clips[0].words[0].text = 'Errada';
  assert.throws(() => applyAlignment(document, wrong));
});
