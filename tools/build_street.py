"""Blender --background --python tools/build_street.py"""
import bpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def mat(name, rgb, metal=0, glow=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*rgb, 1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = .5 if metal else .85
    if glow:
        p.inputs['Emission Color'].default_value = (*rgb, 1)
        p.inputs['Emission Strength'].default_value = glow
    return m

brick = mat('Bruised plum masonry', (.18, .115, .15))
stone = mat('Weathered limestone', (.28, .26, .29))
iron = mat('Patinated iron', (.09, .12, .15), .65)
glass = mat('Dark window glass', (.035, .065, .1), .35)
warm = mat('Occupied windows', (.7, .38, .17), 0, .6)
awning = mat('Wine canvas', (.22, .065, .095))
paper = mat('Faded notices', (.38, .31, .25))

def cube(name, x, y, z, w, h, d, material, bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, -z, y))
    o = bpy.context.object
    o.name = name
    o.dimensions = (w, d, h)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    if bevel:
        b = o.modifiers.new('Rounded worn edges', 'BEVEL')
        b.width = bevel
        b.segments = 2
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier=b.name)
    return o

for building, x in enumerate([-3.4, .8, 5, 9.2, 13.4]):
    cube('Tenement facade', x, 2.7, -4.3, 4.12, 5.4, .42, brick)
    for y in [.18, 2.38, 4.96, 5.32]:
        cube('Stone belt course', x, y, -4.02, 4.2, .14, .2, stone)
    for sx in [-1.95, 1.95]:
        cube('Pilaster', x + sx, 2.6, -4.02, .18, 5.1, .18, stone)
    for y in [3.3, 4.35]:
        for dx in [-1.08, 1.08]:
            cube('Window surround', x + dx, y, -3.99, .9, .88, .16, stone)
            cube('Recessed sash', x + dx, y, -3.88, .73, .71, .04, warm if (building + int(y) + int(dx)) % 4 == 0 else glass)
            cube('Window mullion', x + dx, y, -3.84, .035, .72, .05, iron, .005)
            cube('Window sill', x + dx, y - .46, -3.82, 1, .09, .29, stone)
    for dx in [-1.13, 1.13]:
        cube('Shopfront frame', x + dx, 1.15, -3.91, 1.7, 1.92, .17, iron)
        cube('Shopfront glass', x + dx, 1.18, -3.79, 1.5, 1.64, .035, glass)
        for k in range(7):
            cube('Closed security shutter slat', x + dx, .47 + k * .21, -3.75, 1.47, .025, .035, iron, .004)
    canopy = cube('Canvas canopy', x, 2.13, -3.54, 3.7, .1, .9, awning)
    canopy.rotation_euler.x = .12
    cube('Scalloped awning fascia', x, 2, -3.12, 3.7, .2, .08, awning)
    for k in range(12):
        cube('Awning seam', x - 1.7 + k * .3, 2.01, -3.06, .025, .19, .015, stone, .003)
    cube('Drainpipe', x - 1.8, 1.25, -3.72, .07, 2.5, .09, iron)
    cube('Peeling flyer', x + 1.8, .95, -3.69, .17, .28, .016, paper, .002)
    for row in range(10):
        # Sparse mortar joints add masonry scale without a wall of outlined boxes.
        for col in range(5):
            cube('Mortar scar', x - 1.65 + col * .72 + (row % 2) * .12, 2.6 + row * .23,
                 -4.075, .38, .018, .012, stone, .002)

# Props keep the original collision footprints.
def cylinder(name, x, y, z, radius, height, material):
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=radius, depth=height, location=(x, -z, y))
    o = bpy.context.object
    o.name = name
    o.data.materials.append(material)
    b = o.modifiers.new('Rolled metal edges', 'BEVEL')
    b.width = .015
    b.segments = 2
    bpy.ops.object.modifier_apply(modifier=b.name)

cylinder('Ribbed refuse bin', -1.9, .39, -.95, .28, .76, iron)
cylinder('Bin rolled lid', -1.9, .80, -.95, .32, .065, iron)
for i in range(12):
    import math
    a = i * math.tau / 12
    cube('Bin rib', -1.9 + math.sin(a) * .28, .38, -.95 + math.cos(a) * .28, .025, .62, .025, stone, .008)
cube('Rounded collection box', 1.75, .31, -.65, .67, .61, .64, iron, .11)
cube('Mail slot', 1.75, .48, -.31, .4, .045, .025, glass, .008)
cube('Collection notice', 1.75, .25, -.315, .26, .22, .017, paper, .01)

# Join by material so the detailed kit stays inexpensive on mobile.
for material in list(bpy.data.materials):
    objects = [o for o in bpy.context.scene.objects if o.type == 'MESH' and material in o.data.materials[:]]
    if not objects:
        continue
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    bpy.context.object.name = material.name

(ROOT / 'art' / 'street').mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'art' / 'street' / 'street-kit.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT / 'src' / 'assets' / 'models' / 'street-kit.glb'), export_format='GLB')
