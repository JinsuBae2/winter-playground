import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../tycoon/src/sim.js';
import { RENT, EVENTS, ENDINGS, FILLINGS, DEV_ORDER, DEV_COST } from '../tycoon/src/data.js';

const HOUR = 3.6e6;
const setup = () => {
  const meta = S.newMeta(0), run = S.newRun(meta, 'station');
  return { meta, run, day: S.newDay(run, meta, () => 0) }; // rng 0 → 맑음
};
// 한 칸을 주어진 게이지 값에서 두 번 눌러 굽는다
const bake = (day, run, i, p1, p2 = p1, f = 'pat') => {
  S.tapMold(day, run, i, f);
  day.molds[i].p = p1; S.tapMold(day, run, i);
  day.molds[i].p = p2; return S.tapMold(day, run, i);
};

test('굽기 판정 경계', () => {
  assert.equal(S.judge(0.59), 'under');
  assert.equal(S.judge(0.6), 'perfect');
  assert.equal(S.judge(1), 'perfect');
  assert.equal(S.judge(1.01), 'over');
  assert.equal(S.judge(1.16), 'burnt');
  assert.equal(S.judge(0.55, true), 'perfect');
  assert.equal(S.worst('perfect', 'under'), 'under');
  assert.equal(S.worst('burnt', 'under'), 'burnt');
});

test('굽기: 재료 소모, 보온대, 탄 것은 폐기', () => {
  const { run, day } = setup();
  assert.equal(bake(day, run, 0, 0.9), 'perfect');
  assert.equal(bake(day, run, 1, 0.9, 0.5), 'under');
  assert.equal(bake(day, run, 2, 1.2, 0.9), 'burnt');
  assert.equal(bake(day, run, 3, 1.1, 0.9), 'over');
  assert.equal(run.stock, 36);
  assert.deepEqual(day.warmer.map(w => w.q), ['perfect', 'under', 'over']);
  assert.equal(day.stat.burnt, 1);
  run.stock = 0;
  assert.equal(S.tapMold(day, run, 3, 'pat'), 'nostock');
});

test('보온대가 꽉 차면 꺼낼 수 없다', () => {
  const { run, day } = setup();
  day.cfg.warmCap = 1;
  bake(day, run, 0, 0.9);
  assert.equal(bake(day, run, 1, 0.9), 'full');
  assert.equal(day.molds[1].s, 'b');
});

test('판매: 주문이 다 있어야 하고 품질대로 받는다', () => {
  const { run, day } = setup();
  day.queue.push({ id: 9, order: { pat: 2 }, left: 10, max: 10, regular: 'minji' });
  bake(day, run, 0, 0.9);
  assert.equal(S.serve(day, 9), null);
  bake(day, run, 1, 0.9);
  const r = S.serve(day, 9);
  assert.equal(r.pay, 2400); // 1000 × 1.2 × 2
  assert.equal(r.allPerfect, true);
  assert.equal(day.warmer.length, 0);
  assert.equal(day.stat.aff.minji, 1);
});

test('주문이 준비되면 자동으로 팔린다', () => {
  const { run, day } = setup();
  day.queue.push({ id: 1, slot: 0, order: { pat: 1 }, left: 10, max: 10 });
  bake(day, run, 0, 0.9);
  S.tick(day, 0.1, run, () => 0.99);
  assert.equal(day.queue.length, 0);
  assert.deepEqual(day.fx, [{ t: 'sale', slot: 0, pay: 1200, allPerfect: true }]);
});

test('손님은 인내심이 다하면 떠난다', () => {
  const { run, day } = setup();
  day.queue.push({ id: 1, order: { pat: 1 }, left: 0.5, max: 10 });
  S.tick(day, 1, run, () => 0.99);
  assert.equal(day.stat.lost, 1);
});

test('정산: 자릿세, 날짜, 단골 대사', () => {
  const { meta, run, day } = setup();
  day.stat.rev = 10000; day.stat.aff = { minji: 1 };
  const lines = S.settle(run, meta, day);
  assert.equal(run.money, 10000 + 10000 - RENT);
  assert.equal(run.day, 2);
  assert.equal(lines.length, 1);
  assert.equal(meta.regulars.minji, 1);
});

test('업그레이드와 신메뉴 개발', () => {
  const { run } = setup();
  run.money = 20000;
  assert.equal(S.buyUpgrade(run, 'fire'), true);
  assert.equal(S.buyUpgrade(run, 'dev'), true);
  assert.equal(S.buyUpgrade(run, 'sign'), false); // 돈 부족
  assert.deepEqual(run.fillings, ['pat', 'cream', 'goguma']);
});

test('엔딩 판정과 계승', () => {
  const { meta, run } = setup();
  assert.equal(S.ending(run, meta), 'local');
  Object.assign(run, { baked: 100, perfect: 95 });
  assert.equal(S.ending(run, meta), 'master');
  run.money = -1;
  assert.equal(S.ending(run, meta), 'bankrupt');
  assert.deepEqual(S.applyEnding(meta, 'master'), { fame: 3, first: true });
  assert.deepEqual(S.applyEnding(meta, 'master'), { fame: 1, first: false });
  assert.deepEqual(meta.unlocks, ['wide']);
});

test('본점 수익은 8시간이 상한', () => {
  const meta = S.newMeta(0);
  assert.equal(S.collect(meta, 2 * HOUR), 200);
  assert.equal(S.collect(meta, 2 * HOUR + 100 * HOUR), 800);
});

test('데이터 표가 서로 맞는다', () => {
  for (const f of DEV_ORDER) assert.ok(FILLINGS[f]);
  assert.equal(DEV_COST.length, DEV_ORDER.length);
  assert.equal(ENDINGS.at(-1).id, 'local');
  // 모든 이벤트 선택지가 문장을 돌려준다
  for (const e of EVENTS) for (const c of e.choices) {
    const run = S.newRun(S.newMeta(0), 'station');
    run.money = 1e6;
    assert.equal(typeof c.do(run), 'string', e.id);
  }
});

test('자동 뒤집개는 첫 면만 뒤집는다', () => {
  const { run, day } = setup();
  day.cfg.auto = true;
  S.tapMold(day, run, 0, 'pat');
  assert.equal(S.tapMold(day, run, 0), 'auto'); // 첫 면은 눌러도 아무 일 없다
  day.molds[0].p = 0.79;
  S.tick(day, 0.1, run, () => 0.99);
  assert.equal(day.molds[0].s, 'b');
  assert.equal(day.molds[0].qa, 'perfect');
  day.molds[0].p = 0.9;
  S.tick(day, 0.1, run, () => 0.99);
  assert.equal(day.molds[0].s, 'b'); // 꺼내기는 손으로
});

test('재료가 떨어지고 남은 것이 없으면 일찍 마감한다', () => {
  const { run, day } = setup();
  run.stock = 1;
  S.tapMold(day, run, 0, 'pat');
  assert.equal(S.tick(day, 0.1, run, () => 0.99), false); // 아직 굽는 중
  day.molds[0] = { s: 'empty' };
  assert.equal(S.tick(day, 0.1, run, () => 0.99), true);
  assert.equal(day.stat.soldOut, true);
});
