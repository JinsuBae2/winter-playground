// 장면(메뉴 → 입장 → 플레이 → 들킴 → 결과)을 넘기는 껍데기. 규칙은 sim.js, 그림은 stage.js, 소리는 audio.js 가 맡는다.
import { LEVELS, PLACES, NAMES, BASINS, AISLE_Y, WASH_Y, SEAT_Y, DOOR_X, HALL_X, INTRO_SECONDS, STARE_SECONDS, CLOSE_CALL } from './data.js';
import { newGame, step, visitor, visitorsAt, seeded } from './sim.js';
import { createStage } from './stage.js';
import { sfx, ambience, hush, toggleMute, muted } from './audio.js';

const $ = s => document.querySelector(s);
const ui = {
  gauge: $('.gauge'), percent: $('.gauge strong'), dialog: $('dialog'), headline: $('#headline'), result: $('#result'),
  start: $('#start'), back: $('#menu'), share: $('#share'), push: $('#push'), status: $('#status'), score: $('#score'), best: $('#best'),
  menu: $('.menu'), places: $('#places'), levels: $('#levels'), daily: $('#daily'), endless: $('#endless'), levelName: $('#levelName'),
  album: $('.album'), albumOpen: $('#albumOpen'), albumClose: $('#albumClose'), albumList: $('#albumList'), mute: $('#mute'),
};
const draw = createStage($('canvas'));

// ── 무엇을 플레이하나. kind: normal(장소 × 난이도) · daily(오늘의 화장실) · endless(무한 모드)
let kind = 'normal', level = 'NORMAL', place = 'office';
const now = new Date(), today = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
const dailyPlace = Object.keys(PLACES)[today % 3]; // 오늘의 화장실은 날짜가 씨앗이라 모두 같은 판을 한다

// ── 저장: 기록과 도감. 회사 NORMAL 은 예전 버전의 키를 그대로 이어받는다.
const read = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }; // 사생활 보호 모드 등: 저장 없이 계속 플레이
const record = key => { const saved = read(key); return saved && Number.isFinite(saved.score) && saved.score >= 0 ? saved : null; };
const levelKey = (name, where) => 'samuldong.records.v1' + (name === 'NORMAL' ? '' : '.' + name) + (where === 'office' ? '' : '.' + where);
const recordKey = () => (kind === 'daily' ? 'samuldong.daily.v1.' + today : kind === 'endless' ? 'samuldong.endless.v1' : levelKey(level, place));
const bestText = saved => (!saved ? '기록 없음' : saved.laps !== undefined ? `최고 ${saved.laps}바퀴 · ${saved.score}점` : `최고 ${saved.score}점`);
let best = null;

// 들킨 도감: 누구에게 어떻게 들켰는지 모은다
const CAUSES = { walk: '지나가다 들음', wash: '손 씻다가 들음', stall: '옆 칸에서 숨죽이다 들음' };
const ENTRIES = [
  ...NAMES.flatMap((name, who) => Object.keys(CAUSES).map(c => ({ id: who + '-' + c, text: name + ' · ' + CAUSES[c] }))),
  { id: 'knock', text: '내 칸 문을 두드리던 사람' }, { id: 'leak', text: '참다 못해 새어 나옴' },
];
const album = new Set(Array.isArray(read('samuldong.album.v1')) ? read('samuldong.album.v1') : []);

// ── 입력: 스페이스와 버튼 중 하나라도 눌려 있으면 힘주는 중
const input = {
  keyboard: false, pointer: null,
  get held() { return this.keyboard || this.pointer !== null; },
  clear() { this.keyboard = false; this.pointer = null; this.show(); },
  show() { ui.push.classList.toggle('pressed', this.held); },
};
ui.push.onpointerdown = e => {
  if (scene !== 'play' || input.pointer !== null || e.button !== 0) return;
  e.preventDefault(); input.pointer = e.pointerId; ui.push.setPointerCapture(e.pointerId); input.show();
};
ui.push.onpointerup = ui.push.onpointercancel = ui.push.onlostpointercapture = e => {
  if (e.pointerId === input.pointer) { input.pointer = null; input.show(); }
};
window.onkeydown = e => {
  if (e.code === 'Space' && scene === 'play') { e.preventDefault(); if (!e.repeat) input.keyboard = true; input.show(); }
};
window.onkeyup = e => { if (e.code === 'Space') { input.keyboard = false; input.show(); } };
window.onblur = () => input.clear();
document.onvisibilitychange = () => { input.clear(); hush(); previous = performance.now(); };

// ── 장면: enter 는 들어올 때 한 번, update 는 스텝마다. clock 은 지금 장면에 들어온 뒤 흐른 시간.
let scene = 'title', clock = 0, game = null, exit = null, shareText = '';
function go(name) { scene = name; clock = 0; scenes[name].enter?.(); }
const cause = g => (g.act === 'walk' ? 'walk' : g.act === 'wash' || g.act === 'shake' ? 'wash' : g.act === 'knock' ? 'knock' : 'stall');
function reason() {
  const g = game.culprits[0], name = NAMES[g.who];
  const why = { walk: name + ', 지나가는 중이었다', wash: name + ', 손 씻는 중이었다', knock: name + ', 내 칸 문을 두드리던 중이었다', stall: '옆 칸의 ' + name + ', 숨죽이고 있었다' }[cause(g)];
  return (game.leaked ? '참다 못해 새어 나왔다! ' : '') + why;
}
const title = () => (kind === 'daily' ? '오늘의 화장실' : kind === 'endless' ? '무한 모드' : PLACES[place].name + ' ' + level);
function showResult(headline, detail) {
  ui.headline.textContent = headline; ui.result.textContent = detail;
  shareText = `사람 몰래 똥싸기 · ${title()}\n${headline}\n${detail}`;
  ui.dialog.open = true; ui.start.focus({ preventScroll: true });
}
function showMenu() {
  for (const button of ui.places.children) button.setAttribute('aria-pressed', button.dataset.place === place);
  for (const button of ui.levels.children) {
    const name = button.dataset.level;
    button.innerHTML = `<b>${name}</b><small>동시 ${LEVELS[name].max}명 · ${bestText(record(levelKey(name, place)))}</small>`;
    if (name === level) button.focus({ preventScroll: true });
  }
  ui.daily.innerHTML = `<b>오늘의 화장실</b><small>${PLACES[dailyPlace].name} · ${bestText(record('samuldong.daily.v1.' + today))}</small>`;
  ui.endless.innerHTML = `<b>무한 모드</b><small>${bestText(record('samuldong.endless.v1'))}</small>`;
  ui.albumOpen.innerHTML = `<b>들킨 도감</b><small>${album.size} / ${ENTRIES.length}</small>`;
}
// 성공한 뒤 태연하게 문 열고 나와 손 씻고 나가는 길
function exitRoute() {
  const sink = [1, 0, 2].find(i => !game.routes.some(r => r.sink === i)) ?? 1;
  let t = 0, x = 510, y = SEAT_Y;
  const steps = [[0, x, y, 'cheer']];
  const add = (seconds, nx, ny, act) => { t += seconds; x = nx; y = ny; steps.push([t, x, y, act]); };
  const walk = (nx, ny) => add(Math.hypot(nx - x, ny - y) / 235, nx, ny, 'walk');
  add(1, x, y, 'cheer'); add(.45, x, y, 'open'); walk(510, AISLE_Y); walk(BASINS[sink], AISLE_Y); walk(x, WASH_Y);
  add(1.3, x, y, 'wash'); add(.45, x, y, 'shake'); walk(x, AISLE_Y); walk(DOOR_X, AISLE_Y); add(.55, HALL_X, AISLE_Y, 'depart');
  return { steps, who: -1, lane: 510 };
}
// 방문객의 행동이 바뀌는 순간마다 소리를 낸다
const heard = new Map();
let leaking = false, laps = 0, closeCalls = 0;
function hear() {
  let washing = 0, drying = 0;
  for (const g of visitorsAt(game)) {
    if (g.act === 'away') { heard.delete(g.who); continue; }
    const before = heard.get(g.who) || {}, beat = Math.floor(g.elapsed / .3);
    if (g.act !== before.act) ({ close: sfx.latch, open: sfx.latch, inhale: sfx.inhale, strain: sfx.grunt, knock: sfx.knock, phone: sfx.ring })[g.act]?.();
    if (['walk', 'approach', 'phone'].includes(g.act) && (g.act !== before.act || beat !== before.beat)) sfx.step(g.act === 'approach' ? .45 : 1);
    heard.set(g.who, { act: g.act, beat });
    washing += g.act === 'wash'; drying += g.act === 'dry';
  }
  if (game.leak > 0 && !leaking) sfx.leak();
  leaking = game.leak > 0;
  if (game.laps > laps) sfx.lap();
  if (game.closeCalls > closeCalls) sfx.close();
  laps = game.laps; closeCalls = game.closeCalls;
  ambience(washing, drying, input.held || leaking);
}
const scenes = {
  title: { // 메뉴: 장소와 난이도를 고르면 바로 시작한다
    enter() { game = null; ui.dialog.open = false; ui.album.hidden = true; ui.menu.hidden = false; showMenu(); },
  },
  intro: {
    enter() {
      input.clear(); ui.menu.hidden = true; ui.dialog.open = false;
      game = kind === 'daily' ? newGame('HARD', seeded(today), { place: dailyPlace })
        : newGame(kind === 'endless' ? 'EASY' : level, Math.random, { place, endless: kind === 'endless' });
      best = record(recordKey()); heard.clear(); leaking = false; laps = closeCalls = 0;
    },
    update() { if (clock >= INTRO_SECONDS) go('play'); },
  },
  play: {
    update(dt) {
      const event = step(game, dt, input.held); // 'caught' 또는 'won'
      if (event) go(event); else hear();
    },
  },
  caught: { // 팝업 없이 정적 → 고개 돌리기를 다 보여 준 다음에 결과로 넘어간다
    enter() { input.clear(); hush(); if (game.leaked && !leaking) sfx.leak(); },
    update(dt) {
      if (clock >= .7 && clock - dt < .7) sfx.stare();
      if (clock >= STARE_SECONDS) go('lost');
    },
  },
  lost: {
    enter() {
      const id = game.leaked ? 'leak' : cause(game.culprits[0]) === 'knock' ? 'knock' : game.culprits[0].who + '-' + cause(game.culprits[0]);
      const fresh = !album.has(id);
      album.add(id); write('samuldong.album.v1', [...album]);
      const score = Math.round(game.points);
      if (kind === 'endless' && (!best || game.laps > best.laps || (game.laps === best.laps && score > best.score))) {
        best = { laps: game.laps, score }; write(recordKey(), best);
      }
      showResult('당신은 똥쟁이가 되었습니다',
        reason() + ' · ' + (kind === 'endless' ? game.laps + '바퀴 ' : '') + score + '점' + (fresh ? ' · 도감에 새로 기록!' : ''));
    },
  },
  won: {
    enter() {
      input.clear(); hush(); sfx.win(); exit = exitRoute();
      const score = Math.round(game.points);
      best = { score: Math.max(best?.score || 0, score), seconds: Math.min(best?.seconds || Infinity, game.time) };
      write(recordKey(), best);
      showResult('성공! 아무도 눈치채지 못했다', score + '점 · ' + game.time.toFixed(1) + '초 클리어'
        + (game.closeCalls ? ' · 아슬아슬 ' + game.closeCalls + '번' : ''));
    },
  },
};

// ── 메뉴 버튼
function button(parent, data, onclick) {
  const b = document.createElement('button');
  Object.assign(b.dataset, data); b.onclick = onclick; parent.append(b);
  return b;
}
for (const where of Object.keys(PLACES)) button(ui.places, { place: where }, () => { place = where; showMenu(); }).textContent = PLACES[where].name;
for (const name of Object.keys(LEVELS)) button(ui.levels, { level: name }, () => { kind = 'normal'; level = name; go('intro'); });
ui.daily.onclick = () => { kind = 'daily'; go('intro'); };
ui.endless.onclick = () => { kind = 'endless'; go('intro'); };
ui.albumOpen.onclick = () => {
  ui.albumList.replaceChildren(...ENTRIES.map(entry => {
    const li = document.createElement('li');
    li.textContent = album.has(entry.id) ? '✔ ' + entry.text : '？？？'; li.className = album.has(entry.id) ? '' : 'locked';
    return li;
  }));
  ui.album.hidden = false; ui.albumClose.focus({ preventScroll: true });
};
ui.albumClose.onclick = () => { ui.album.hidden = true; ui.albumOpen.focus({ preventScroll: true }); };
ui.start.onclick = () => go('intro'); // 같은 판으로 한 번 더
ui.back.onclick = () => go('title');
ui.share.onclick = async () => {
  try {
    if (navigator.share) await navigator.share({ text: shareText, url: location.href.split('?')[0] });
    else { await navigator.clipboard.writeText(shareText + '\n' + location.href.split('?')[0]); ui.share.textContent = '복사했어요'; }
  } catch {} // 공유 창을 닫았거나 복사가 막힌 경우: 아무 일도 하지 않는다
};
const showMute = off => { ui.mute.textContent = off ? '🔇' : '🔊'; ui.mute.setAttribute('aria-pressed', off); };
ui.mute.onclick = () => showMute(toggleMute());
showMute(muted);
scenes.title.enter();
// 브라우저 자동 플레이 확인용. tick 은 화면이 가려져 애니메이션이 멈춘 상태에서도 n 스텝을 직접 진행한다.
if (location.search === '?debug') window.debug = () => ({
  scene, clock, game, input,
  tick(n = 1) { for (; n > 0; n--) { clock += STEP; scenes[scene].update?.(STEP); } render(); },
});

// ── 화면: 무대(캔버스)와 HUD 를 지금 상태대로 그린다
function statusText(held) {
  // 지금 눌러도 되는지는 말해 주지 않는다. 화장실을 보고 판단하는 게임이다.
  if (scene === 'title') return '아무도 없는 화장실';
  if (scene === 'intro') return '가운데 칸으로 들어가는 중…';
  if (scene === 'caught' || scene === 'lost') return '들켰다! ' + reason();
  if (scene === 'won') return '후련하다!';
  if (game.leak > 0) return '앗, 새어 나왔다!';
  if (game.time - game.closeAt < 1) return '아슬아슬! +' + CLOSE_CALL.bonus;
  if (held) return game.together > 1 ? '함께 힘주는 중 ×' + game.together : '힘주는 중…';
  return game.urge > .7 ? '더는 못 참겠다…' : '귀를 기울이는 중…';
}
function render() {
  const staring = scene === 'caught' || scene === 'lost', playing = game && scene !== 'intro';
  const reaction = scene === 'caught' ? clock : scene === 'lost' ? STARE_SECONDS + clock : 0;
  const held = playing && (input.held || game.leak > 0);
  // 들킨 뒤에는 방문객이 그 순간에 멈춰 있고, 성공한 뒤에는 하던 일을 계속한다
  const time = !playing ? clock : game.time + (staring ? reaction : scene === 'won' ? clock : 0);
  draw({
    phase: scene, time, held, reaction, place: PLACES[game?.place ?? place],
    guests: playing ? visitorsAt(game, staring ? game.time : time) : [],
    leak: playing && (game.leak > 0 || (staring && game.leaked)),
    urge: playing ? game.urge : 0,
    culprits: playing ? game.culprits.map(g => g.who) : [],
    close: scene === 'play' && game.time - game.closeAt < 1,
    player: scene === 'won' ? visitor(exit, clock) : null,
  });
  const value = Math.floor((playing ? game.progress : 0) * 100) + '%';
  if (ui.percent.textContent !== value) { ui.percent.textContent = value; ui.gauge.style.setProperty('--amount', value); }
  ui.gauge.style.setProperty('--urge', Math.round((playing ? game.urge : 0) * 100) + '%');
  const message = statusText(held);
  if (ui.status.textContent !== message) ui.status.textContent = message;
  ui.score.textContent = Math.round(playing ? game.points : 0) + '점';
  ui.levelName.textContent = scene === 'title' ? '어디서, 얼마나 붐빌 때?' : title() + (kind === 'endless' && game ? ' · ' + game.laps + '바퀴' : '');
  ui.best.textContent = scene === 'title' ? '' : bestText(best) + (best?.seconds ? ' · 최단 ' + best.seconds.toFixed(1) + '초' : '');
  ui.push.disabled = scene !== 'play';
}

// ── 루프: 화면 주사율과 상관없이 1/60초 고정 스텝으로 진행한다(테스트의 봇과 같은 박자)
const STEP = 1 / 60;
let previous = performance.now(), debt = 0;
function frame(time) {
  debt += document.hidden ? 0 : Math.min(.1, (time - previous) / 1000); previous = time;
  for (; debt >= STEP; debt -= STEP) { clock += STEP; scenes[scene].update?.(STEP); }
  render(); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
