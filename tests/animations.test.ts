import assert from 'node:assert/strict';
import test from 'node:test';
import { animationStyle, exitAnimationStyle } from '../packages/video/src/animations';
import { displayClipAt, projectFromSong } from '../packages/shared/src';
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
