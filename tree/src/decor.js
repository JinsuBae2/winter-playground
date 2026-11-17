// 트리 꾸미기의 순수 로직. DOM과 Three.js를 모르므로 node --test 로 바로 검사한다.
export const KEY = 'xmas-tree-v2';
export const MODEL_CM = 180; // Blender 모델의 실제 높이(tools/make_trees.py 의 H = 1.8m)
export const scaleFor = cm => cm / MODEL_CM;

export const blank = () => ({
  v: 2, species: 'fir', size: 180, night: false, snow: false, star: '#e9c46a',
  // 사용자가 직접 놓거나 그린 장식. p/pts 는 트리 기준 좌표(트리 크기를 바꾸면 함께 커진다), 선물만 바닥 좌표.
  // { t:'orn', shape:'ball'|'bell'|'cane'|'flake', p, ry, color, mat, r }
  // { t:'lights', pts, color, size, mode }   { t:'garland', pts, style, color }
  // { t:'gift', p:[x,0,z], color, s:[w,h,d], rot }
  items: [],
});

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

export const length = pts => pts.slice(1).reduce((s, p, i) => s + dist(pts[i], p), 0);

// 손으로 그은 점(간격이 들쭉날쭉)을 step 간격으로 고르게 다시 찍는다
export function resample(pts, step) {
  if (pts.length < 2) return pts.slice();
  const out = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], d = dist(a, b);
    let t = step - carry;
    for (; t <= d; t += step) out.push(lerp(a, b, t / d));
    carry = d - (t - step);
  }
  if (dist(out.at(-1), pts.at(-1)) > step * 0.3) out.push(pts.at(-1));
  return out;
}

// 걸어 둔 점 사이마다 가운데를 sag 만큼 내려 줄이 축 처지게 한다
export function drape(pts, sag) {
  return pts.flatMap((p, i) => {
    if (i === pts.length - 1) return [p];
    const m = lerp(p, pts[i + 1], 0.5); m[1] -= sag;
    return [p, m];
  });
}

export const serialize = s => JSON.stringify(s);

// 공유 링크로 들어온 값은 누구나 조작할 수 있으므로, 그릴 수 있는 것만 남긴다
const vec = a => Array.isArray(a) && a.length === 3 && a.every(Number.isFinite);
const line = a => Array.isArray(a) && a.length > 1 && a.length <= 400 && a.every(vec);
const VALID = {
  orn: i => vec(i.p) && ['ball', 'bell', 'cane', 'flake'].includes(i.shape) && ['gloss', 'satin', 'glitter', 'glass'].includes(i.mat) && i.r > 0 && i.r < 0.2,
  lights: i => line(i.pts) && ['warm', 'cool', 'multi', 'red', 'blue'].includes(i.color),
  garland: i => line(i.pts) && ['tinsel', 'beads', 'ribbon'].includes(i.style),
  gift: i => vec(i.p) && vec(i.s) && i.s.every(v => v > 0 && v < 1),
};

// 저장본이나 공유 링크가 깨졌거나 옛 형식이면 null → 새 트리로 시작
export function restore(text) {
  try {
    const s = JSON.parse(text);
    if (!s || s.v !== 2 || !Array.isArray(s.items)) return null;
    return {
      ...blank(), ...s,
      species: ['fir', 'spruce', 'pine'].includes(s.species) ? s.species : 'fir',
      size: [150, 180, 210].includes(s.size) ? s.size : 180,
      items: s.items.filter(i => i && VALID[i.t]?.(i)).slice(0, 500),
    };
  } catch { return null; }
}

// 공유 링크: 트리 상태를 압축해 URL에 그대로 담는다(서버 없이 GitHub Pages에서 동작)
const pipe = (bytes, stream) => new Response(new Blob([bytes]).stream().pipeThrough(stream));
export async function encodeShare(s) {
  const bytes = new Uint8Array(await pipe(serialize(s), new CompressionStream('deflate-raw')).arrayBuffer());
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export async function decodeShare(code) {
  try {
    const bin = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
    return restore(await pipe(Uint8Array.from(bin, c => c.charCodeAt(0)), new DecompressionStream('deflate-raw')).text());
  } catch { return null; }
}
