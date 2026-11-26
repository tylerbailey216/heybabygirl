import * as T from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { streetIntersection, streetBlockOffsets } from './game.js'
import kitUrl from './assets/models/street-kit.glb?url'

export function dressStreet(group) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 512
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#514c59'
  ctx.fillRect(0, 0, 512, 512)
  let seed = 167
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  for (let i = 0; i < 32000; i++) {
    const shade = Math.floor(55 + random() * 40)
    ctx.fillStyle = `rgba(${shade},${shade},${shade + 9},.45)`
    ctx.fillRect(random() * 512, random() * 512, 1 + random(), 1 + random())
  }
  ctx.strokeStyle = '#15141c88'
  ctx.lineWidth = 1
  for (let i = 0; i < 8; i++) {
    let x = random() * 512, y = random() * 512
    ctx.beginPath(); ctx.moveTo(x, y)
    for (let k = 0; k < 8; k++) { x += random() * 24 - 12; y += random() * 30; ctx.lineTo(x, y) }
    ctx.stroke()
  }
  const map = new T.CanvasTexture(canvas)
  map.colorSpace = T.SRGBColorSpace
  map.wrapS = map.wrapT = T.RepeatWrapping
  map.repeat.set(6, 5)
  const roadMaterial = new T.MeshStandardMaterial({ map, roughness: .42, metalness: .18 })
  new GLTFLoader().load(kitUrl, ({ scene }) => { for (const offset of streetBlockOffsets) { const block = scene.clone(true); block.position.x = offset; group.add(block) } }, undefined, error => console.error('Street kit unavailable', error))

  const paving = new T.MeshStandardMaterial({ color: '#57505b', roughness: .64 })
  const slabs = new T.InstancedMesh(new RoundedBoxGeometry(.68, .1, .82, 1, .025), paving, 208)
  const matrix = new T.Matrix4()
  for (let i = 0; i < 208; i++) {
    matrix.makeTranslation(-4.6 + i % 104 * .7, .09, -2.48 - Math.floor(i / 104) * .85)
    slabs.setMatrixAt(i, matrix)
  }
  group.add(slabs)
  const curbs = new T.InstancedMesh(new RoundedBoxGeometry(.68, .2, .22, 1, .035), paving, 104)
  for (let i = 0; i < 104; i++) { matrix.makeTranslation(-4.6 + i * .7, .035, -1.94); curbs.setMatrixAt(i, matrix) }
  group.add(curbs)
  const wet = new T.MeshStandardMaterial({ color: '#49495b', roughness: .09, metalness: .5, transparent: true, opacity: .2, depthWrite: false })
  for (let i = 0; i < 18; i++) {
    const puddle = new T.Mesh(new T.CircleGeometry(1, 32), wet)
    const vertices = puddle.geometry.attributes.position
    const phase = random() * 6
    for (let k = 1; k < vertices.count; k++) {
      const angle = Math.atan2(vertices.getY(k), vertices.getX(k))
      const radius = .84 + Math.sin(angle * 3 + phase) * .1 + Math.sin(angle * 7 + phase) * .05
      vertices.setXY(k, vertices.getX(k) * radius, vertices.getY(k) * radius)
    }
    puddle.rotation.x = -Math.PI / 2
    puddle.rotation.z = random() * 3
    puddle.scale.set(.25 + random() * .65, .08 + random() * .2, 1)
    puddle.position.set(-3.6 + random() * 16, .018, -1.5 + random() * 4)
    group.add(puddle)
  }
  const iron = new T.MeshStandardMaterial({ color: '#242b38', metalness: .65, roughness: .5 })
  for (const x of [-2.8, 3.8, 10.3]) {
    for (let i = 0; i < 8; i++) {
      const grate = new T.Mesh(new T.BoxGeometry(.025, .018, .32), iron)
      grate.position.set(x + i * .055, .02, -1.65)
      group.add(grate)
    }
  }
  // Warm reflected streaks lead toward the safe intersection.
  const reflections = new T.MeshBasicMaterial({ color: '#bd8c62', transparent: true, opacity: .12, depthWrite: false })
  for (let i = 0; i < 14; i++) {
    const streak = new T.Mesh(new T.PlaneGeometry(.3 + random() * .7, .015 + random() * .04), reflections)
    streak.rotation.x = -Math.PI / 2
    streak.position.set(streetIntersection.x - .55 + random() * 1.2, .025, -1 + i * .22)
    group.add(streak)
  }
  return roadMaterial
}
