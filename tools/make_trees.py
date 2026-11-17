# 트리 꾸미기용 3D 모델을 만든다: 전나무·가문비나무·소나무 + 꼭대기 별.
# 실행: npm run trees  (= blender -b -P tools/make_trees.py)  → tree/assets/*.glb
# 잎은 가는 사각형(바늘잎)을 가지마다 직접 붙이고, 정점 색으로 녹색 변화를 준다.
# 안쪽에 어두운 원뿔(core)을 넣어 잎 사이로 배경이 비치지 않게 한다(실제 트리 속이 어두운 것과 같은 효과).
import bpy, math, random
from pathlib import Path
from mathutils import Vector

OUT = Path(__file__).resolve().parent.parent / 'tree' / 'assets'
UP = Vector((0, 0, 1))
NEEDLE_BUDGET = 50000  # 사각형 수 상한(삼각형 10만). 휴대폰에서도 부드럽게 돌도록.

SPECIES = {
    # H 높이, R 아래 반지름, z0 첫 가지 높이, whorls 가지 층 수, per 층당 가지, tilt 가지 기울기(도),
    # droop 처짐, nlen 잎 길이, nw 잎 폭, theta 잎이 가지에서 벌어지는 각, dark/light 잎 색(sRGB)
    'fir':    dict(H=1.8, R=0.60, z0=0.28, whorls=22, per=8, tilt=8,   droop=0.10, nlen=0.036, nw=0.0060,
                   theta=62, dark=(0.06, 0.17, 0.08), light=(0.16, 0.34, 0.14)),
    'spruce': dict(H=1.8, R=0.62, z0=0.30, whorls=16, per=7, tilt=-12, droop=0.22, nlen=0.028, nw=0.0052,
                   theta=55, dark=(0.07, 0.17, 0.12), light=(0.18, 0.33, 0.22)),
    'pine':   dict(H=1.8, R=0.70, z0=0.32, whorls=13, per=6, tilt=14,  droop=0.08, nlen=0.090, nw=0.0036,
                   theta=32, dark=(0.10, 0.20, 0.07), light=(0.28, 0.40, 0.13)),
}


def lin(c):  # sRGB → 선형. glTF 정점 색은 선형 값으로 저장된다.
    return tuple(x ** 2.2 for x in c)


def perp(d):
    u = d.cross(UP if abs(d.z) < 0.95 else Vector((1, 0, 0))).normalized()
    return u, d.cross(u).normalized()


def material(name, color, rough, metal=0.0, vcol=False):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(color), 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if vcol:  # 정점 색을 재질에 연결해야 glTF로 내보내진다
        n = m.node_tree.nodes.new('ShaderNodeVertexColor')
        n.layer_name = 'Col'
        m.node_tree.links.new(n.outputs['Color'], b.inputs['Base Color'])
    return m


def mesh_obj(name, verts, faces, mat, colors=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    if colors:
        a = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
        for i, c in enumerate(colors):
            a.data[i].color = (*c, 1)
    me.materials.append(mat)
    me.update()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    return o


def cone(r0, r1, z0, z1, seg=16):
    v = [(r * math.cos(a), r * math.sin(a), z) for z, r in ((z0, r0), (z1, r1))
         for a in (2 * math.pi * i / seg for i in range(seg))]
    f = [(i, (i + 1) % seg, seg + (i + 1) % seg, seg + i) for i in range(seg)]
    return v + [(0, 0, z1)], f + [(seg + i, seg + (i + 1) % seg, 2 * seg) for i in range(seg)]


def stems(p, rnd):
    """가지와 잔가지를 (점 목록, 끝으로 갈수록 1인 성장도) 로 돌려준다."""
    H, R, z0 = p['H'], p['R'], p['z0']
    out = [([Vector((0, 0, H - 0.17)), Vector((0, 0, H))], 0.6)]  # 꼭대기 곧은 순
    for w in range(p['whorls']):
        t = w / (p['whorls'] - 1)
        z = z0 + (H - 0.2 - z0) * t + rnd.uniform(-0.02, 0.02)
        L = R * (1 - t) ** 0.95 + 0.07
        phase = rnd.uniform(0, 2 * math.pi)
        for b in range(p['per'] + (1 if t < 0.5 else 0)):
            a = phase + 2 * math.pi * b / p['per'] + rnd.uniform(-0.25, 0.25)
            tilt = math.radians(p['tilt'] + rnd.uniform(-6, 6) + 12 * t)  # 위쪽 가지일수록 더 들림
            d = Vector((math.cos(a), math.sin(a), math.tan(tilt))).normalized()
            L1 = L * rnd.uniform(0.85, 1.08)
            pts = [Vector((0, 0, z))]
            for s in range(1, 6):
                k = s / 5
                q = d * L1 * k
                q.z -= p['droop'] * L1 * k * k                     # 끝이 처지고
                if p['tilt'] < 0: q.z += 0.25 * p['droop'] * L1 * k ** 4  # 가문비는 끝만 살짝 들림
                pts.append(Vector((0, 0, z)) + q)
            out.append((pts, 0.0))
            # 잔가지: 가지를 따라 좌우로 번갈아
            side = d.cross(UP).normalized()
            n = max(2, int(L1 / 0.045))
            for j in range(1, n):
                s = j / n
                base = pts[0].lerp(pts[-1], s); base.z = pts[min(5, round(s * 5))].z
                sd = side * (1 if j % 2 else -1)
                tw = (d * 0.75 + sd * 0.9).normalized()
                tl = (0.5 * L1 * (1 - s) + 0.05) * rnd.uniform(0.8, 1.1)
                mid = base + tw * tl * 0.5; mid.z -= p['droop'] * tl * 0.2
                tip = base + tw * tl; tip.z -= p['droop'] * tl * 0.5
                out.append(([base, mid, tip], 0.35 + 0.4 * s))
    return out


def needles(p, rnd, sts):
    total = sum((pts[i + 1] - pts[i]).length for pts, _ in sts for i in range(len(pts) - 1))
    per_m = NEEDLE_BUDGET / total
    dark, light = Vector(lin(p['dark'])), Vector(lin(p['light']))
    th = math.radians(p['theta'])
    V, F, C = [], [], []
    for pts, grow in sts:
        segs = len(pts) - 1
        for i in range(segs):
            a, b = pts[i], pts[i + 1]
            d = (b - a); seg_len = d.length; d.normalize()
            u, v = perp(d)
            for _ in range(int(seg_len * per_m + rnd.random())):
                s = rnd.random()
                g = min(1, grow + (i + s) / segs * 0.6)  # 가지 끝 새순일수록 밝은 색
                base = a.lerp(b, s)
                r = rnd.uniform(0, 2 * math.pi)
                o = u * math.cos(r) + v * math.sin(r)
                nd = (d * math.cos(th) + o * math.sin(th)).normalized()
                sd = d.cross(o).normalized() * p['nw'] * 0.5
                ln = p['nlen'] * rnd.uniform(0.75, 1.15)
                tip = base + nd * ln
                k = len(V)
                V += [base - sd, base + sd, tip + sd * 0.3, tip - sd * 0.3]
                F.append((k, k + 1, k + 2, k + 3))
                shade = rnd.uniform(0.8, 1.15)
                c0 = dark.lerp(light, g * 0.55) * shade * 0.7
                c1 = dark.lerp(light, 0.3 + g * 0.7) * shade
                C += [tuple(c0), tuple(c0), tuple(c1), tuple(c1)]
    return V, F, C


def export(name):
    OUT.mkdir(parents=True, exist_ok=True)
    kw = dict(filepath=str(OUT / f'{name}.glb'), export_format='GLB', export_apply=True,
              export_draco_mesh_compression_enable=True)
    try:
        bpy.ops.export_scene.gltf(**kw, export_vertex_color='MATERIAL')
    except TypeError:  # 옛 Blender는 이 옵션이 없고 기본으로 정점 색을 내보낸다
        bpy.ops.export_scene.gltf(**kw)
    print('wrote', OUT / f'{name}.glb')


def make_tree(name, p):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    rnd = random.Random(name)
    sts = stems(p, rnd)
    v, f, c = needles(p, rnd, sts)
    print(name, 'needles', len(f))
    mesh_obj('needles', v, f, material('needle', (1, 1, 1), 0.75, vcol=True), c)
    v, f = cone(0.045, 0.012, 0, p['H'] - 0.05, 10)
    mesh_obj('trunk', v, f, material('bark', (0.24, 0.15, 0.09), 0.9))
    v, f = cone(p['R'] * 0.42, 0.02, p['z0'], p['H'] - 0.12, 20)
    mesh_obj('core', v, f, material('core', (0.015, 0.04, 0.02), 1.0))
    export(name)


def make_star():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    # 앞뒤로 볼록한 5각 별(각진 면이 빛을 받아 반짝인다) + 가지에 꽂는 원통
    ro, ri, depth, cz = 0.09, 0.038, 0.028, 0.12
    ring = []
    for i in range(10):
        a = math.pi / 2 + i * math.pi / 5
        r = ro if i % 2 == 0 else ri
        ring.append((r * math.cos(a), 0, cz + r * math.sin(a)))
    v = ring + [(0, -depth, cz), (0, depth, cz)]
    f = [(i, (i + 1) % 10, 10) for i in range(10)] + [((i + 1) % 10, i, 11) for i in range(10)]
    mesh_obj('star', v, f, material('star', (1.0, 0.78, 0.35), 0.18, metal=1.0))
    v, f = cone(0.012, 0.012, 0, cz - ri + 0.005, 10)
    mesh_obj('stem', v, f, material('star', (1.0, 0.78, 0.35), 0.25, metal=1.0))
    export('star')


for k, p in SPECIES.items():
    make_tree(k, p)
make_star()
