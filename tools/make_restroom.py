"""Render the fixed restroom plate. Run in Blender's background Python from the repo root."""
import bpy
import math
import os
import random
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
rng = random.Random(42)


def material(name, rgb, rough=.42, metal=0, grain=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb, 1)
    mat.use_nodes = True
    tree = mat.node_tree
    shader = tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*rgb, 1)
    shader.inputs['Metallic'].default_value = metal
    shader.inputs['Roughness'].default_value = rough
    if grain:
        noise = tree.nodes.new('ShaderNodeTexNoise')
        noise.inputs['Scale'].default_value = 150
        bump = tree.nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = grain
        bump.inputs['Distance'].default_value = .007
        tree.links.new(noise.outputs['Fac'], bump.inputs['Height'])
        tree.links.new(bump.outputs['Normal'], shader.inputs['Normal'])
    return mat


def pos(x, y, z):
    return ((x-528)/100, (275-y)/100, z/100)


def box(name, x, y, z, w, d, h, mat, edge=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos(x, y, z))
    ob = bpy.context.object
    ob.name = name
    ob.dimensions = (w/100, d/100, h/100)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(mat)
    if edge:
        bevel = ob.modifiers.new('Rounded edges', 'BEVEL')
        bevel.width = edge/100
        bevel.segments = 4
        ob.modifiers.new('Flat face normals', 'WEIGHTED_NORMAL')
    return ob


def vessel(name, x, y, profile, mat):
    verts, faces = [], []
    n = 96
    for j, (rx, ry, z) in enumerate(profile):
        for i in range(n):
            a = 2*math.pi*i/n
            verts.append(pos(x+rx*math.cos(a), y-ry*math.sin(a), z))
            if j:
                k, m = j*n+i, j*n+(i+1)%n
                faces.append((k-n, m-n, m, k))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    obj.data.materials.append(mat)
    for p in mesh.polygons:
        p.use_smooth = True


porcelain = material('Glazed porcelain', (.93,.955,.97), .16)
steel = material('Brushed stainless', (.56,.64,.68), .23,.88,.11)
dark = material('Waste slots', (.05,.064,.068), .42,.5)
water = material('Water in trap', (.38,.65,.7), .09,.26)
partition = material('Silver-blue laminate', (.36,.46,.49), .4)
stone = material('Quartz counter', (.82,.84,.85), .3,0,.23)
grout = material('Grout', (.43,.46,.47), .88)
tile = [material('Porcelain tile', (v,v+.014,v+.019),.33,0,.14)
        for v in (.69,.71,.735,.755)]
box('Subfloor',528,275,-3,640,430,5,grout)
for x in range(214,863,40):
    for y in range(64,506,40):
        box('Tile',x,y,-.6,39.3,39.3,1.4,rng.choice(tile),.35)
for x in [244,422,597,751]:
    box('Stall divider',x,155,47,5,148,94,partition,.8)
    box('Divider cap',x,155,94,6,148,1.4,steel,.5)
for x,y,w,d in [(495,84,536,8),(234,274,8,390),(495,468,536,8),
                (757,185,8,216),(757,422,8,92)]:
    box('Perimeter',x,y,48,w,d,96,stone,1)
for x in (335,510,685):
    box('Cistern',x,107,37,62,26,52,porcelain,4)
    box('Cistern lid',x,107,64,65,28,4,porcelain,2)
    box('Dual flush',x+15,107,66.4,13,5,1.1,steel,1)
    box('Flush seam',x+17,107,67,.55,4.6,.2,dark)
    vessel('Ceramic pan',x,155,[(14,19,3),(19,25,15),(28,38,32),(30,40,36),
           (29,39,38),(24,33,37),(19,26,28),(10,16,20),(.1,.1,18)],porcelain)
    vessel('Seat ring',x,155,[(28,38,38),(30,40,40),(29,39,42),(23,32,42),
           (21,30,40),(22,31,38)],porcelain)
    vessel('Trap water',x,155,[(10,15,20),(0,0,20)],water)
    # Paper roll on a wall bracket.
    box('Roll bracket',x-77,183,36,14,5,4,steel,.8)
    box('Roll',x-72,191,38,10,14,11,porcelain,3)
for x in (399,537,675):
    box('Vanity',x,421,19,125,71,38,partition,2)
    counter = box('Counter',x,420,57,126,72,5,stone,2)
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=1, depth=1, location=pos(x,420,54))
    cutter = bpy.context.object
    cutter.scale = (.402,.227,.4)
    cut = counter.modifiers.new('Basin opening','BOOLEAN')
    cut.operation='DIFFERENCE'
    cut.object=cutter
    cutter.hide_render=True
    vessel('Inset basin',x,420,[(39,22,59.8),(43,25,61),(43,25,62.5),
           (38,21,62.8),(34,19,58),(26,15,53),(16,9,49),(6,4,47),(0,0,47)],porcelain)
    vessel('Drain',x,420,[(3,2.5,47.4),(0,0,47.4)],steel)
    for d in (-1,0,1):
        box('Drain slit',x+d*1.3,420,47.6,.5,2.8,.2,dark)
    box('Mixer base',x,447,61,9,8,4,steel,1.5)
    box('Mixer column',x,447,68,6,6,15,steel,1.5)
    box('Spout',x,438,75,6,22,4,steel,1.5)
    box('Lever',x-3,450,78,3,10,1.7,steel,.6)
    box('Soap dispenser',x+48,394,65,10,11,13,water,2)
    box('Soap pump',x+47,394,73,8,3,2,steel,.5)
for x,y in [(302,315),(705,363)]:
    box('Floor drain',x,y,.5,13,13,.8,steel,.7)
    for j in range(5):
        box('Grate',x-4+j*2,y,1,.8,9,.3,dark,.2)

scene.world = bpy.data.worlds.new('Daylight')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.86,.91,1,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.35
for x,y,z,power,size in [(300,130,365,350,2.4),(690,400,285,175,1.7)]:
    bpy.ops.object.light_add(type='AREA',location=pos(x,y,z))
    light=bpy.context.object
    light.data.energy=power
    light.data.shape='RECTANGLE'
    light.data.size=size
    light.data.size_y=.8
    light.rotation_euler=(Vector(pos(510,275,0))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(0,0,9))
cam=bpy.context.object
cam.rotation_euler=(0,0,0)
cam.data.type='ORTHO'
cam.data.ortho_scale=6.24
scene.camera=cam
scene.render.engine='CYCLES'
scene.cycles.samples=20
scene.cycles.use_denoising=True
scene.render.resolution_x=1872
scene.render.resolution_y=1230
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='WEBP'
scene.render.image_settings.quality=94
scene.render.filepath=os.path.abspath('samuldong/restroom.webp')
bpy.ops.render.render(write_still=True)
