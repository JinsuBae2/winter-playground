// 소리: 파일 없이 WebAudio 로 그때그때 만든다. 발소리·물소리·잠금쇠 소리로 다음 움직임을 귀로 예상하게 한다.
let ac, out, hiss, water, dryer, hum;
export let muted = false;
try { muted = localStorage.getItem('samuldong.mute') === '1'; } catch {}

function loop(source, type, frequency) { // 계속 깔려 있다가 음량만 오르내리는 소리
  const filter = ac.createBiquadFilter(), gain = ac.createGain();
  filter.type = type; filter.frequency.value = frequency; gain.gain.value = 0;
  source.connect(filter).connect(gain).connect(out);
  return gain;
}
function boot() {
  if (ac) { ac.resume(); return; }
  try {
    ac = new AudioContext(); out = ac.createGain(); out.gain.value = muted ? 0 : 1; out.connect(ac.destination);
    hiss = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const data = hiss.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = ac.createBufferSource(); source.buffer = hiss; source.loop = true; source.start();
    water = loop(source, 'highpass', 2600); dryer = loop(source, 'bandpass', 520);
    const drone = ac.createOscillator(); drone.type = 'sawtooth'; drone.frequency.value = 62; drone.start();
    hum = loop(drone, 'lowpass', 190);
  } catch {} // 소리를 못 내는 환경: 조용히 계속 플레이
}
// 브라우저는 첫 입력 뒤에만 소리를 허용한다
addEventListener('pointerdown', boot); addEventListener('keydown', boot);

function envelope(volume, seconds, at) {
  const gain = ac.createGain(), t = ac.currentTime + at;
  gain.gain.setValueAtTime(volume, t); gain.gain.exponentialRampToValueAtTime(.0001, t + seconds);
  gain.connect(out);
  return gain;
}
function tone(from, seconds, type, volume, to = from, at = 0) {
  if (!ac) return;
  const osc = ac.createOscillator(), t = ac.currentTime + at;
  osc.type = type; osc.frequency.setValueAtTime(from, t); osc.frequency.exponentialRampToValueAtTime(to, t + seconds);
  osc.connect(envelope(volume, seconds, at)); osc.start(t); osc.stop(t + seconds);
}
function noise(seconds, type, from, to, volume) {
  if (!ac) return;
  const source = ac.createBufferSource(), filter = ac.createBiquadFilter(), t = ac.currentTime;
  source.buffer = hiss; filter.type = type;
  filter.frequency.setValueAtTime(from, t); filter.frequency.exponentialRampToValueAtTime(to, t + seconds);
  source.connect(filter).connect(envelope(volume, seconds, 0)); source.start(t); source.stop(t + seconds);
}
const jingle = (notes, gap) => notes.forEach((hz, i) => tone(hz, .16, 'triangle', .07, hz, i * gap));

export const sfx = {
  step: (volume = 1) => tone(640, .05, 'square', .03 * volume, 240),            // 또각
  latch: () => { tone(1500, .025, 'square', .05); tone(800, .04, 'square', .04, 800, .05); }, // 찰칵
  inhale: () => noise(.5, 'bandpass', 600, 1700, .05),                           // 스읍
  grunt: () => tone(108, .4, 'sawtooth', .06, 82),                               // 끙
  knock: () => { tone(170, .07, 'sine', .22, 90); tone(170, .07, 'sine', .22, 90, .2); },
  ring: () => { tone(880, .1, 'sine', .04); tone(1100, .1, 'sine', .04, 1100, .13); },
  leak: () => tone(96, .5, 'sawtooth', .13, 52),                                 // 뿡
  stare: () => tone(900, .55, 'square', .05, 170),                               // 고개가 돌아가는 순간
  close: () => tone(1250, .08, 'sine', .07, 1900),                               // 아슬아슬
  lap: () => jingle([523, 784, 1047], .08),
  win: () => { noise(1.5, 'lowpass', 2200, 260, .14); jingle([523, 659, 784, 1047], .1); }, // 물 내리는 소리
};
// 물줄기, 드라이어, 내가 힘주는 소리의 음량을 지금 상황에 맞춘다
export function ambience(washing, drying, straining) {
  if (!ac) return;
  water.gain.setTargetAtTime(washing ? .04 : 0, ac.currentTime, .04);
  dryer.gain.setTargetAtTime(drying ? .12 : 0, ac.currentTime, .06);
  hum.gain.setTargetAtTime(straining ? .07 : 0, ac.currentTime, .03);
}
export function hush() { // 들킨 순간: 모든 소리가 뚝 끊긴다
  if (!ac) return;
  for (const gain of [water, dryer, hum]) { gain.gain.cancelScheduledValues(ac.currentTime); gain.gain.setValueAtTime(0, ac.currentTime); }
}
export function toggleMute() {
  muted = !muted;
  if (out) out.gain.value = muted ? 0 : 1;
  try { localStorage.setItem('samuldong.mute', muted ? '1' : '0'); } catch {}
  return muted;
}
