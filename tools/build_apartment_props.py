"""Run with Blender --background --python tools/build_apartment_props.py."""
import bpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color, metal=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = metal
    shader.inputs['Roughness'].default_value = .48 if metal else .82
    return mat

brass = material('Tarnished brass', (.24, .16, .065), .72)
cloth = material('Ochre linen', (.52, .35, .19))
ceramic = material('Glazed charcoal', (.065, .08, .075), .12)

def cylinder(name, radius, depth, height, mat, top=None):
    bpy.ops.mesh.primitive_cone_add(vertices=48, radius1=radius, radius2=radius if top is None else top,
                                   depth=depth, location=(0, 0, height))
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    bevel = obj.modifiers.new('Soft manufactured edges', 'BEVEL')
    bevel.width = .008
    bevel.segments = 2
    obj.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    return obj

cylinder('Weighted ceramic foot', .23, .065, .033, ceramic)
cylinder('Brass stem', .026, 1.34, .72, brass)
cylinder('Linen shade', .36, .43, 1.52, cloth, .23)
for height, radius in [(1.305, .36), (1.735, .23)]:
    bpy.ops.mesh.primitive_torus_add(major_radius=radius, minor_radius=.012, location=(0, 0, height))
    bpy.context.object.data.materials.append(brass)

source = ROOT / 'art' / 'apartment'
output = ROOT / 'src' / 'assets' / 'models'
source.mkdir(parents=True, exist_ok=True)
output.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(source / 'floor-lamp.blend'))
bpy.ops.export_scene.gltf(filepath=str(output / 'floor-lamp.glb'), export_format='GLB', export_apply=True)
