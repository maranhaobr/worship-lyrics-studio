import assert from 'node:assert/strict';
import test from 'node:test';
import { distributeWords, durationInFrames, frameToMs, msToFrame, projectFromSong, resizeClip, templatePresets, visualProjectSchema, type SongInput } from '../packages/shared/src';
import { editorReducer } from '../apps/web/src/lib/editor/reducer';

const song: SongInput = { title: 'Teste', sections: [{ type: 'VERSE', label: 'Verso 1', lines: [{ text: 'Santo para sempre' }, { text: 'Toda glória a Ti' }] }] };
let counter = 0;
const create = () => projectFromSong(song, () => `clip-${++counter}`);

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
