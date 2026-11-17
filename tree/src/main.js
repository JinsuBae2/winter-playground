// 트리 꾸미기 화면: Three.js 장면, 꾸미기 도구, 저장.
// 상태(state)는 decor.js 형식의 평범한 객체 하나이고, 바뀔 때마다 장식을 통째로 다시 그린다(장식 수가 적어 충분히 빠르다).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as D from './decor.js';

const $ = s => document.querySelector(s);
const SPECIES = { fir: '전나무', spruce: '가문비나무', pine: '소나무' };
const ORN_SHAPES = { ball: '볼', bell: '종', cane: '지팡이 사탕', flake: '눈꽃' };
const ORN_COLORS = ['#b3121f', '#d4a24c', '#c8ccd2', '#f2efe6', '#1f6b3a', '#1d4fa0', '#d86a8f', '#5b2a86'];
const ORN_MATS = { gloss: '유광', satin: '무광', glitter: '글리터', glass: '유리' };
const ORN_SIZES = { 0.035: '작게', 0.05: '보통', 0.07: '크게' };
const LIGHT_COLORS = { warm: '웜화이트', cool: '쿨화이트', multi: '컬러', red: '빨강', blue: '파랑' };
const LIGHT_HEX = { warm: '#ffc677', cool: '#dcebff', red: '#ff3b30', blue: '#2f7bff' };
const LIGHT_SIZES = { mini: '미니', big: '큰 전구' };
const LIGHT_MODES = { on: '켜짐', twinkle: '반짝', chase: '순차' };
const MULTI = ['#ff3b30', '#34c759', '#2f7bff', '#ffcc00', '#ff6fb5'];
const GARLAND_STYLES = { tinsel: '틴셀', beads: '구슬', ribbon: '리본' };
const GARLAND_COLORS = ['#d9b45a', '#d0d4da', '#b3121f', '#1f6b3a', '#f2efe6'];
const STARS = { '#e9c46a': '금색 별', '#d8dde3': '은색 별', off: '별 빼기' };
const GIFT_COLORS = ['#b3121f', '#1f6b3a', '#1d4fa0', '#f2efe6', '#d4a24c'];
const GIFT_SIZES = { s: '작게', m: '보통', l: '크게' };
const WARM = LIGHT_HEX.warm;

// ---------- 렌더러와 장면 ----------
const canvas = $('#view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 50);
camera.position.set(0.4, 1.2, 4.6);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.7, 0); // 아래 패널에 가리지 않게 트리를 화면 위쪽에 둔다
controls.enableDamping = true;
controls.minDistance = 1.1; controls.maxDistance = 6.5;
controls.maxPolarAngle = 1.52; // 바닥 아래로 내려가지 않게
controls.enablePan = false;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.3, 0.45, 1.0); // 밝기 1 넘는 것(전구)만 번진다
composer.addPass(bloom);
composer.addPass(new OutputPass());

// 실내 조명: 실제 방 사진(HDRI)이 있으면 그걸, 없으면 Three.js 기본 방으로 반사와 주변광을 만든다
const pmrem = new THREE.PMREMGenerator(renderer);
const useEnv = tex => {
  scene.environment = tex; scene.background = tex;
  scene.backgroundBlurriness = 0.35;
};
useEnv(pmrem.fromScene(new RoomEnvironment(), 0.04).texture);
new RGBELoader().load('assets/room.hdr', hdr => {
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  useEnv(pmrem.fromEquirectangular(hdr).texture); hdr.dispose();
}, undefined, () => {}); // 파일이 없으면 기본 방 그대로

const key = new THREE.DirectionalLight('#ffe6c4', 1.6);
key.position.set(2.2, 4, 2.6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 1, far: 10 });
key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
scene.add(key);
const glow = new THREE.PointLight(WARM, 0, 3.5, 1.6); // 전구를 켜면 트리 안에서 퍼지는 따뜻한 빛
glow.position.set(0, 0.9, 0);
scene.add(glow);

// 캔버스로 만든 질감: 마루와 반짝이(글리터·틴셀) 노멀맵
function canvasTex(w, h, draw, srgb) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
const floorTex = canvasTex(512, 512, (g, w, h) => {
  for (let i = 0; i < 8; i++) {           // 폭 64px 마루판 8장, 판마다 색이 조금씩 다르다
    const l = 30 + Math.random() * 8;
    g.fillStyle = `hsl(26 42% ${l}%)`; g.fillRect(i * 64, 0, 64, h);
    g.strokeStyle = '#0003';
    for (let k = 0; k < 14; k++) {       // 나뭇결
      g.beginPath(); const x = i * 64 + Math.random() * 64;
      g.moveTo(x, 0); g.bezierCurveTo(x + 6, h * .3, x - 6, h * .7, x + 3, h); g.stroke();
    }
    g.fillStyle = '#0006'; g.fillRect(i * 64, 0, 2, h);
    g.fillRect(i * 64, (i * 197) % h, 64, 2); // 판 이음새
  }
}, true);
floorTex.repeat.set(3, 3);
const sparkle = canvasTex(128, 128, (g, w, h) => {
  const img = g.createImageData(w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = 128 + (Math.random() - .5) * 220; img.data[i + 1] = 128 + (Math.random() - .5) * 220;
    img.data[i + 2] = 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
});

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(8, 64),
  new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.55, metalness: 0 }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
floor.name = 'floor';
scene.add(floor);

// 트리 받침: 빨간 펠트 스커트와 나무 받침통
const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.02, 64),
  new THREE.MeshStandardMaterial({ color: '#7d1518', roughness: 1, sheen: 1 }));
skirt.position.y = 0.01; skirt.receiveShadow = true;
const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.2, 32),
  new THREE.MeshStandardMaterial({ color: '#5a3a22', roughness: 0.7 }));
stand.position.y = 0.11; stand.castShadow = stand.receiveShadow = true;
scene.add(skirt, stand);

// ---------- 모델 불러오기 ----------
const draco = new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/');
const loader = new GLTFLoader().setDRACOLoader(draco);
const cache = {};
const load = name => cache[name] ??= loader.loadAsync(`assets/${name}.glb`).then(g => {
  g.scene.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    if (o.material.name === 'needle') Object.assign(o.material, { side: THREE.DoubleSide, roughness: 0.8 });
  });
  const box = new THREE.Box3().setFromObject(g.scene);
  g.dims = { H: box.max.y };
  return g;
});

const treeGroup = new THREE.Group();  // 트리 크기(cm)만큼 통째로 키운다. 트리에 단 장식도 여기 붙어 함께 커진다
const decor = new THREE.Group();      // 트리에 붙는 장식
const floorDecor = new THREE.Group(); // 바닥 선물
treeGroup.add(decor);
scene.add(treeGroup, floorDecor);
let tree = null, star = null, dims = { H: 1.8 };

// ---------- 상태, 저장, 되돌리기 ----------
let state = D.restore(safeGet()) ?? D.blank();
const history = [];
function safeGet() { try { return localStorage.getItem(D.KEY); } catch { return null; } }
function commit(change) {
  history.push(D.serialize(state));
  if (history.length > 80) history.shift();
  change(state);
  apply();
}
function apply() {
  try { localStorage.setItem(D.KEY, D.serialize(state)); } catch {} // 사생활 보호 모드: 저장 없이 계속
  syncTree().then(rebuild);
  applyMood();
  renderPanel();
}

let loadingSpecies = null;
async function syncTree() {
  treeGroup.scale.setScalar(D.scaleFor(state.size));
  if (tree?.userData.species === state.species) return;
  loadingSpecies = state.species;
  $('#loading').hidden = false;
  try {
    const [g, s] = await Promise.all([load(state.species), load('star')]);
    if (loadingSpecies !== state.species) return; // 그새 다른 나무를 골랐다
    if (tree) treeGroup.remove(tree);
    tree = g.scene; tree.userData.species = state.species; dims = g.dims;
    treeGroup.add(tree);
    star ??= s.scene;
    $('#loading').hidden = true;
  } catch (e) {
    $('#loading').textContent = '트리를 불러오지 못했어요. 새로고침해 주세요.';
    console.error(e);
  }
}

// ---------- 오너먼트 모양과 재질 ----------
const V2 = (x, y) => new THREE.Vector2(x, y), V3 = a => new THREE.Vector3(...a);
const GEO = {
  ball: new THREE.SphereGeometry(1, 40, 24),
  // 종: 옆 단면을 돌려 만든다. 아래가 벌어지고 입구가 열려 있다
  bell: new THREE.LatheGeometry([V2(0, 1), V2(0.28, 0.97), V2(0.42, 0.78), V2(0.48, 0.4), V2(0.6, 0.02), V2(0.86, -0.2), V2(0.9, -0.28), V2(0.84, -0.27)], 40),
  // 지팡이 사탕: 아래에서 위로 올라가 갈고리로 휘어진다
  cane: new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0, -1.6, 0], [0, 0.6, 0], [0.08, 0.95, 0], [0.38, 1.12, 0], [0.68, 0.95, 0], [0.75, 0.68, 0]].map(V3)), 80, 0.13, 12),
  // 눈꽃: 팔 6개, 팔마다 잔가지 2쌍
  flake: mergeGeometries(Array.from({ length: 6 }, (_, k) => {
    const parts = [new THREE.BoxGeometry(0.1, 1, 0.05).translate(0, 0.5, 0)];
    for (const [y, l] of [[0.45, 0.38], [0.72, 0.26]]) for (const s of [1, -1])
      parts.push(new THREE.BoxGeometry(0.08, l, 0.05).translate(0, l / 2, 0).rotateZ(s * 0.75).translate(0, y, 0));
    return mergeGeometries(parts).rotateZ(k * Math.PI / 3);
  })),
};
const capGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.26, 16);
const clapGeo = new THREE.SphereGeometry(0.16, 12, 8);
const gold = new THREE.MeshStandardMaterial({ color: '#c9a35a', metalness: 1, roughness: 0.3 });
const hidden = new THREE.MeshBasicMaterial({ visible: false }); // 보이지 않지만 누르면 맞는 판정용
const matCache = {};
function ornMat(color, kind) {
  return matCache[color + kind] ??= Object.assign(({
    // 실제 크리스마스 볼은 안쪽을 은도금한 유리라 거울처럼 비친다 → 금속 + 클리어코트
    gloss: () => new THREE.MeshPhysicalMaterial({ color, metalness: 0.9, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.02 }),
    satin: () => new THREE.MeshPhysicalMaterial({ color, metalness: 0.55, roughness: 0.42, sheen: 0.4 }),
    glitter: () => new THREE.MeshStandardMaterial({ color, metalness: 0.85, roughness: 0.35, normalMap: sparkle, normalScale: V2(1.6, 1.6) }),
    glass: () => new THREE.MeshPhysicalMaterial({ color, metalness: 0, roughness: 0.02, transmission: 1, thickness: 0.01, ior: 1.5, clearcoat: 1 }),
  })[kind](), { side: THREE.DoubleSide }); // 종은 안쪽도 보인다
}
function caneMat(color) {
  return matCache['cane' + color] ??= new THREE.MeshPhysicalMaterial({
    roughness: 0.25, clearcoat: 1,
    map: Object.assign(canvasTex(256, 64, (g, w, h) => {      // 흰 바탕에 사선 줄무늬
      g.fillStyle = '#f6f2ea'; g.fillRect(0, 0, w, h);
      g.fillStyle = color;
      for (let x = -h; x < w + h; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 26, 0); g.lineTo(x + 26 + h, h); g.lineTo(x + h, h); g.fill(); }
    }, true), { repeat: V2(5, 1) }),
  });
}
function ornament(it) {
  const m = new THREE.Mesh(GEO[it.shape], it.shape === 'cane' ? caneMat(it.color) : ornMat(it.color, it.mat));
  m.castShadow = true;
  if (it.shape === 'ball' || it.shape === 'bell') {
    const cap = new THREE.Mesh(capGeo, gold); cap.position.y = it.shape === 'ball' ? 1.05 : 1.02; m.add(cap);
  }
  if (it.shape === 'bell') { const c = new THREE.Mesh(clapGeo, gold); c.position.y = -0.22; m.add(c); }
  const grab = new THREE.Mesh(GEO.ball, hidden); grab.scale.setScalar(1.8); m.add(grab); // 작은 장식도 지우개로 누르기 쉽게
  m.scale.setScalar(it.r); m.position.fromArray(it.p); m.rotation.y = it.ry;
  return m;
}

// ---------- 직접 그린 줄: 전구와 가랜드 ----------
const curveOf = (pts, step, sag) => new THREE.CatmullRomCurve3(D.drape(D.resample(pts, step), sag).map(V3));
const own = o => { o.userData.own = true; return o; };
// 손가락으로 누르기 쉽게, 줄을 따라 보이지 않는 굵은 관을 하나 더 둔다(지우개용)
const hitTube = curve => own(new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.03, 5), hidden));

let strands = []; // 매 프레임 깜빡임을 위해 전구 줄을 모아 둔다
function lights(it) {
  const curve = curveOf(it.pts, 0.08, 0.012), g = new THREE.Group();
  const big = it.size === 'big', len = curve.getLength();
  g.add(own(new THREE.Mesh(new THREE.TubeGeometry(curve, Math.ceil(len * 150), 0.0025, 4),
    new THREE.MeshStandardMaterial({ color: '#1c2a1a', roughness: 0.6 }))), hitTube(curve));
  const pts = curve.getSpacedPoints(Math.max(1, Math.round(len / (big ? 0.075 : 0.045))));
  const geo = big ? new THREE.SphereGeometry(0.011, 12, 10).scale(1, 1.6, 1) : new THREE.SphereGeometry(0.0085, 10, 8);
  const bulbs = own(new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ toneMapped: false }), pts.length));
  const m = new THREE.Matrix4();
  const info = pts.map((p, i) => {
    bulbs.setMatrixAt(i, m.makeTranslation(p.x, p.y + (big ? 0.012 : 0.006), p.z));
    return { base: new THREE.Color(it.color === 'multi' ? MULTI[i % MULTI.length] : LIGHT_HEX[it.color]), phase: Math.random() * 6.28 };
  });
  g.add(bulbs);
  strands.push({ bulbs, info, it });
  return g;
}

function garland(it) {
  const curve = curveOf(it.pts, 0.11, 0.035), g = new THREE.Group(), len = curve.getLength();
  if (it.style === 'beads') {
    const pts = curve.getSpacedPoints(Math.round(len / 0.016));
    const beads = own(new THREE.InstancedMesh(new THREE.SphereGeometry(0.0075, 12, 8),
      new THREE.MeshPhysicalMaterial({ color: it.color, metalness: 0.6, roughness: 0.15, clearcoat: 1 }), pts.length));
    const m = new THREE.Matrix4();
    pts.forEach((p, i) => beads.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z)));
    beads.castShadow = true; g.add(beads);
  } else if (it.style === 'ribbon') {
    const r = own(new THREE.Mesh(ribbonGeo(curve, 0.045), new THREE.MeshPhysicalMaterial({ color: it.color, roughness: 0.4, sheen: 1, side: THREE.DoubleSide })));
    r.castShadow = true; g.add(r);
  } else {
    // 틴셀: 관의 겉면을 무작위로 부풀려 보송보송한 반짝이 줄처럼
    const geo = new THREE.TubeGeometry(curve, Math.ceil(len * 200), 0.014, 10);
    const pos = geo.attributes.position, nrm = geo.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      const k = (Math.random() - 0.3) * 0.009;
      pos.setXYZ(i, pos.getX(i) + nrm.getX(i) * k, pos.getY(i) + nrm.getY(i) * k, pos.getZ(i) + nrm.getZ(i) * k);
    }
    const t = own(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: it.color, metalness: 1, roughness: 0.25, normalMap: sparkle, normalScale: V2(3, 3) })));
    t.castShadow = true; g.add(t);
  }
  g.add(hitTube(curve));
  return g;
}

// 납작한 리본 띠: 트리 겉면을 향하게 펼치고, 감기면서 살짝 꼬인다
function ribbonGeo(curve, width) {
  const n = Math.max(20, Math.round(curve.getLength() / 0.008)), pos = [], idx = [];
  const out = new THREE.Vector3(), side = new THREE.Vector3();
  for (let i = 0; i <= n; i++) {
    const p = curve.getPointAt(i / n), tan = curve.getTangentAt(i / n);
    out.set(p.x, 0, p.z).normalize();
    side.crossVectors(tan, out).normalize().applyAxisAngle(tan, Math.sin(i * 0.12) * 0.6).multiplyScalar(width / 2);
    pos.push(p.x + side.x, p.y + side.y, p.z + side.z, p.x - side.x, p.y - side.y, p.z - side.z);
    if (i) idx.push(2 * i - 2, 2 * i - 1, 2 * i, 2 * i - 1, 2 * i + 1, 2 * i);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function gift(it) {
  const [w, h, d] = it.s, g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshPhysicalMaterial({ color: it.color, roughness: 0.45, clearcoat: 0.3 }));
  const ribbonMat = new THREE.MeshStandardMaterial({ color: it.color === '#d4a24c' ? '#b3121f' : '#d9b45a', metalness: 0.6, roughness: 0.35 });
  const rw = Math.min(w, d) * 0.15;
  const r1 = new THREE.Mesh(new THREE.BoxGeometry(w + 0.004, h + 0.004, rw), ribbonMat);
  const r2 = new THREE.Mesh(new THREE.BoxGeometry(rw, h + 0.004, d + 0.004), ribbonMat);
  const bow = new THREE.Mesh(new THREE.TorusKnotGeometry(rw, rw * 0.3, 48, 6, 2, 3), ribbonMat);
  bow.position.y = h / 2 + rw * 0.6; bow.rotation.x = Math.PI / 2;
  for (const o of [box, r1, r2, bow]) { o.castShadow = o.receiveShadow = true; own(o); g.add(o); }
  g.position.set(it.p[0], h / 2, it.p[2]);
  g.rotation.y = it.rot;
  return g;
}

function rebuild() {
  for (const g of [decor, floorDecor]) {
    for (const o of [...g.children]) { g.remove(o); o.traverse(m => m.userData.own && m.geometry.dispose()); }
  }
  strands = [];
  if (!tree) return;
  const make = { orn: ornament, lights, garland, gift };
  state.items.forEach((it, i) => {
    const o = make[it.t](it);
    o.userData.idx = i; // 지우개가 어떤 장식인지 알 수 있게
    (it.t === 'gift' ? floorDecor : decor).add(o);
  });
  if (state.star) {
    const s = star.clone();
    s.traverse(o => {
      if (!o.isMesh) return;
      o.material = matCache['star' + state.star + state.night] ??= Object.assign(o.material.clone(), {
        color: new THREE.Color(state.star), emissive: new THREE.Color(state.star), emissiveIntensity: state.night ? 0.5 : 0,
      });
    });
    s.position.y = dims.H - 0.06; s.scale.setScalar(1.15);
    s.userData.idx = 'star';
    decor.add(s);
  }
  applyMood();
}

// ---------- 낮/밤 분위기 ----------
function applyMood() {
  const n = state.night, first = state.items.find(i => i.t === 'lights');
  scene.environmentIntensity = n ? 0.12 : 1;
  scene.backgroundIntensity = n ? 0.06 : 0.85;
  key.intensity = n ? 0.06 : 1.6;
  glow.intensity = first ? (n ? 2.2 : 0.5) : 0;      // 전구 빛이 트리 속을 은은하게 비춘다
  glow.color.set(first && LIGHT_HEX[first.color] || '#ffd9b0');
  bloom.strength = n ? 0.9 : 0.35;
  renderer.toneMappingExposure = n ? 1.15 : 1;
}

// ---------- 눈 ----------
const SNOW_N = 1600;
const snowGeo = new THREE.BufferGeometry();
const snowPos = new Float32Array(SNOW_N * 3);
for (let i = 0; i < SNOW_N; i++) snowPos.set([(Math.random() - .5) * 7, Math.random() * 4, (Math.random() - .5) * 7], i * 3);
snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
const flakeTex = canvasTex(32, 32, g => {
  const r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  r.addColorStop(0, '#fff'); r.addColorStop(1, '#fff0');
  g.fillStyle = r; g.fillRect(0, 0, 32, 32);
}, true);
const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ size: 0.03, map: flakeTex, transparent: true, depthWrite: false }));
scene.add(snow);

// ---------- 손으로 꾸미기: 누르기, 긋기, 지우기 ----------
let tab = 'tree';
const pick = {
  shape: 'ball', color: ORN_COLORS[0], mat: 'gloss', r: 0.05,
  lcolor: 'warm', lsize: 'mini', mode: 'twinkle',
  gstyle: 'tinsel', gcolor: GARLAND_COLORS[0],
  gift: GIFT_COLORS[0], gsize: 'm',
};
const ray = new THREE.Raycaster();
function aim(e) {
  const r = canvas.getBoundingClientRect();
  ray.setFromCamera(V2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
}
const hitTree = e => { if (!tree) return null; aim(e); return ray.intersectObject(tree, true)[0] ?? null; };
const round = a => a.map(v => +v.toFixed(3));
// 맞은 자리를 트리 기준 좌표로 바꾸고, 잎 바로 바깥으로 살짝 띄운다
function onTree(hit, lift) {
  const p = treeGroup.worldToLocal(hit.point.clone());
  const out = V3([p.x, 0, p.z]).normalize();
  return { p: p.addScaledVector(out, lift), out };
}

const preview = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#fff6c8', depthTest: false, toneMapped: false }));
preview.renderOrder = 9;
treeGroup.add(preview);
let stroke = null, down = null, lastXY = null;

// 트리 위에서 시작한 긋기는 줄 그리기, 트리 밖에서 시작하면 평소처럼 돌려 보기.
// capture 로 등록해 OrbitControls 보다 먼저 판단한다.
canvas.addEventListener('pointerdown', e => {
  down = [e.clientX, e.clientY];
  if (tab !== 'lights' && tab !== 'garland') return;
  const hit = hitTree(e);
  if (!hit) return;
  controls.enabled = false;
  stroke = [round(onTree(hit, 0.012).p.toArray())];
  lastXY = down;
  try { canvas.setPointerCapture(e.pointerId); } catch {} // 트리 밖으로 나가도 계속 그리기
}, { capture: true });

canvas.addEventListener('pointermove', e => {
  if (!stroke || Math.hypot(e.clientX - lastXY[0], e.clientY - lastXY[1]) < 6) return;
  lastXY = [e.clientX, e.clientY];
  const hit = hitTree(e);
  if (!hit) return; // 잠깐 트리 밖으로 나가도 다시 들어오면 이어 그린다
  stroke.push(round(onTree(hit, 0.012).p.toArray()));
  preview.geometry.dispose();
  preview.geometry = new THREE.BufferGeometry().setFromPoints(stroke.map(V3)); // 그리는 동안 보여 주는 선
  preview.visible = true;
});

canvas.addEventListener('pointerup', e => {
  if (stroke) return finishStroke();
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return; // 끌었으면 회전한 것
  down = null;
  aim(e);
  if (tab === 'orn') placeOrnament(e);
  else if (tab === 'gift') placeGift();
  else if (tab === 'erase') erase();
});
canvas.addEventListener('pointercancel', () => { if (stroke) finishStroke(); });

function finishStroke() {
  const pts = D.resample(stroke, 0.03).map(round);
  stroke = null; controls.enabled = true;
  preview.visible = false;
  if (D.length(pts) < 0.08) return toast('트리 위를 조금 더 길게 그어 주세요');
  commit(s => s.items.push(tab === 'lights'
    ? { t: 'lights', pts, color: pick.lcolor, size: pick.lsize, mode: pick.mode }
    : { t: 'garland', pts, style: pick.gstyle, color: pick.gcolor }));
}

function placeOrnament(e) {
  const hit = hitTree(e);
  if (!hit) return toast('트리 위를 눌러 주세요');
  const { p, out } = onTree(hit, pick.r * 0.7);
  p.y -= pick.r * (pick.shape === 'cane' ? 0.9 : 0.4); // 가지 끝에 매달린 것처럼
  commit(s => s.items.push({ t: 'orn', shape: pick.shape, p: round(p.toArray()), ry: +Math.atan2(out.x, out.z).toFixed(2),
    color: pick.color, mat: pick.mat, r: pick.r }));
}

function placeGift() {
  const hit = ray.intersectObject(floor)[0];
  if (!hit) return;
  const { x, z } = hit.point;
  if (Math.hypot(x, z) < 0.2) return toast('받침 옆에 놓아 주세요');
  const base = { s: 0.15, m: 0.22, l: 0.32 }[pick.gsize], w = base * (0.9 + Math.random() * 0.2);
  commit(s => s.items.push({ t: 'gift', p: [+x.toFixed(3), 0, +z.toFixed(3)], color: pick.gift,
    s: round([w, base * (0.6 + Math.random() * 0.5), w * (0.75 + Math.random() * 0.4)]), rot: +(Math.random() * 3.14).toFixed(2) }));
}

function erase() {
  for (const h of ray.intersectObjects([decor, floorDecor], true)) {
    let o = h.object;
    while (o && o.userData.idx === undefined) o = o.parent;
    if (!o) continue;
    const i = o.userData.idx;
    return commit(s => { if (i === 'star') s.star = null; else s.items.splice(i, 1); });
  }
  toast('지울 장식을 눌러 주세요');
}

// ---------- 패널 ----------
const chips = (label, opts, cur, on) =>
  `<div class="row"><span>${label}</span>${Object.entries(opts).map(([v, t]) =>
    `<button data-act="${on}" data-v="${v}" class="${String(cur) === v ? 'on' : ''}">${t}</button>`).join('')}</div>`;
const swatches = (label, list, cur, on) =>
  `<div class="row"><span>${label}</span>${list.map(c =>
    `<button class="sw ${c === cur ? 'on' : ''}" style="background:${c}" data-act="${on}" data-v="${c}" aria-label="${c}"></button>`).join('')}</div>`;

const HINT = {
  orn: '트리를 눌러 원하는 자리에 달아요',
  lights: '트리 위를 손가락으로 그어 전구 줄을 감아요 · 여러 줄 가능',
  garland: '트리 위를 그어 가랜드를 걸어요 · 가지 사이로 축 처져요',
  gift: '바닥을 눌러 선물을 놓아요',
  erase: '지울 장식을 눌러요',
};
function renderPanel() {
  const s = state;
  $('#hint').textContent = HINT[tab] ?? '';
  $('#panel').innerHTML = {
    tree: () => chips('종류', SPECIES, s.species, 'species') + chips('크기', { 150: '150cm', 180: '180cm', 210: '210cm' }, s.size, 'size')
      + chips('꼭대기', STARS, s.star ?? 'off', 'star')
      + chips('조명', { day: '☀️ 낮', night: '🌙 밤' }, s.night ? 'night' : 'day', 'night')
      + `<div class="row"><span></span><button data-act="clear">장식 전부 떼기</button></div>`,
    orn: () => chips('모양', ORN_SHAPES, pick.shape, 'shape') + swatches('색', ORN_COLORS, pick.color, 'color')
      + (pick.shape === 'cane' ? '' : chips('재질', ORN_MATS, pick.mat, 'mat')) + chips('크기', ORN_SIZES, pick.r, 'r'),
    lights: () => chips('색', LIGHT_COLORS, pick.lcolor, 'lcolor') + chips('전구', LIGHT_SIZES, pick.lsize, 'lsize')
      + chips('효과', LIGHT_MODES, pick.mode, 'mode'),
    garland: () => chips('모양', GARLAND_STYLES, pick.gstyle, 'gstyle') + swatches('색', GARLAND_COLORS, pick.gcolor, 'gcolor'),
    gift: () => swatches('선물', GIFT_COLORS, pick.gift, 'gift') + chips('크기', GIFT_SIZES, pick.gsize, 'gsize')
      + chips('눈', { off: '그침', on: '내림' }, s.snow ? 'on' : 'off', 'snow'),
    erase: () => `<div class="row"><span></span><span>잘못 단 장식은 눌러서 떼고, ↶ 로 되돌릴 수도 있어요</span></div>`,
  }[tab]();
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
}

const setPick = k => v => { pick[k] = isNaN(+v) || k === 'color' ? v : +v; renderPanel(); };
const ACT = {
  species: v => commit(s => { s.species = v; }),
  size: v => commit(s => { s.size = +v; }),
  star: v => commit(s => { s.star = v === 'off' ? null : v; }),
  night: v => commit(s => { s.night = v === 'night'; }),
  snow: v => commit(s => { s.snow = v === 'on'; }),
  clear: () => commit(s => { s.items = []; }),
  // 효과는 이미 감은 전구 줄에도 바로 적용한다
  mode: v => { pick.mode = v; commit(s => s.items.forEach(i => { if (i.t === 'lights') i.mode = v; })); },
  ...Object.fromEntries(['shape', 'color', 'mat', 'r', 'lcolor', 'lsize', 'gstyle', 'gcolor', 'gift', 'gsize'].map(k => [k, setPick(k)])),
};
$('#panel').addEventListener('click', e => {
  const b = e.target.closest('button[data-act]');
  if (b) ACT[b.dataset.act](b.dataset.v);
});
$('#tabs').addEventListener('click', e => {
  const b = e.target.closest('button[data-tab]');
  if (b) { tab = b.dataset.tab; renderPanel(); }
});
$('#undo').onclick = () => {
  const prev = history.pop();
  if (!prev) return toast('되돌릴 게 없어요');
  state = D.restore(prev); apply();
};
$('#shot').onclick = () => {
  composer.render(); // 그린 직후에 읽어야 캔버스가 비어 있지 않다
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png'); a.download = 'my-christmas-tree.png'; a.click();
  toast('사진을 저장했어요');
};

let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1800);
}

// ---------- 매 프레임 ----------
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); composer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const clock = new THREE.Clock(), c = new THREE.Color();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  controls.update();
  snow.visible = state.snow;
  if (state.snow) {
    for (let i = 0; i < SNOW_N; i++) {
      const k = i * 3;
      snowPos[k + 1] -= dt * (0.25 + (i % 7) * 0.03);
      snowPos[k] += Math.sin(t + i) * dt * 0.05;
      if (snowPos[k + 1] < 0) snowPos[k + 1] = 4;
    }
    snowGeo.attributes.position.needsUpdate = true;
  }
  for (const { bulbs, info, it } of strands) {
    const n = info.length;
    info.forEach((b, i) => {
      const k = it.mode === 'twinkle' ? 0.55 + 0.45 * Math.sin(t * 2.2 + b.phase)
        : it.mode === 'chase' ? 0.25 + 0.75 * Math.max(0, Math.sin((i / n) * n * 0.6 - t * 4)) : 1;
      bulbs.setColorAt(i, c.copy(b.base).multiplyScalar(3.2 * k)); // 1보다 밝아야 bloom이 번진다
    });
    bulbs.instanceColor.needsUpdate = true;
  }
  composer.render();
});

apply();
