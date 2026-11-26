import * as T from 'three'
import atlasUrl from './assets/heroine.webp'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { phonePhases } from './phone.js'

const columns = 4
const rows = 3
const walkFrames = [1, 2, 3, 2]
const frameRate = 9

export function createHeroine(scene, fallback, camera) {
  // Keep the screen-facing art intact when it overlaps furniture in projection.
  const material = new T.SpriteMaterial({ alphaTest: .08, depthTest: false, depthWrite: false })
  const sprite = new T.Sprite(material)
  sprite.renderOrder = 10
  sprite.center.set(.5, 7 / 360)
  const height = 2.08
  sprite.scale.set(height * 200 / 360, height, 1)
  sprite.visible = false
  scene.add(sprite)
  // A separate held prop preserves the heroine's authored atlas and silhouette.
  const phoneArm = new T.Group()
  scene.add(phoneArm)
  function held(geometry, color, x, y, z) {
    const mesh = new T.Mesh(geometry, new T.MeshBasicMaterial({ color, transparent: true, depthTest: false, depthWrite: false }))
    mesh.position.set(x, y, z)
    mesh.renderOrder = 12
    phoneArm.add(mesh)
    return mesh
  }
  held(new T.CapsuleGeometry(.075, .16, 4, 8), '#bb758c', .23, .04, .01).rotation.z = -.65
  held(new T.CapsuleGeometry(.052, .22, 4, 8), '#805038', .34, .14, .02).rotation.z = -.9
  held(new T.SphereGeometry(.07, 12, 8), '#8d5a3d', .45, .23, .04)
  const phoneCase = held(new RoundedBoxGeometry(.225, .35, .055, 2, .035), '#171624', .48, .35, .025)
  phoneCase.rotation.z = -.15
  const screen = held(new RoundedBoxGeometry(.181, .277, .012, 2, .02), '#a9d7f1', .48, .35, .06)
  screen.rotation.z = -.15

  let ready = false
  const atlas = new T.TextureLoader().load(atlasUrl, () => {
    ready = true
  }, undefined, error => {
    console.warn('Heroine sprite unavailable. Using the 3D model.', error)
  })
  atlas.colorSpace = T.SRGBColorSpace
  atlas.minFilter = T.LinearFilter
  atlas.generateMipmaps = false
  material.map = atlas

  let run
  let row = 0
  let mirrored = false
  let walkStarted = null
  const previous = new T.Vector2()
  const dateLight = new T.Color('#ffffff')
  const darkLight = new T.Color('#b09ab6')
  const candleLight = new T.Color('#ffe3bf')
  const moonLight = new T.Color('#92aeeb')

  return function pose(game, time, ground = 0) {
    const { player, phase, table } = game
    if (run !== game) {
      run = game
      previous.set(player.x, player.z)
      row = 0
      mirrored = false
      walkStarted = null
    }
    const dx = player.x - previous.x
    const dz = player.z - previous.y
    previous.set(player.x, player.z)
    const moving = (phase === 'blackout' || phase === 'fireEscape' || phase === 'phoneDark' || phase === 'streetDazed' || phase === 'streetRun' || phase === 'streetSafe' || phase === 'streetRun') && !game.hidden && Math.hypot(dx, dz) > .0001
    if (moving) {
      walkStarted ??= time
      row = Math.abs(dx) > Math.abs(dz) ? 1 : dz < 0 ? 2 : 0
      mirrored = row === 1 && dx < 0
    } else {
      walkStarted = null
    }

    const frame = walkStarted === null ? 0 : walkFrames[Math.floor((time - walkStarted) * frameRate) % walkFrames.length]
    atlas.repeat.set((mirrored ? -1 : 1) / columns, 1 / rows)
    atlas.offset.set((frame + Number(mirrored)) / columns, (rows - 1 - row) / rows)
    sprite.position.set(player.x, ground + .02, player.z)
    phoneArm.visible = phonePhases.has(phase) && !game.hidden
    phoneArm.position.set(player.x, ground + 1.4, player.z)
    if (camera) phoneArm.quaternion.copy(camera.quaternion)
    phoneArm.scale.x = game.facing?.x < -.15 ? -1 : 1
    screen.material.color.set(game.phoneOn ? '#b1e4ff' : '#272334')
    const visible = !game.hidden && phase !== 'descent' && phase !== 'phoneRush'
    sprite.visible = ready && visible
    fallback.visible = !ready && visible

    if (phase === 'party' || phase === 'date' || phase === 'sip') {
      material.color.copy(dateLight)
    } else if (phase === 'fireEscape' || phase === 'phoneDark' || phase === 'streetDazed' || phase === 'streetRun' || phase === 'streetSafe') {
      material.color.copy(moonLight)
    } else {
      const candle = Math.max(0, 1 - Math.hypot(player.x - table.x, player.z - table.z) / 5)
      const moon = Math.max(0, 1 - Math.hypot(player.x - 3.3, player.z + 4.4) / 5)
      material.color.copy(darkLight).lerp(candleLight, candle * .85).lerp(moonLight, moon * .85)
    }
  }
}
