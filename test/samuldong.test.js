import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, step, visitorsAt, safeMoment, seeded } from '../samuldong/src/sim.js';
import { LEVELS, PLACES, WASH_Y, STALLS, BASINS, KNOCK, CLOSE_CALL } from '../samuldong/src/data.js';

// 눈치 보는 봇이 난이도마다 40판을 끝까지 플레이한다. 그동안 인원·대기 시간·동선을 전부 검사한다.
const HALL = ['away', 'depart', 'approach'];
const rates = [];
for (const place of Object.keys(PLACES)) for (const [n, level] of Object.keys(LEVELS).entries()) {
  test(PLACES[place].name + ' ' + level + ' 동시 인원·대기 시간·벽과 세면대 충돌·완주', () => {
    let peak = 0, worstWait = 0, clear = 0, worstClear = 0, visits = 0, minutes = 0, crowded = 0;
    for (let s = 1; s <= 40; s++) {
      const g = newGame(level, seeded(s * 7 + n), { place });
      let wait = 0, calm = 0, result;
      while (!result) {
        const guests = visitorsAt(g);
        const inside = guests.filter(v => !HALL.includes(v.act));
        peak = Math.max(peak, inside.length);
        assert.ok(inside.length <= LEVELS[level].max, '동시 인원 초과');
        const seated = inside.filter(v => ['ready', 'inhale', 'strain'].includes(v.act)).length;
        const sinks = new Set(inside.filter(v => v.act === 'wash').map(v => v.x)).size;
        if (seated === 2 && sinks === 2) crowded++;
        for (const v of inside) {
          for (const x of BASINS) {
            const dx = Math.max(0, Math.abs(x - v.x) - 63);
            const dy = Math.max(384 - v.y, 0, v.y - 457);
            assert.ok(Math.hypot(dx, dy) >= 31, '세면대와 인물 겹침');
          }
          // 통로 위쪽은 자기 칸 문 앞 직선으로만, 문이 열려 있을 때만 지난다
          if (v.y < 340) assert.ok(STALLS.includes(v.x) || (v.x === 510 && v.y >= KNOCK.y), '칸막이 관통');
          if (v.y > 160 && v.y < 340) assert.ok(['walk', 'phone', 'knock'].includes(v.act), '닫힌 문 관통');
          assert.ok(v.x >= 263 && v.y <= WASH_Y, '벽 관통');
        }
        const safe = safeMoment(guests);
        calm = safe ? calm + 1 : 0;
        wait = safe ? 0 : wait + 1; worstWait = Math.max(worstWait, wait);
        // 0.3초 지켜본 뒤 누르고, 0.3초 뒤가 위험하면 미리 뗀다
        const held = calm > 18 && safeMoment(visitorsAt(g, g.time + .3));
        result = step(g, 1 / 60, held);
        assert.ok(g.time < 150, '150초 안에 완주');
      }
      assert.equal(result, 'won', '눈치 보는 플레이는 들키지 않는다');
      clear += g.time; worstClear = Math.max(worstClear, g.time);
      visits += g.entries; minutes += g.time / 60;
    }
    assert.ok(worstWait <= 8 * 60, '8초 넘게 아무것도 못 하는 구간 없음');
    if (place === 'office') {
      assert.equal(peak, LEVELS[level].max, '최대 동시 인원에 도달');
      if (level === 'EXTRA HARD') assert.ok(crowded > 0, '양옆 칸 + 서로 다른 세면대 두 곳');
      rates.push(visits / minutes);
      if (n) assert.ok(rates[n] > rates[n - 1], '어려울수록 자주 들어온다');
    }
    console.log(PLACES[place].name, level, '| 분당 입장', (visits / minutes).toFixed(1), '| 최장 대기', (worstWait / 60).toFixed(1) + '초',
      '| 완주 평균', (clear / 40).toFixed(1) + '초 · 최장', worstClear.toFixed(1) + '초');
  });
}

test('방문 유형 네 가지가 모두 나온다', () => {
  const kinds = new Set(), g = newGame('EXTRA HARD', seeded(3));
  for (let f = 0; f < 60 * 240; f++) { step(g, 1 / 60, false); g.routes.forEach(r => kinds.add(r.kind)); }
  assert.deepEqual([...kinds].sort(), ['stall', 'stallwash', 'wash', 'washstall']);
});

test('힘주다 들키면 누가 들었는지 남는다', () => {
  const g = newGame('NORMAL', seeded(1));
  let result;
  while (!result) result = step(g, 1 / 60, true); // 계속 누르고 있으면 반드시 들킨다
  assert.equal(result, 'caught');
  assert.ok(g.culprits.length && !g.leaked);
});

test('끝까지 참으면 새어 나온다', () => {
  const g = newGame('EASY', () => .99);
  g.nextAt = Infinity; // 아무도 안 온다
  for (let f = 0; f < 60 * 14; f++) step(g, 1 / 60, false);
  assert.ok(g.progress > 0, '손을 대지 않아도 게이지가 찼다');
});

test('위험해지기 직전에 떼면 아슬아슬 가산점', () => {
  const g = newGame('NORMAL', seeded(5));
  let wasSafe = true;
  // 0.2초 뒤가 위험해지는 순간까지 누르고 있다가 뗀다
  while (!g.closeCalls && g.time < 120) {
    const soon = safeMoment(visitorsAt(g, g.time + .2));
    assert.notEqual(step(g, 1 / 60, safeMoment(visitorsAt(g)) && soon), 'caught');
  }
  assert.equal(g.closeCalls, 1);
  assert.ok(g.time - g.closeAt < CLOSE_CALL.window);
});

test('무한 모드는 바퀴마다 한 단계씩 붐빈다', () => {
  const g = newGame('EASY', () => .99, { endless: true });
  g.nextAt = Infinity; // 아무도 안 오면 계속 채운다
  for (let f = 0; f < 60 * 20; f++) assert.equal(step(g, 1 / 60, true), undefined);
  assert.equal(g.laps, 2);
  assert.equal(g.level, 'HARD');
});

test('드라이어가 도는 동안은 누가 있어도 안전하다', () => {
  assert.equal(safeMoment([{ act: 'walk' }]), false);
  assert.equal(safeMoment([{ act: 'walk' }, { act: 'dry' }]), true);
  assert.equal(safeMoment([{ act: 'phone' }]), true);
});
