// 순수 게임 로직. DOM을 모른다. rand는 0~1 난수 함수(테스트에서 씨앗 고정).
import {
  AISLE_Y, WASH_Y, SEAT_Y, DOOR_X, HALL_X, BASINS, STALLS, LEVELS, PEOPLE, PLACES, DRYER, KNOCK,
  FILL_SECONDS, HOLD_LIMIT, LEAK_SECONDS, PAR_SECONDS, SPEED_BONUS, CLOSE_CALL, LAP_BONUS,
} from './data.js';

const clamp = n => Math.max(0, Math.min(1, n));
export const seeded = n => () => {
  n = n + 0x6D2B79F5 | 0;
  let t = Math.imul(n ^ n >>> 15, 1 | n);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

// endless: 한 바퀴를 채워도 끝나지 않고, 바퀴마다 한 단계씩 붐빈다
export const newGame = (level, rand = Math.random, { place = 'office', endless = false } = {}) => ({
  level, rand, place, endless, laps: 0, time: 0, progress: 0, points: 0,
  urge: 0, leak: 0, leaked: false, together: 1, culprits: [],
  lastPush: -9, wasSafe: true, closeAt: -9, closeCalls: 0,
  routes: [], entries: 0, nextAt: 1, rush: 0, waiting: 0, calmFor: 0,
});

// 복도에 있거나(away·approach·depart), 같이 힘주거나(strain), 통화 중(phone)인 사람은 못 듣는다.
// 핸드드라이어가 도는 동안(dry)은 그 소리에 묻혀 아무도 못 듣는다.
const DEAF = ['away', 'depart', 'approach', 'strain', 'phone', 'dry'];
export const safeMoment = guests => guests.some(g => g.act === 'dry') || guests.every(g => DEAF.includes(g.act));

// 방문 한 번의 시간표. kind: wash(손만 씻기) · stall(칸만) · stallwash(칸 → 세면대) · washstall(세면대 → 칸)
// 옆걸음은 통로(AISLE_Y)에서만 하고, 세면대와 칸은 그 앞에서 수직으로만 드나든다.
function planVisit(g, kind, who, lane, sink) {
  const { rand } = g, L = LEVELS[g.level], { max, warning } = L, person = PEOPLE[who];
  const speed = (max >= 3 ? 270 : 235) * (person.speed || 1);
  const fake = max > 1 ? Math.max(L.fake, person.fake || 0) : 0;
  const steps = [[g.time, HALL_X, AISLE_Y, 'away']], pulses = [];
  let t = g.time, x = HALL_X, y = AISLE_Y, quiet = 0, calling = !!person.phone, dry = false;
  const add = (seconds, nx, ny, act) => { t += seconds; x = nx; y = ny; steps.push([t, x, y, act]); };
  const walk = (nx, ny) => add(Math.hypot(nx - x, ny - y) / speed, nx, ny, calling ? 'phone' : 'walk');
  const wash = hurried => {
    walk(BASINS[sink], AISLE_Y); walk(x, WASH_Y); calling = false;
    add(hurried ? .8 : (1.2 + rand() * 1.2) * (person.wash || 1), x, y, 'wash');
    add(.45, x, y, 'shake'); walk(x, AISLE_Y); // 물을 잠그고 손을 턴 뒤에 물러난다
    // 드라이어는 한 대뿐이라 먼저 쓰기로 한 사람이 있으면 그냥 나간다
    if (!hurried && !g.routes.some(r => r.dry) && rand() < DRYER.chance) { dry = true; walk(DRYER.x, AISLE_Y); add(DRYER.seconds, x, y, 'dry'); }
  };
  const sit = () => {
    if (max > 1 && rand() < KNOCK.chance) { // 가운데 칸이 비었나 두드려 본다
      walk(510, AISLE_Y); walk(510, KNOCK.y); calling = false; add(KNOCK.seconds, x, y, 'knock'); walk(510, AISLE_Y);
    }
    walk(lane, AISLE_Y); walk(lane, SEAT_Y); calling = false; add(.4, x, y, 'close'); quiet = t;
    // 먼저 앉은 옆 칸 사람의 박자를 따라간다. 그래야 양옆이 찼을 때도 겹치는 순간이 생긴다.
    const partner = g.routes.find(r => r.pulses.length)?.pulses || [];
    let rest = .9;
    for (let n = 2 + Math.floor(rand() * 3); n > 0; n--) {
      const theirs = partner.find(p => p[0] >= t + rest - .25);
      const from = theirs ? Math.max(t + rest, theirs[0] + (rand() - .5) * .5) : t + rest + rand() * .5;
      const until = theirs ? Math.max(from + 1.2, theirs[1] - rand() * .35) : from + 2.2 + rand() * .7;
      add(from - .6 - t, x, y, 'ready'); add(.6, x, y, 'inhale');
      if (n > 1 && rand() < fake) add(.9, x, y, 'ready');
      else { add(until - from, x, y, 'strain'); pulses.push([from, until]); }
      rest = 1.6;
    }
    add(.5, x, y, 'ready'); add(.45, x, y, 'open'); walk(lane, AISLE_Y);
  };
  add(warning, DOOR_X, AISLE_Y, 'approach');
  if (kind === 'washstall') wash(true); // 급해서 대충 씻고 들어간다
  if (kind !== 'wash') sit();
  if (kind === 'wash' || kind === 'stallwash') wash();
  walk(DOOR_X, AISLE_Y); add(.55, HALL_X, AISLE_Y, 'depart');
  return { steps, who, kind, pulses, dry, lane: kind === 'wash' ? 0 : lane, sink: kind === 'stall' ? -1 : sink, end: t, quiet: quiet || t };
}

// 시간표에서 t 시점의 위치와 행동을 꺼낸다.
export function visitor(route, t) {
  let last = [0, HALL_X, AISLE_Y];
  for (const step of route.steps) {
    if (t < step[0]) {
      const f = clamp((t - last[0]) / (step[0] - last[0]));
      return {
        x: last[1] + (step[1] - last[1]) * f, y: last[2] + (step[2] - last[2]) * f,
        act: step[3], elapsed: t - last[0], heading: Math.atan2(step[1] - last[1], step[2] - last[2]),
        who: route.who, lane: route.lane,
      };
    }
    last = step;
  }
  return { act: 'away', who: route.who };
}
export const visitorsAt = (g, t = g.time) => g.routes.map(r => visitor(r, t));

// 이 사람들이 예정대로 움직일 때 가장 길게 못 누르는 시간. 1초가 안 되는 틈은 기회로 치지 않는다.
function longestWait(g, list) {
  let run = g.waiting, worst = run, calm = g.calmFor;
  for (let t = g.time, end = Math.max(...list.map(r => r.end)); t < end; t += .1) {
    if (safeMoment(list.map(r => visitor(r, t)))) {
      calm += .1;
      if (calm >= 1) run = 0; else run += .1;
    } else { calm = 0; run += .1; worst = Math.max(worst, run); }
  }
  return worst;
}

// 연출가: 한 무리가 몰려왔다 빠지고, 잠깐 틈이 난 뒤 다음 무리가 온다. 구성은 무리마다 새로 뽑는다.
function direct(g) {
  const { rand } = g, L = LEVELS[g.level], P = PLACES[g.place], pick = list => list[Math.floor(rand() * list.length)];
  g.routes = g.routes.filter(r => g.time < r.end);
  if (g.time < g.nextAt) return;
  if (g.routes.length >= L.max) { g.nextAt = g.time + .5; return; }
  const room = L.max - g.routes.length;
  if (!g.rush) g.rush = P.rush === 'full' ? room : P.rush === 'one' ? 1 : 1 + Math.floor(rand() * room);
  const lanes = STALLS.filter(x => !g.routes.some(r => r.lane === x));
  const sinks = [0, 1, 2].filter(i => !g.routes.some(r => r.sink === i));
  const kind = lanes.length && rand() < (P.stall ?? .6) ? (sinks.length ? pick(['stall', 'stall', 'stallwash', 'washstall']) : 'stall')
    : sinks.length ? 'wash' : null;
  if (!kind) { g.nextAt = g.time + 1; return; }
  const who = pick([0, 1, 2, 3].filter(i => !g.routes.some(r => r.who === i)));
  const visit = planVisit(g, kind, who, pick(lanes), pick(sinks));
  if (longestWait(g, [...g.routes, visit]) > L.patience) { g.nextAt = g.time + .4; return; }
  g.routes.push(visit);
  g.entries++; g.rush--;
  g.nextAt = g.rush ? g.time + L.gap * (P.gap ?? 1) * (.8 + rand() * .5)
    : Math.max(g.time, ...g.routes.map(r => r.quiet)) + L.lull * (P.lull ?? 1) * (.7 + rand() * .6);
}

// 한 스텝 진행. 들키면 'caught', 다 채우면 'won'을 돌려준다(그 밖에는 undefined).
export function step(g, dt, held) {
  g.time += dt; direct(g);
  const guests = visitorsAt(g), safe = safeMoment(guests);
  g.calmFor = safe ? g.calmFor + dt : 0;
  g.waiting = g.calmFor >= 1 ? 0 : g.waiting + dt;
  // 아슬아슬: 위험해지기 직전까지 주다가 뗐으면 가산점
  if (g.wasSafe && !safe && !held && g.time - g.lastPush <= CLOSE_CALL.window) {
    g.points += CLOSE_CALL.bonus; g.closeAt = g.time; g.closeCalls++;
  }
  g.wasSafe = safe;
  if (held && safe) g.lastPush = g.time;
  if (g.leak > 0) g.leak -= dt;
  if (!held && g.leak <= 0) { // 참는 중: 급한 정도가 차오르다 넘치면 새어 나온다
    g.together = 1; g.urge = Math.min(1, g.urge + dt / HOLD_LIMIT);
    if (g.urge === 1) { g.leak = LEAK_SECONDS; g.urge = .5; }
    return;
  }
  g.urge = Math.max(0, g.urge - dt * 2);
  if (!safe) {
    g.leaked = !held; g.culprits = guests.filter(v => !safeMoment([v]));
    return 'caught';
  }
  // 옆 칸과 같이 주면 빨리 차고(1 · 1.5 · 2배), 그 구간은 점수도 배로 붙는다
  g.together = 1 + guests.filter(v => v.act === 'strain').length * .5;
  const gain = Math.min(1 - g.progress, dt * g.together / FILL_SECONDS);
  g.progress += gain; g.points += gain * 1000 * g.together;
  if (g.progress === 1) {
    if (g.endless) { // 다음 바퀴: 한 단계 더 붐빈다
      const names = Object.keys(LEVELS);
      g.laps++; g.progress = 0; g.points += LAP_BONUS * g.laps;
      g.level = names[Math.min(names.indexOf(g.level) + 1, names.length - 1)];
      return;
    }
    g.points += Math.max(0, PAR_SECONDS - g.time) * SPEED_BONUS;
    return 'won';
  }
}
