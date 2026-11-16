// 자동 플레이로 20일 런을 여러 번 돌려 엔딩 분포와 매출을 본다. 수치를 바꾼 뒤 `npm run balance`.
import * as S from '../src/sim.js';

const N = +process.argv[2] || 300;
// sd: 누르는 타이밍 오차(게이지 단위), react: 한 번 누른 뒤 다음 동작까지 걸리는 초
const SKILL = { 초보: { sd: 0.2, react: 0.7 }, 보통: { sd: 0.11, react: 0.45 }, 고수: { sd: 0.05, react: 0.25 } };
// ups: 사는 순서, pick: 이벤트별 고르는 선택지(없으면 무작위)
const STYLE = {
  돈: { hood: 'school', ups: ['mold', 'sign', 'fire', 'mold', 'sign', 'price', 'warmer', 'auto', 'fire', 'price', 'warmer'], pick: { franchise: 0, truck: 1, tv: 0, map: 0 } },
  품질: { hood: 'station', ups: ['auto', 'warmer', 'mold', 'fire', 'warmer', 'mold', 'sign'], pick: { franchise: 1, truck: 1 } },
  메뉴: { hood: 'school', ups: ['dev', 'dev', 'mold', 'dev', 'dev', 'sign', 'dev', 'mold'], pick: { franchise: 1, truck: 1 } },
  단골: { hood: 'market', ups: ['warmer', 'mold', 'auto', 'sign', 'mold', 'fire'], pick: { franchise: 1, truck: 1, tv: 1, map: 1, viral: 1, group: 0 } },
  트럭: { hood: 'school', ups: ['mold', 'sign', 'fire', 'mold'], pick: { franchise: 1, truck: 0, festival: 0 } },
};
const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());

function playDay(run, meta, sk) {
  const day = S.newDay(run, meta, Math.random), tgt = [], aim = () => 0.8 + gauss() * sk.sd;
  let cool = 0;
  while (!S.tick(day, 0.1, run, Math.random)) {
    if ((cool -= 0.1) > 0) continue;
    const due = day.molds.findIndex((m, i) => m.s !== 'empty' && !(m.s === 'a' && day.cfg.auto) && (m.p >= tgt[i] || m.p >= 1.29));
    if (due >= 0) {
      tgt[due] = S.tapMold(day, run, due) === 'full' ? day.molds[due].p + 0.15 : aim();
      cool = sk.react;
      continue;
    }
    const need = {};
    for (const c of day.queue) for (const [f, n] of Object.entries(c.order)) need[f] = (need[f] || 0) + n;
    for (const w of day.warmer) need[w.f]--;
    for (const m of day.molds) if (m.s !== 'empty') need[m.f]--;
    const f = Object.keys(need).find(k => need[k] > 0), e = day.molds.findIndex(m => m.s === 'empty');
    if (f && e >= 0 && run.stock > 0) { S.tapMold(day, run, e, f); tgt[e] = aim(); cool = sk.react; }
  }
  return day;
}

function playRun(skill, style, hood = STYLE[style].hood) {
  const meta = S.newMeta(0), run = S.newRun(meta, hood), st = STYLE[style];
  let ptr = 0;
  for (;;) {
    const day = playDay(run, meta, SKILL[skill]);
    S.settle(run, meta, day);
    if (S.runOver(run)) break;
    const ev = S.pickEvent(run, Math.random), ok = ev.choices.filter(c => !c.can || c.can(run));
    const want = ev.choices[st.pick[ev.id]];
    (ok.includes(want) ? want : ok[Math.floor(Math.random() * ok.length)]).do(run);
    const stockWant = Math.max(40, Math.round(day.stat.baked * 1.3) + 10);
    while (run.stock < stockWant && S.buyStock(run, 10));
    for (; ptr < st.ups.length; ptr++) {
      const cost = S.upCost(run, st.ups[ptr]);
      if (cost == null) continue;
      if (run.money - cost < 10000) break; // 재료 살 돈은 남긴다
      S.buyUpgrade(run, st.ups[ptr]);
    }
  }
  return { end: S.ending(run, meta), run };
}

const med = a => a.sort((x, y) => x - y)[a.length >> 1];
const row = (label, rs) => {
  const ends = {};
  for (const r of rs) ends[r.end] = (ends[r.end] || 0) + 1;
  const pct = Object.entries(ends).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round(v / rs.length * 100)}%`).join(', ');
  const ok = rs.filter(r => r.end !== 'bankrupt').map(r => r.run);
  const m = f => (ok.length ? med(ok.map(f)) : 0);
  console.log(`${label.padEnd(12)} 매출 ${String(Math.round(m(r => r.earned) / 1000)).padStart(4)}천  완벽 ${String(Math.round(m(r => S.perfectRate(r)) * 100)).padStart(3)}%  호감 ${String(m(r => r.aff)).padStart(3)}  메뉴 ${m(r => r.developed)}  | ${pct}`);
};

console.log(`런 ${N}회씩 (매출·완벽률·호감·메뉴는 폐업 제외 중앙값)\n`);
for (const skill of Object.keys(SKILL)) for (const style of Object.keys(STYLE))
  row(`${skill} ${style}`, Array.from({ length: N }, () => playRun(skill, style)));
console.log('\n동네별 (보통 실력, 돈 스타일)');
for (const hood of ['school', 'station', 'market', 'office'])
  row(hood, Array.from({ length: N }, () => playRun('보통', '돈', hood)));
