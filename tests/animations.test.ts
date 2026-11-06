import assert from 'node:assert/strict';
import test from 'node:test';
import { animationStyle } from '../packages/video/src/animations';
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
