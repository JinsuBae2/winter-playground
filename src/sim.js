// 순수 게임 로직. DOM을 모른다. rng는 0~1 난수 함수(테스트에서 고정값 주입).
import {
  DAY_LEN, RUN_DAYS, RENT, STOCK_COST, BURN_AT, OVER_AT, FILLINGS, DEV_ORDER, DEV_COST,
  HOODS, WEATHER, UPGRADES, REGULARS, AFF_STEPS, EVENTS, ENDINGS, PERMS, CHATTER,
} from './data.js';

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
const RANK = { perfect: 0, under: 1, over: 1, burnt: 2 };

// 덜 익음 → 완벽 → 살짝 탐(over: 팔 수는 있지만 제값을 못 받는다) → 탐(폐기)
export const judge = (p, wide) => (p > OVER_AT ? 'burnt' : p > 1 ? 'over' : p >= (wide ? 0.52 : 0.6) ? 'perfect' : 'under');
export const worst = (a, b) => (RANK[a] >= RANK[b] ? a : b);
export const perfectRate = run => (run.baked ? run.perfect / run.baked : 0);

export const newMeta = now => ({
  coins: 0, fame: 0, hq: 1, perm: { money: 0, stock: 0, patience: 0 },
  endings: {}, unlocks: [], regulars: {}, lastSeen: now,
});

export function newRun(meta, hood) {
  const has = k => meta.unlocks.includes(k);
  return {
    hood, day: 1,
    money: 10000 + 5000 * meta.perm.money + (has('money') ? 10000 : 0),
    stock: 40 + 10 * meta.perm.stock,
    earned: 0, baked: 0, perfect: 0, developed: 0, aff: 0,
    up: { mold: 0, fire: 0, warmer: 0, sign: 0, price: 0, auto: 0 },
    fillings: ['pat', 'cream', ...(has('mint') ? ['mint'] : [])],
    flags: {}, mods: newMods(),
  };
}
const newMods = () => ({ spawn: 1, price: 1, stockCost: 1, trend: null });

export function newDay(run, meta, rng) {
  const has = k => meta.unlocks.includes(k);
  const h = HOODS[run.hood === 'truck' ? pick(['school', 'station', 'market', 'office'], rng) : run.hood];
  let roll = rng() * WEATHER.reduce((s, w) => s + w.w, 0);
  const w = WEATHER.find(x => (roll -= x.w) < 0) || WEATHER[0];
  const u = run.up;
  return {
    t: 0, nextSpawn: 2, nextId: 1, warmer: [], queue: [], fx: [],
    molds: Array.from({ length: [4, 6, 9][u.mold] }, () => ({ s: 'empty' })),
    cfg: {
      hoodName: h.name, weather: w.name, trend: run.mods.trend,
      bakeTime: [4, 3.4, 2.9][u.fire] * w.bake,
      spawnEvery: 6 / (h.spawn * w.spawn * [1, 1.2, 1.4][u.sign] * run.mods.spawn),
      price: h.price * (1 + 0.15 * u.price) * run.mods.price,
      patience: 30 * h.patience * 0.9 ** u.price * (1 + 0.05 * meta.perm.patience),
      regular: h.regular + (has('friend') ? 0.1 : 0), maxOrder: h.maxOrder,
      warmCap: [6, 10, 14][u.warmer], keep: [30, 45, 60][u.warmer],
      wide: has('wide'), auto: !!u.auto, tip: has('gold') ? 1.4 : 1.2,
    },
    stat: { rev: 0, sold: 0, served: 0, lost: 0, baked: 0, perfect: 0, burnt: 0, combo: 0, maxCombo: 0, aff: {} },
  };
}

function newCustomer(day, run, rng) {
  const { cfg } = day, n = 1 + Math.floor(rng() * cfg.maxOrder), order = {};
  for (let i = 0; i < n; i++) {
    // 유행 타는 소는 주문의 절반을 차지한다
    const f = cfg.trend && run.fillings.includes(cfg.trend) && rng() < 0.5 ? cfg.trend : pick(run.fillings, rng);
    order[f] = (order[f] || 0) + 1;
  }
  const max = cfg.patience + 3 * n;
  return {
    id: day.nextId++, order, left: max, max, say: pick(CHATTER, rng),
    slot: [0, 1, 2].find(s => !day.queue.some(c => c.slot === s)),
    regular: rng() < cfg.regular ? pick(Object.keys(REGULARS), rng) : null,
  };
}

// dt초 진행. 하루가 끝났으면 true. 이번 틱에 일어난 일(판매, 손님 이탈)은 day.fx에 담긴다.
export function tick(day, dt, run, rng) {
  day.t += dt;
  day.fx = [];
  day.molds.forEach((m, i) => {
    if (m.s === 'empty') return;
    m.p = Math.min(BURN_AT, m.p + dt / day.cfg.bakeTime);
    // 자동 뒤집개: 첫 면이 알맞게 익으면 알아서 뒤집는다. 꺼내기는 여전히 손으로.
    if (day.cfg.auto && m.s === 'a' && m.p >= 0.8) { m.qa = 'perfect'; m.s = 'b'; m.p = 0; day.fx.push({ t: 'flip', i }); }
  });
  for (const w of day.warmer) w.age += dt;
  for (const c of day.queue) c.left -= dt;
  for (const c of day.queue) if (c.left <= 0) { day.stat.lost++; day.fx.push({ t: 'lost', slot: c.slot }); }
  day.queue = day.queue.filter(c => c.left > 0);
  // 주문이 다 준비된 손님은 줄 선 순서대로 자동 판매
  for (const c of [...day.queue]) {
    const r = serve(day, c.id);
    if (r) day.fx.push({ t: 'sale', slot: c.slot, ...r });
  }
  if (day.t < DAY_LEN && (day.nextSpawn -= dt) <= 0 && day.queue.length < 3) {
    day.queue.push(newCustomer(day, run, rng));
    day.nextSpawn = day.cfg.spawnEvery * (0.6 + 0.8 * rng());
  }
  // 재료가 떨어지고 굽는 것도 팔 것도 없으면 일찍 마감한다
  if (run.stock <= 0 && !day.warmer.length && day.molds.every(m => m.s === 'empty' || m.p > OVER_AT)) day.stat.soldOut = true; // 다 탄 칸은 없는 셈 친다
  return day.t >= DAY_LEN || !!day.stat.soldOut;
}

// 결과: 'pour' | 'nostock' | 'full' | 'auto' | 'perfect' | 'under' | 'over' | 'burnt'
export function tapMold(day, run, i, filling) {
  const m = day.molds[i], s = day.stat;
  if (m.s === 'empty') {
    if (run.stock <= 0) return 'nostock';
    run.stock--;
    day.molds[i] = { s: 'a', f: filling, p: 0 };
    return 'pour';
  }
  if (m.s === 'a' && day.cfg.auto) return 'auto'; // 자동 뒤집개가 있으면 첫 면은 손대지 않는다(실수로 덜 익혀 뒤집는 것 방지)
  const q = judge(m.p, day.cfg.wide);
  if (m.s === 'a') { m.qa = q; m.s = 'b'; m.p = 0; return q; }
  const fq = worst(m.qa, q);
  if (fq !== 'burnt' && day.warmer.length >= day.cfg.warmCap) return 'full';
  day.molds[i] = { s: 'empty' };
  s.baked++;
  if (fq === 'perfect') { s.perfect++; s.maxCombo = Math.max(s.maxCombo, ++s.combo); } else s.combo = 0;
  if (fq === 'burnt') s.burnt++; else day.warmer.push({ f: m.f, q: fq, age: 0 });
  return fq;
}

// 손님 주문을 채울 보온대 붕어빵(좋은 것부터). 모자라면 null.
export function pickFor(day, c) {
  const score = w => (w.q === 'perfect' ? 2 : 0) + (w.age <= day.cfg.keep ? 1 : 0);
  const picked = [];
  for (const [f, n] of Object.entries(c.order)) {
    const have = day.warmer.filter(w => w.f === f).sort((a, b) => score(b) - score(a));
    if (have.length < n) return null;
    picked.push(...have.slice(0, n));
  }
  return picked;
}

export function serve(day, id) {
  const c = day.queue.find(x => x.id === id), picked = c && pickFor(day, c);
  if (!picked) return null;
  const { cfg, stat } = day;
  let pay = 0, allPerfect = true;
  for (const w of picked) {
    const warm = w.age <= cfg.keep, good = w.q === 'perfect' && warm;
    allPerfect &&= good;
    pay += FILLINGS[w.f].price * cfg.price * (w.f === cfg.trend ? 1.3 : 1) * (good ? cfg.tip : w.q === 'perfect' ? 0.85 : 0.7);
  }
  pay = Math.round(pay / 100) * 100;
  day.warmer = day.warmer.filter(w => !picked.includes(w));
  day.queue = day.queue.filter(x => x !== c);
  stat.rev += pay; stat.sold += picked.length; stat.served++;
  if (c.regular && allPerfect) stat.aff[c.regular] = (stat.aff[c.regular] || 0) + 1;
  return { pay, allPerfect };
}

// 하루 정산. 새로 열린 단골 대사를 돌려준다.
export function settle(run, meta, day) {
  const s = day.stat, lines = [];
  run.money += s.rev - RENT; run.earned += s.rev; run.baked += s.baked; run.perfect += s.perfect;
  for (const [id, n] of Object.entries(s.aff)) {
    const was = meta.regulars[id] || 0, now = (meta.regulars[id] = was + n);
    run.aff += n;
    for (const step of AFF_STEPS) if (was < step && now >= step) lines.push({ id, line: REGULARS[id].lines[step] });
  }
  run.mods = newMods(); run.day++;
  return lines;
}

export const runOver = run => run.money < 0 || run.day > RUN_DAYS;

export function pickEvent(run, rng) {
  const ok = EVENTS.filter(e => !e.when || e.when(run)), story = ok.filter(e => e.when);
  return pick(story.length && rng() < 0.5 ? story : ok.filter(e => !e.when), rng);
}

export function buyStock(run, n) {
  const cost = n * STOCK_COST * run.mods.stockCost;
  if (run.money < cost) return false;
  run.money -= cost; run.stock += n;
  return true;
}

export const nextDev = run => DEV_ORDER.find(f => !run.fillings.includes(f));
export const upCost = (run, k) =>
  k === 'dev' ? (nextDev(run) ? DEV_COST[run.developed] : undefined) : UPGRADES[k].cost[run.up[k] || 0];

export function buyUpgrade(run, k) {
  const cost = upCost(run, k);
  if (cost == null || run.money < cost) return false;
  run.money -= cost;
  if (k === 'dev') { run.fillings.push(nextDev(run)); run.developed++; } else run.up[k] = (run.up[k] || 0) + 1;
  return true;
}

export const ending = (run, meta) => ENDINGS.find(e => e.test(run, meta)).id;

export function applyEnding(meta, id) {
  const e = ENDINGS.find(x => x.id === id), first = !meta.endings[id], fame = first ? 3 : 1;
  meta.endings[id] = (meta.endings[id] || 0) + 1;
  meta.fame += fame;
  if (e.unlock && !meta.unlocks.includes(e.unlock)) meta.unlocks.push(e.unlock);
  if (id === 'bankrupt') meta.coins += 500;
  return { fame, first };
}

export const hqRate = meta => 100 * meta.hq * (meta.unlocks.includes('branch') ? 1.5 : 1);

// 지난 시간만큼(최대 8시간) 본점 코인을 받는다.
export function collect(meta, now) {
  const gain = Math.floor(Math.min(8, Math.max(0, now - meta.lastSeen) / 3.6e6) * hqRate(meta));
  if (!gain) return 0;
  meta.coins += gain; meta.lastSeen = now;
  return gain;
}

export function upgradeHq(meta) {
  if (meta.fame < 2 * meta.hq) return false;
  meta.fame -= 2 * meta.hq; meta.hq++;
  return true;
}

export function buyPerm(meta, k) {
  const cost = PERMS[k].cost[meta.perm[k]];
  if (cost == null || meta.coins < cost) return false;
  meta.coins -= cost; meta.perm[k]++;
  return true;
}
