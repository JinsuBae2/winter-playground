import test from 'node:test';
import assert from 'node:assert/strict';
import { resample, drape, length, blank, serialize, restore, scaleFor, encodeShare, decodeShare } from '../tree/src/decor.js';

const near = (a, b) => Math.abs(a - b) < 1e-9;

test('그은 선을 고른 간격으로 다시 찍는다', () => {
  // 간격이 들쭉날쭉한 1m 직선
  const pts = resample([[0, 0, 0], [0.1, 0, 0], [0.15, 0, 0], [0.7, 0, 0], [1, 0, 0]], 0.25);
  assert.equal(pts.length, 5);
  pts.forEach((p, i) => assert.ok(near(p[0], i * 0.25), `${i}: ${p[0]}`));
  assert.deepEqual(resample([[1, 2, 3]], 0.1), [[1, 2, 3]]);
  assert.ok(near(length([[0, 0, 0], [3, 4, 0]]), 5));
});

test('처짐은 점 사이 가운데를 내린다', () => {
  const out = drape([[0, 1, 0], [1, 1, 0], [2, 1, 0]], 0.1);
  assert.equal(out.length, 5);
  assert.deepEqual(out[1], [0.5, 0.9, 0]);
  assert.deepEqual(out[2], [1, 1, 0]);
});

test('저장본은 그대로 되살아나고, 깨진 저장본은 무시한다', () => {
  const s = blank();
  s.items.push({ t: 'orn', shape: 'bell', p: [0.1, 1, 0.2], ry: 1, color: '#b3121f', mat: 'gloss', r: 0.05 });
  s.items.push({ t: 'lights', pts: [[0, 1, 0.3], [0.2, 1, 0.2]], color: 'warm', size: 'mini', mode: 'twinkle' });
  assert.deepEqual(restore(serialize(s)), s);
  assert.equal(restore('{망가짐'), null);
  assert.equal(restore('{"v":1,"items":[]}'), null);
  assert.equal(restore(null), null);
});

test('공유 링크는 압축했다가 그대로 되살아난다', async () => {
  const s = blank();
  s.species = 'pine'; s.night = true;
  for (let k = 0; k < 6; k++) s.items.push({ t: 'lights', pts: resample([[0.5, 0.3 + k * 0.2, 0], [0, 0.4 + k * 0.2, 0.5], [-0.5, 0.5 + k * 0.2, 0]], 0.06).map(p => p.map(v => +v.toFixed(3))), color: 'multi', size: 'big', mode: 'chase' });
  for (let k = 0; k < 30; k++) s.items.push({ t: 'orn', shape: 'ball', p: [0.1, k / 20, 0.3], ry: 0.3, color: '#b3121f', mat: 'glitter', r: 0.05 });
  const code = await encodeShare(s);
  assert.match(code, /^[A-Za-z0-9_-]+$/); // URL에 그대로 넣을 수 있는 글자만
  assert.ok(code.length < 4000, `링크가 너무 길다: ${code.length}`);
  assert.deepEqual(await decodeShare(code), s);
  assert.equal(await decodeShare('망가진-링크'), null);
});

test('조작된 링크의 이상한 값은 버린다', () => {
  const bad = restore(JSON.stringify({ v: 2, species: '../../evil', size: 9999, items: [
    { t: 'orn', shape: 'ball', p: [0, 1, 0], mat: 'gloss', r: 0.05 },
    { t: 'orn', shape: 'ball', p: [0, 'x', 0], mat: 'gloss', r: 0.05 },
    { t: 'lights', pts: [[0, 0, 0]], color: 'warm' },
    { t: 'script' }, null,
  ] }));
  assert.equal(bad.species, 'fir');
  assert.equal(bad.size, 180);
  assert.equal(bad.items.length, 1);
});

test('크기는 180cm 모델 기준 배율', () => {
  assert.equal(scaleFor(180), 1);
  assert.ok(near(scaleFor(210), 7 / 6));
});
