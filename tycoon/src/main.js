// 화면 그리기와 입력. 규칙은 전부 sim.js에 있다.
import * as S from './sim.js';
import * as D from './data.js';
import { load, save } from './save.js';

const app = document.getElementById('app'), toastEl = document.getElementById('toast');
const st = load();
const won = n => Math.round(n).toLocaleString('ko-KR') + '원';
const fill = f => D.FILLINGS[f];
const FEEDBACK = { perfect: '완벽!', under: '덜 익음', over: '살짝 탔다', burnt: '탔다…💨', nostock: '재료 없음!', full: '진열장 꽉 참!' };

let day, sel, raf, eve = {}, toastTimer, els;

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('on'), 1400);
}

function show(html) {
  cancelAnimationFrame(raf);
  app.innerHTML = html;
  scrollTo(0, 0);
}

// ---------- 손맛: 효과음, 진동, 애니메이션 ----------
// 전부 Web Audio 합성이라 소리 파일이 없다.
let ac, hiss;
function tone(freq, dur = 0.1, type = 'sine', at = 0, vol = 0.07, to) {
  if (st.mute || !ac) return;
  const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + at;
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur); // 음높이 미끄러짐
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); // 짧은 어택: 딱 소리 방지
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
}
// 걸러낸 백색소음: 지글지글, 휙
function noise(dur, vol = 0.05, hp = 3000, at = 0) {
  if (st.mute || !ac) return;
  if (!hiss) {
    hiss = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = hiss.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime + at;
  n.buffer = hiss; f.type = 'highpass'; f.frequency.value = hp;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  n.connect(f).connect(g).connect(ac.destination); n.start(t); n.stop(t + dur);
}
const SFX = {
  pour: () => { noise(0.35, 0.05); tone(320, 0.12, 'sine', 0, 0.06, 140); },
  flip: () => { noise(0.12, 0.04, 1500); tone(500, 0.08, 'triangle', 0.03, 0.04, 760); },
  perfect: () => [784, 988, 1319].forEach((f, i) => tone(f, 0.22, 'triangle', i * 0.06, 0.06)),
  under: () => { tone(392, 0.12, 'triangle'); tone(330, 0.18, 'triangle', 0.1); },
  over: () => { tone(220, 0.16, 'triangle', 0, 0.07, 160); noise(0.2, 0.04, 2000); },
  burnt: () => { tone(160, 0.35, 'sawtooth', 0, 0.05, 60); noise(0.4, 0.06, 800); },
  sale: () => { tone(1319, 0.09, 'sine', 0, 0.06); tone(1760, 0.3, 'sine', 0.07, 0.06); tone(3520, 0.2, 'sine', 0.07, 0.015); },
  lost: () => { tone(311, 0.16, 'triangle'); tone(233, 0.28, 'triangle', 0.14); },
  nostock: () => { tone(196, 0.07, 'square', 0, 0.03); tone(196, 0.07, 'square', 0.1, 0.03); },
};
SFX.full = SFX.nostock;

// 배경음악: 5음계 8마디를 계속 돌린다. [미디 음, 박] — 0은 쉼표
const TUNE = [[64, 1], [67, 1], [69, 1], [67, 1], [64, 1], [62, 1], [60, 2], [62, 1], [64, 1], [67, 1], [64, 1], [62, 3], [0, 1],
  [64, 1], [67, 1], [69, 1], [72, 1], [69, 1], [67, 1], [64, 2], [67, 1], [64, 1], [62, 1], [64, 1], [60, 3], [0, 1]];
const BASS = [48, 45, 41, 43, 48, 45, 43, 48], BEAT = 0.6;
const hz = m => 440 * 2 ** ((m - 69) / 12);
let bgmI = 0, bgmT = null;
setInterval(() => {
  if (st.mute || !ac || ac.state !== 'running' || document.hidden) return (bgmT = null); // 끊겼다 돌아오면 처음부터
  if (bgmT == null || bgmT < ac.currentTime) { bgmT = ac.currentTime + 0.1; bgmI = 0; }
  while (bgmT < ac.currentTime + 0.4) {
    const [m, beats] = TUNE[bgmI], at = bgmT - ac.currentTime;
    if (m) tone(hz(m), beats * BEAT * 0.95, 'triangle', at, 0.022);
    const beat = TUNE.slice(0, bgmI).reduce((a, n) => a + n[1], 0);
    if (beat % 4 === 0) tone(hz(BASS[beat / 4]), BEAT * 3.5, 'sine', at, 0.035);
    bgmT += beats * BEAT;
    bgmI = (bgmI + 1) % TUNE.length;
  }
}, 100);
// 브라우저는 첫 입력 뒤에만 소리를 허용한다
addEventListener('pointerdown', () => { try { ac ??= new AudioContext(); ac.resume(); } catch {} });
const buzz = ms => navigator.vibrate?.(ms);

function anim(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth; // 같은 애니메이션을 연달아 다시 재생
  el.classList.add(cls);
}
function float(parent, text, cls) {
  const s = document.createElement('span');
  s.className = `float ${cls}`;
  s.textContent = text;
  s.addEventListener('animationend', () => s.remove());
  parent.append(s);
}

// ---------- 그림 ----------
// 이미지는 assets/web/*.webp (원본 assets/*.png 를 `npm run assets` 로 변환한 것)
const img = (name, cls = '') => `<img class="${cls}" src="assets/web/${name}.webp" alt="" draggable="false">`;
const FISH = `<span class="fish">${img('fish_raw')}${img('fish_golden', 'g')}${img('fish_burnt', 'b')}</span>`;
// 소·상점 물건 아이콘. 그림이 없으면 이모지로 대체된다
const ico = f => `<img class="ico" src="assets/web/fill_${f}.webp" alt="" onerror="this.replaceWith('${fill(f).icon}')">`;
const upIco = (k, emoji) => `<img src="assets/web/up_${k}.webp" alt="" onerror="this.replaceWith('${emoji}')">`;
const person = c => img(c.regular ? `reg_${c.regular}` : `cust_${c.id % 2 + 1}`, 'person');
// 엔딩 삽화는 있는 것만 보인다
const endImg = id => `<img class="endimg" src="assets/web/end_${id}.webp" alt="" onerror="this.remove()">`;
const bld = (act, arg, x, y, art, name, sub, o = {}) =>
  `<button class="bld ${o.cls || ''}" data-act="${act}" data-arg="${arg}" style="left:${x}%;top:${y}%" ${o.off ? 'disabled' : ''}>${img(art)}<b>${name}</b><small>${sub}</small></button>`;

// ---------- 타이틀 / 본점 ----------
function title() {
  const m = st.meta, gain = S.collect(m, Date.now()), hqCost = 2 * m.hq;
  save(st);
  show(`${img('fish_golden', 'logo')}<h1>붕어빵 타이쿤</h1>
    ${gain ? `<p class="note">자리를 비운 사이 본점이 🪙 ${gain.toLocaleString()}코인을 벌었어요.</p>` : ''}
    <button class="big" data-act="run">${st.run ? `이어하기 (${st.run.day}일차)` : '새 겨울 시작'}</button>
    <div class="row"><button data-act="book">📖 엔딩 도감 ${Object.keys(m.endings).length}/${D.ENDINGS.length}</button>
      <button data-act="mute" aria-pressed="${!st.mute}">${st.mute ? '🔇 소리 끔' : '🔊 소리 켬'}</button></div>
    <section><h2>🏠 본점 Lv.${m.hq}</h2>
      <p class="dim">시간당 ${S.hqRate(m)}코인 · 최대 8시간분 누적</p>
      <p>🪙 ${m.coins.toLocaleString()}코인 · ⭐ 명성 ${m.fame}</p>
      <button data-act="hq" ${m.fame < hqCost ? 'disabled' : ''}>본점 확장 <small>⭐ 명성 ${hqCost} — 엔딩을 보면 명성을 얻는다</small></button>
      ${Object.entries(D.PERMS).map(([k, p]) => {
        const c = p.cost[m.perm[k]];
        return `<button data-act="perm" data-arg="${k}" ${c == null || m.coins < c ? 'disabled' : ''}>${p.name} <small>${c == null ? '최대 단계' : `🪙 ${c.toLocaleString()} · ${m.perm[k]}/${p.cost.length}단계`}</small></button>`;
      }).join('')}
    </section>`);
}

function book() {
  const got = st.meta.endings;
  show(`<h2>📖 엔딩 도감</h2>
    ${D.ENDINGS.map(e => got[e.id]
      ? `<section>${endImg(e.id)}<h2>${e.icon} ${e.name} <span class="dim">×${got[e.id]}</span></h2><p>${e.text}</p><p class="dim">계승: ${e.legacy}</p></section>`
      : `<section><h2>🔒 ${e.hidden ? '?????' : e.name}</h2><p class="dim">아직 보지 못한 결말</p></section>`).join('')}
    <button data-act="title">돌아가기</button>`);
}

// ---------- 지도 ----------
function cityMap() {
  show(`<h2>어느 동네에서 장사할까?</h2>
    <div class="map city">${Object.entries(D.HOODS).map(([id, h]) => {
      const open = !h.unlock || st.meta.unlocks.includes(h.unlock);
      return bld('start', id, h.x, h.y, `b_${id}`, open ? h.name : '🔒 ???', open ? h.desc : `${h.hint}으로 열림`, { off: !open });
    }).join('')}</div>
    <button data-act="title">돌아가기</button>`);
}

function hub() {
  const run = st.run;
  show(`<div class="hud"><span>${run.day}일차 준비 (${D.RUN_DAYS}일 중)</span><span>💰 <b>${won(run.money)}</b></span><span>재료 <b>${run.stock}</b>개</span></div>
    <div class="map town">
      ${bld('grocer', '', 23, 20, 'b_grocer', '재료상점', '재료 · 신메뉴')}
      ${bld('furniture', '', 77, 20, 'b_furniture', '가구상점', '틀 · 버너 · 간판')}
      ${bld('next', '', 27, 55, 'b_cart', '내 포장마차', `${run.day}일차 영업 시작`, { cls: 'main' })}
      ${bld('title', '', 75, 56, 'b_hq', '본점', '저장하고 나가기')}
    </div>
    ${run.stock < 10 ? '<p class="note">재료가 얼마 없다. 재료상점에 들르자.</p>' : '<p class="dim">상점에서 준비하고, 포장마차를 눌러 영업을 시작한다.</p>'}`);
}

const wallet = run => `<p>💰 <b>${won(run.money)}</b> · 재료 ${run.stock}개</p>`;
const pips = (n, max) => `<span class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;

function grocer() {
  const run = st.run, dev = S.nextDev(run), devCost = S.upCost(run, 'dev');
  const pack = n => {
    const cost = n * D.STOCK_COST * run.mods.stockCost;
    return `<button class="item" data-act="stock" data-arg="${n}" ${run.money < cost ? 'disabled' : ''}><span class="ic">📦</span>재료 ${n}개<small>${won(cost)}</small></button>`;
  };
  show(`<h2>🫘 재료상점</h2><p class="note">"${run.mods.stockCost > 1 ? '요즘 팥값이 금값이야. 미안해.' : '오늘 팥 좋아. 넉넉히 가져가.'}"</p>
    <section>${wallet(run)}${pack(10)}${pack(30)}</section>
    <section><h2>신메뉴 개발 ${pips(run.developed, D.DEV_ORDER.length)}</h2>
      ${dev ? `<button class="item" data-act="up" data-arg="dev" ${run.money < devCost ? 'disabled' : ''}><span class="ic">${ico(dev)}</span>${fill(dev).name} 붕어빵<small>${won(devCost)} · 개당 ${won(fill(dev).price)}에 팔린다</small></button>` : '<p class="dim">모든 메뉴를 개발했다.</p>'}
      <p class="dim">지금 메뉴: ${run.fillings.map(f => ico(f) + fill(f).name).join(' · ')}</p></section>
    <button data-act="hub">마을로 돌아가기</button>`);
}

function furniture() {
  const run = st.run;
  show(`<h2>🛋️ 가구상점</h2><p class="note">"포장마차도 장비빨이야. 구경해 봐."</p>
    <section>${wallet(run)}
    ${Object.entries(D.UPGRADES).map(([k, u]) => {
      const cost = S.upCost(run, k);
      return `<button class="item" data-act="up" data-arg="${k}" ${cost == null || run.money < cost ? 'disabled' : ''}><span class="ic">${upIco(k, u.icon)}</span><span>${u.name} ${pips(run.up[k] || 0, u.cost.length)}</span><small>${cost == null ? '최고 단계' : won(cost)} · ${u.desc}</small></button>`;
    }).join('')}</section>
    <button data-act="hub">마을로 돌아가기</button>`);
}

// ---------- 하루 영업 ----------
function startDay() {
  const run = st.run;
  day = S.newDay(run, st.meta, Math.random);
  sel = run.fillings[0];
  const { cfg } = day, n = day.molds.length, up = k => run.up[k] || 0,
    gear = k => (up(k) ? `<span class="g-${k} l${up(k)}">${upIco(k, D.UPGRADES[k].icon)}</span>` : ''), zoneFrom = (cfg.wide ? 0.52 : 0.6) / D.BURN_AT, zoneTo = 1 / D.BURN_AT;
  show(`<div class="scene ${cfg.weather.includes('눈') ? 'snow' : ''}"><div class="gear">${gear('price')}${gear('sign')}</div><div class="slots">${'<div class="slot"></div>'.repeat(3)}</div></div>
    <div class="hud" id="hud"></div><div class="time"><i id="time"></i></div>
    <div class="warmer l${up('warmer')}" id="warmer" aria-label="보온 진열장"></div>
    <div class="plate n${n} fire${up('fire')}" style="--z0:${zoneFrom};--z1:${zoneTo};--z2:${D.OVER_AT / D.BURN_AT}"><i class="burner"></i>${gear('auto')}${day.molds.map((_, i) => {
      // 진짜 회전식 틀처럼 원판 둘레에 머리가 바깥을 향하게 놓는다
      const a = i * 360 / n - 90, rad = a * Math.PI / 180, R = { 4: 25, 6: 28, 9: 32 }[n];
      return `<button class="mold" data-act="mold" data-arg="${i}" data-s="empty" style="left:${50 + R * Math.cos(rad)}%;top:${50 + R * Math.sin(rad)}%;--rot:${a - 180}deg">
        <i class="ring"></i><i class="hand"></i><span class="rot">${img('mold', 'cav')}${FISH}</span><span class="lbl"></span></button>`;
    }).join('')}</div>
    <div class="fills">${run.fillings.map(f => `<button data-act="fill" data-arg="${f}" aria-pressed="${f === sel}">${ico(f)} ${fill(f).name}<span class="need"></span></button>`).join('')}</div>
    ${cfg.auto ? '<p class="dim">🤖 자동 뒤집개가 뒤집어 준다. 반죽을 붓고, 흰 점이 초록에 오면 꺼내기만 하면 된다.</p>' : run.day === 1 ? '<p class="dim">① 소를 고르고 빈 틀을 눌러 반죽 ② 흰 점이 초록에 오면 뒤집기 ③ 다시 초록에서 꺼내기. 주황은 살짝 탄 것(싸게 팔림), 빨강은 버려야 한다. 주문이 다 구워지면 알아서 팔린다.</p>' : ''}`);
  els = {
    hud: app.querySelector('#hud'), time: app.querySelector('#time'), warmer: app.querySelector('#warmer'),
    slots: [...app.querySelectorAll('.slot')], molds: [...app.querySelectorAll('.mold')],
    fills: [...app.querySelectorAll('[data-act=fill]')],
  };
  let last = performance.now(), wSig;
  const slotSig = [];
  const set = (el, text) => { if (el.textContent !== text) el.textContent = text; };
  const setH = (el, html) => { if (el._h !== html) el.innerHTML = el._h = html; };

  const frame = now => {
    const dt = Math.min(0.1, (now - last) / 1000); // 탭이 숨겨지면 rAF가 멈춰 게임도 멈춘다
    last = now;
    const over = S.tick(day, dt, run, Math.random), { stat } = day;

    for (const f of day.fx) {
      const slot = els.slots[f.slot];
      if (f.t === 'sale') { float(slot, `+${won(f.pay)}${f.allPerfect ? ' ✨' : ''}`, 'sale'); SFX.sale(); }
      else if (f.t === 'flip') { anim(els.molds[f.i], 'flip'); float(els.molds[f.i], '🤖 뒤집음', 'auto'); SFX.flip(); }
      else { float(slot, '💢 가 버렸다', 'lost'); SFX.lost(); buzz(60); }
    }

    setH(els.hud, `<span>${run.day}일차 · ${cfg.hoodName} · ${cfg.weather}</span><span>💰 <b>${won(run.money + stat.rev)}</b></span><span>재료 <b>${run.stock}</b></span>`
      + (stat.combo > 1 ? `<span>🔥 <b>${stat.combo}</b>연속 완벽</span>` : '') + (cfg.trend ? `<span>📈 유행 <b>${fill(cfg.trend).name}</b></span>` : '')
      + (run.stock <= 0 ? '<button data-act="close">재료 소진 · 마감하기</button>' : ''));
    els.time.style.width = `${Math.max(0, 1 - day.t / D.DAY_LEN) * 100}%`;

    // 틀
    day.molds.forEach((m, i) => {
      const el = els.molds[i], z = m.s === 'empty' ? '' : m.s === 'a' && cfg.auto ? 'auto' : S.judge(m.p, cfg.wide), s = m.s === 'empty' ? 'empty' : `${m.s} ${z}`;
      if (el.dataset.s !== s) el.dataset.s = s;
      const p = m.p || 0;
      el.style.setProperty('--g', p / D.BURN_AT);
      el.style.setProperty('--p', Math.min(1, p));
      el.style.setProperty('--over', Math.max(0, (p - 1) / (D.BURN_AT - 1)));
      setH(el.children[3], m.s === 'empty' ? '반죽' : z === 'auto' ? '🤖 굽는 중' : `${ico(m.f)} ${z === 'burnt' ? '버리기' : m.s === 'a' ? '뒤집기' : '꺼내기'}`);
    });

    // 진열장
    const ws = day.warmer.map(w => w.f + w.q + (w.age > cfg.keep)).join();
    if (ws !== wSig) {
      wSig = ws;
      els.warmer.innerHTML = `<small>${day.warmer.length}/${cfg.warmCap}</small>` + day.warmer.map(w =>
        `<span class="wf ${w.q} ${w.age > cfg.keep ? 'cold' : ''}">${FISH}<b>${ico(w.f)}</b></span>`).join('');
    }

    // 손님과, 소별로 더 구워야 할 개수
    const have = {}, need = {};
    for (const w of day.warmer) have[w.f] = (have[w.f] || 0) + 1;
    for (const c of day.queue) for (const [f, n] of Object.entries(c.order)) need[f] = (need[f] || 0) + n;
    els.slots.forEach((el, i) => {
      const c = day.queue.find(x => x.slot === i), r = c && D.REGULARS[c.regular];
      const sig = c ? c.id + Object.entries(c.order).map(([f, n]) => (have[f] || 0) >= n).join() : '';
      if (slotSig[i] !== sig) {
        const fresh = !c || !String(slotSig[i] || '').startsWith(c.id);
        slotSig[i] = sig;
        const old = el.querySelector('div');
        const html = c ? `<div ${fresh ? '' : 'style="animation:none"'}><span class="bubble">${Object.entries(c.order).map(([f, n]) =>
            `<span class="${(have[f] || 0) >= n ? 'ok' : ''}">${ico(f)}×${n}</span>`).join('')}</span>
          ${person(c)}<span class="who">${r ? `<b>${r.icon} ${r.name}</b>` : `"${c.say}"`}</span><span class="pat"><i></i></span></div>` : '';
        if (old) old.remove();
        el.insertAdjacentHTML('afterbegin', html);
      }
      if (c) {
        const ratio = c.left / c.max;
        el.querySelector('.pat i').style.width = `${ratio * 100}%`;
        el.classList.toggle('angry', ratio < 0.3);
      } else el.classList.remove('angry');
    });
    for (const m of day.molds) if (m.s !== 'empty') have[m.f] = (have[m.f] || 0) + 1;
    for (const b of els.fills) {
      const f = b.dataset.arg, n = (need[f] || 0) - (have[f] || 0);
      set(b.lastChild, n > 0 ? `${n}개 더` : '');
    }

    if (over) return endDay();
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
}

function endDay() {
  const run = st.run, stat = day.stat, lines = S.settle(run, st.meta, day);
  if (S.runOver(run)) return finish();
  eve = { stat, lines, ev: S.pickEvent(run, Math.random) };
  save(st); // shortcut: 이벤트를 고르기 전에 새로고침하면 이벤트가 사라진다. 악용이 문제 되면 이벤트 id도 저장한다.
  evening();
}

// ---------- 저녁 정산 ----------
function evening() {
  const run = st.run, { stat, lines, ev, msg } = eve;
  show(`<section><h2>🌙 ${run.day - 1}일차 정산</h2>${stat.soldOut ? '<p class="dim">재료가 다 떨어져 일찍 마감했다.</p>' : ''}<table>
      <tr><td>매출</td><td>${won(stat.rev)}</td></tr>
      <tr><td>자릿세</td><td>-${won(D.RENT)}</td></tr>
      <tr><td>판매 / 놓친 손님</td><td>${stat.sold}개 / ${stat.lost}명</td></tr>
      <tr><td>완벽 / 구운 수</td><td>${stat.perfect} / ${stat.baked}</td></tr>
      <tr><td>최대 연속 완벽</td><td>${stat.maxCombo}</td></tr></table>
      ${lines.map(l => `<p class="note">${D.REGULARS[l.id].icon} ${D.REGULARS[l.id].name}: ${l.line}</p>`).join('')}</section>
    ${ev ? `<section><h2>${ev.title}</h2><p>${ev.text}</p>
      ${ev.choices.map((c, i) => `<button data-act="ev" data-arg="${i}" ${c.can && !c.can(run) ? 'disabled' : ''}>${c.label}</button>`).join('')}</section>`
    : `<p class="note">${msg}</p><button class="big" data-act="hub">마을로 가기</button>`}`);
}

// ---------- 엔딩 ----------
function finish() {
  const run = st.run, id = S.ending(run, st.meta), e = D.ENDINGS.find(x => x.id === id);
  const { fame, first } = S.applyEnding(st.meta, id);
  const rate = Math.round(S.perfectRate(run) * 100);
  eve = { share: `🐟 붕어빵 타이쿤 — ${e.icon} "${e.name}" 엔딩\n매출 ${won(run.earned)} · 완벽률 ${rate}% · 도감 ${Object.keys(st.meta.endings).length}/${D.ENDINGS.length}` };
  st.run = null;
  save(st);
  show(`${endImg(id)}<div class="ending"><p class="icon">${e.icon}</p><h1>${e.name}</h1><p>${e.text}</p></div>
    <section><table>
      <tr><td>총매출</td><td>${won(run.earned)}</td></tr>
      <tr><td>완벽률</td><td>${rate}% (${run.perfect}/${run.baked})</td></tr>
      <tr><td>단골 호감</td><td>${run.aff}</td></tr>
      <tr><td>개발한 메뉴</td><td>${run.developed}개</td></tr></table></section>
    <p class="note">⭐ 명성 +${fame}${first ? ` · 새 계승: ${e.legacy}` : ''}</p>
    <button data-act="share">결과 공유하기</button>
    <button class="big" data-act="title">본점으로</button>`);
}

// ---------- 입력 ----------
const acts = {
  title, book, hub, grocer, furniture, next: startDay,
  close: () => { cancelAnimationFrame(raf); day.stat.soldOut = true; endDay(); },
  run: () => (st.run ? hub() : cityMap()),
  mute: () => { st.mute = !st.mute; title(); },
  hq: () => { S.upgradeHq(st.meta); title(); },
  perm: k => { S.buyPerm(st.meta, k); title(); },
  start: h => { st.run = S.newRun(st.meta, h); startDay(); },
  mold: i => {
    const el = els.molds[i], wasA = day.molds[i].s === 'a', r = S.tapMold(day, st.run, +i, sel);
    if (r === 'auto') return float(el, '알아서 뒤집어요', 'auto');
    SFX[r]();
    if (wasA) SFX.flip();
    anim(el, wasA ? 'flip' : 'pop');
    if (r === 'pour') return;
    float(el, FEEDBACK[r], r);
    buzz(r === 'perfect' ? 15 : 40);
  },
  fill: f => {
    sel = f;
    for (const b of els.fills) b.setAttribute('aria-pressed', b.dataset.arg === f);
  },
  ev: i => { eve = { ...eve, ev: null, msg: eve.ev.choices[i].do(st.run) }; save(st); evening(); },
  stock: n => { if (S.buyStock(st.run, +n)) SFX.sale(); save(st); grocer(); },
  up: k => { if (S.buyUpgrade(st.run, k)) SFX.perfect(); save(st); (k === 'dev' ? grocer : furniture)(); },
  share: async () => {
    try {
      if (navigator.share) await navigator.share({ text: eve.share });
      else { await navigator.clipboard.writeText(eve.share); toast('결과를 복사했다'); }
    } catch {} // 공유 취소
  },
};

app.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (b && !b.disabled) acts[b.dataset.act](b.dataset.arg);
});

navigator.serviceWorker?.register('sw.js').catch(() => {});
title();
