// 장면(타이틀 → 입장 → 플레이 → 들킴 → 결과)을 넘기는 껍데기. 규칙은 sim.js, 그림은 stage.js 가 맡는다.
import { LEVELS, NAMES, INTRO_SECONDS, STARE_SECONDS } from './data.js';
import { newGame, step, visitorsAt } from './sim.js';
import { createStage } from './stage.js';

const $ = s => document.querySelector(s);
const ui = {
  gauge: $('.gauge'), percent: $('.gauge strong'), dialog: $('dialog'), headline: $('#headline'), result: $('#result'),
  start: $('#start'), back: $('#menu'), push: $('#push'), status: $('#status'), score: $('#score'), best: $('#best'),
  menu: $('.menu'), levels: $('#levels'), levelName: $('#levelName'),
};
let level = 'NORMAL';
const draw = createStage($('canvas'));

// ── 기록: 난이도별 최고 점수와 최단 시간. NORMAL 은 예전 버전의 키를 그대로 이어받는다.
const recordKey = name => (name === 'NORMAL' ? 'samuldong.records.v1' : 'samuldong.records.v1.' + name);
function readRecord(name) {
  try {
    const saved = JSON.parse(localStorage.getItem(recordKey(name)));
    if (saved && Number.isFinite(saved.score) && saved.score >= 0 && Number.isFinite(saved.seconds) && saved.seconds > 0) return saved;
  } catch {}
  return { score: 0, seconds: 0 };
}
let record = readRecord(level);

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
document.onvisibilitychange = () => { input.clear(); previous = performance.now(); };

// ── 장면: enter 는 들어올 때 한 번, update 는 스텝마다. clock 은 지금 장면에 들어온 뒤 흐른 시간.
let scene = 'title', clock = 0, game = null;
function go(name) { scene = name; clock = 0; scenes[name].enter?.(); }
function reason() {
  const g = game.culprits[0], name = NAMES[g.who];
  const why = g.act === 'walk' ? name + ', 지나가는 중이었다'
    : g.act === 'wash' || g.act === 'shake' ? name + ', 손 씻는 중이었다'
    : '옆 칸의 ' + name + ', 숨죽이고 있었다';
  return (game.leaked ? '참다 못해 새어 나왔다! ' : '') + why;
}
function showResult(headline, detail) {
  ui.headline.textContent = headline; ui.result.textContent = detail;
  ui.dialog.open = true; ui.start.focus({ preventScroll: true });
}
const scenes = {
  title: { // 난이도 메뉴. 버튼마다 그 난이도의 최고 기록을 보여 준다
    enter() {
      game = null; ui.dialog.open = false; ui.menu.hidden = false;
      for (const button of ui.levels.children) {
        const name = button.dataset.level, best = readRecord(name);
        button.innerHTML = `<b>${name}</b><small>동시 ${LEVELS[name].max}명 · ${best.seconds ? '최고 ' + best.score + '점' : '기록 없음'}</small>`;
        if (name === level) button.focus({ preventScroll: true });
      }
    },
  },
  intro: {
    enter() { input.clear(); game = newGame(level); ui.menu.hidden = true; ui.dialog.open = false; },
    update() { if (clock >= INTRO_SECONDS) go('play'); },
  },
  play: {
    update(dt) { const event = step(game, dt, input.held); if (event) go(event); }, // 'caught' 또는 'won'
  },
  caught: { // 팝업 없이 정적 → 고개 돌리기를 다 보여 준 다음에 결과로 넘어간다
    enter() { input.clear(); },
    update() { if (clock >= STARE_SECONDS) go('lost'); },
  },
  lost: {
    enter() { showResult('당신은 똥쟁이가 되었습니다', reason() + ' · ' + Math.round(game.points) + '점'); },
  },
  won: {
    enter() {
      input.clear();
      record = { score: Math.max(record.score, Math.round(game.points)), seconds: Math.min(record.seconds || Infinity, game.time) };
      try { localStorage.setItem(recordKey(level), JSON.stringify(record)); } catch {} // 사생활 보호 모드 등: 저장 없이 계속 플레이
      showResult('성공! 아무도 눈치채지 못했다', Math.round(game.points) + '점 · ' + game.time.toFixed(1) + '초 클리어');
    },
  },
};
for (const name of Object.keys(LEVELS)) {
  const button = document.createElement('button');
  button.dataset.level = name;
  button.onclick = () => { level = name; record = readRecord(name); go('intro'); };
  ui.levels.append(button);
}
ui.start.onclick = () => go('intro'); // 같은 난이도로 한 판 더
ui.back.onclick = () => go('title');
scenes.title.enter();
if (location.search === '?debug') window.debug = () => ({ scene, clock, game }); // 브라우저 자동 플레이 확인용

// ── 화면: 무대(캔버스)와 HUD 를 지금 상태대로 그린다
function statusText(held) {
  // 지금 눌러도 되는지는 말해 주지 않는다. 화장실을 보고 판단하는 게임이다.
  if (scene === 'title') return '아무도 없는 회사 화장실';
  if (scene === 'intro') return '가운데 칸으로 들어가는 중…';
  if (scene === 'caught' || scene === 'lost') return '들켰다! ' + reason();
  if (scene === 'won') return '후련하다!';
  if (game.leak > 0) return '앗, 새어 나왔다!';
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
    phase: scene, time, held, reaction,
    guests: playing ? visitorsAt(game, staring ? game.time : time) : [],
    leak: playing && (game.leak > 0 || (staring && game.leaked)),
    urge: playing ? game.urge : 0,
    culprits: playing ? game.culprits.map(g => g.who) : [],
  });
  const value = Math.floor((playing ? game.progress : 0) * 100) + '%';
  if (ui.percent.textContent !== value) { ui.percent.textContent = value; ui.gauge.style.setProperty('--amount', value); }
  ui.gauge.style.setProperty('--urge', Math.round((playing ? game.urge : 0) * 100) + '%');
  const message = statusText(held);
  if (ui.status.textContent !== message) ui.status.textContent = message;
  ui.score.textContent = Math.round(playing ? game.points : 0) + '점';
  ui.levelName.textContent = scene === 'title' ? '난이도를 고르세요' : level;
  ui.best.textContent = scene === 'title' ? '' : record.seconds ? '최고 ' + record.score + '점 · 최단 ' + record.seconds.toFixed(1) + '초' : '첫 클리어에 도전!';
  ui.push.disabled = scene !== 'play';
}

// ── 루프: 화면 주사율과 상관없이 1/60초 고정 스텝으로 진행한다(테스트의 봇과 같은 박자)
const STEP = 1 / 60;
let previous = performance.now(), debt = 0;
function frame(now) {
  debt += document.hidden ? 0 : Math.min(.1, (now - previous) / 1000); previous = now;
  for (; debt >= STEP; debt -= STEP) { clock += STEP; scenes[scene].update?.(STEP); }
  render(); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
