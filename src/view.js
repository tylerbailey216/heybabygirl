import * as T from 'three'
import { descentDelays, entityTypes, spots } from './game.js'
import { createHeroine } from './heroine.js'
import woodUrl from './assets/wood.webp'
import plasterUrl from './assets/plaster.webp'
import rugUrl from './assets/rug.webp'
import fabricUrl from './assets/upholstery.webp'

export function createView(container) {
  const scene = new T.Scene()
  scene.background = new T.Color('#100d17')
  const camera = new T.OrthographicCamera()
  camera.position.set(0, 15, 9.5)
  camera.lookAt(0, 0, -0.35)
  const renderer = new T.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))
  renderer.outputColorSpace = T.SRGBColorSpace
  container.append(renderer.domElement)

  const gradient = new T.DataTexture(new Uint8Array([83, 119, 155, 195, 231, 255]), 6, 1, T.RedFormat)
  gradient.minFilter = gradient.magFilter = T.NearestFilter
  gradient.needsUpdate = true
  const ink = new T.LineBasicMaterial({ color: '#301e25', transparent: true, opacity: .67 })
  const silhouette = new T.MeshBasicMaterial({ color: '#21141e', side: T.BackSide })
  const loader = new T.TextureLoader()
  function surface(url) {
    const map = loader.load(url)
    map.colorSpace = T.SRGBColorSpace
    map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
    return map
  }
  const wood = surface(woodUrl)
  const plaster = surface(plasterUrl)
  const weave = surface(rugUrl)
  const upholstery = surface(fabricUrl)
  const surfaceMaps = new Map([
    ['#72504c', wood], ['#81574b', wood], ['#8e6253', wood], ['#77504b', wood],
    ['#a97150', wood], ['#935548', wood], ['#925d48', wood],
    ['#ad8079', plaster], ['#a77773', plaster],
    ['#c8908e', weave], ['#af777b', weave],
    ['#946669', upholstery], ['#ce9587', upholstery], ['#c08a7e', upholstery],
    ['#b47a74', upholstery], ['#934d63', upholstery],
  ])
  const materials = new Map()
  function shape(parent, geometry, color, x, y, z, outline = true) {
    if (!materials.has(color)) {
      const map = surfaceMaps.get(color)
      const tint = new T.Color(color)
      if (map) tint.lerp(new T.Color('#ffffff'), .74)
      const material = map
        ? new T.MeshStandardMaterial({ color: tint, map, roughness: .92 })
        : new T.MeshToonMaterial({ color, gradientMap: gradient })
      materials.set(color, material)
    }
    const mesh = new T.Mesh(geometry, materials.get(color))
    mesh.position.set(x, y, z)
    if (outline) mesh.add(new T.LineSegments(new T.EdgesGeometry(geometry, 34), ink))
    parent.add(mesh)
    return mesh
  }
  function box(parent, color, x, y, z, w, h, d, outline) {
    return shape(parent, new T.BoxGeometry(w, h, d), color, x, y, z, outline)
  }
  function oval(parent, color, x, y, z, w, h, d) {
    // Size the outline after scaling so thin shapes retain an even stroke.
    const geometry = new T.SphereGeometry(1, 16, 12)
    const mesh = shape(parent, geometry.clone().scale(w, h, d), color, x, y, z, false)
    mesh.add(new T.Mesh(geometry.scale(w + .015, h + .015, d + .015), silhouette))
    return mesh
  }
  const falloff = new Uint8Array(64 * 64 * 4)
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const radius = Math.min(1, Math.hypot(x - 31.5, y - 31.5) / 31.5)
      falloff.set([255, 255, 255, Math.round(255 * (1 - radius) ** 2)], (y * 64 + x) * 4)
    }
  }
  const shadowMap = new T.DataTexture(falloff, 64, 64)
  shadowMap.magFilter = T.LinearFilter
  shadowMap.minFilter = T.LinearFilter
  shadowMap.needsUpdate = true
  function contact(parent, x, z, w, d, opacity) {
    const material = new T.MeshBasicMaterial({
      color: '#27151f', map: shadowMap, transparent: true, opacity, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -1,
    })
    const mesh = new T.Mesh(new T.PlaneGeometry(w, d), material)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(x, .057, z)
    parent.add(mesh)
    return mesh
  }
  const room = new T.Group()
  scene.add(room)
  box(room, '#2e1c29', 0, -.22, -.28, 11.8, .35, 9.42)
  const woods = ['#72504c', '#81574b', '#8e6253', '#77504b']
  for (let row = 0; row < 18; row++) {
    for (let col = 0; col < 6; col++) {
      const offset = .54 * (row % 3)
      const left = Math.max(-5.8, -6.85 + col * 2.35 + offset)
      const right = Math.min(5.8, -6.85 + (col + 1) * 2.35 + offset)
      if (right > left) box(room, woods[(row * 7 + col * 11 + Math.floor(row / 3)) % 4],
        (left + right) / 2, -.055, -3.9 + row * .44, right - left - .014, .1, .43, false)
    }
  }
  box(room, '#ad8079', -1.96, 1.34, -4.04, 7.72, 2.68, .19)
  box(room, '#ad8079', 5.31, 1.34, -4.04, 1.01, 2.68, .19)
  box(room, '#a77773', -5.77, 1.34, -1.96, .19, 2.68, 4.1)
  box(room, '#6b4750', -1.96, .105, -3.91, 7.72, .21, .09)
  box(room, '#6b4750', -5.65, .105, -1.96, .09, .21, 4.1)

  const entrance = new T.Group()
  entrance.position.set(-5.59, 0, -2.4)
  entrance.rotation.y = Math.PI / 2
  room.add(entrance)
  box(entrance, '#452a2d', 0, 1.23, 0, 1.42, 2.46, .13)
  const door = new T.Group()
  door.position.x = -.62
  entrance.add(door)
  box(door, '#935548', .62, 1.17, .095, 1.24, 2.34, .1)
  for (const y of [.53, 1.58]) box(door, '#a96b53', .62, y, .16, .88, .68, .04)
  oval(door, '#e6ad69', 1.02, 1.05, .22, .065, .065, .055)
  box(room, '#946753', -5.16, .015, -2.4, .68, .03, 1.36)

  const balcony = new T.Group()
  balcony.position.set(3.36, 0, -4.02)
  room.add(balcony)
  box(balcony, '#344359', 0, -.02, -.56, 2.86, .13, 1.25)
  box(balcony, '#23354d', 0, .76, -1.12, 2.8, .1, .08)
  for (let i = 0; i < 12; i++) box(balcony, '#23354d', -1.32 + i * .24, .37, -1.13, .044, .75, .06)
  const rainGeometry = new T.BufferGeometry()
  const drops = new Float32Array(72 * 6)
  rainGeometry.setAttribute('position', new T.BufferAttribute(drops, 3).setUsage(T.DynamicDrawUsage))
  const rain = new T.LineSegments(rainGeometry, new T.LineBasicMaterial({
    color: '#9fbdfa', transparent: true, opacity: .46,
  }))
  rain.frustumCulled = false
  balcony.add(rain)
  const glass = new T.Group()
  balcony.add(glass)
  const pane = box(glass, '#688fc2', 0, 1.25, .015, 2.85, 2.48, .025, false)
  pane.material = new T.MeshBasicMaterial({ color: '#456dab', transparent: true, opacity: .34, depthWrite: false })
  for (const x of [-1.43, 0, 1.43]) box(glass, '#372e43', x, 1.25, .04, .09, 2.55, .1)
  for (const y of [.06, 2.53]) box(glass, '#372e43', 0, y, .04, 2.91, .095, .1)
  box(glass, '#ecc784', .34, 1, .12, .1, .26, .09)
  for (const x of [-1.56, 1.56]) {
    for (let fold = 0; fold < 4; fold++) {
      oval(balcony, fold % 2 ? '#a9757f' : '#c49396', x + (fold - 1.5) * .115, 1.22, .21, .09, 1.31, .12)
    }
    box(balcony, '#cf9b68', x, 1.07, .32, .46, .08, .11)
  }

  box(room, '#6c4240', -2.45, .46, -3.65, 2.05, .9, .73)
  box(room, '#925d48', -2.45, .93, -3.65, 2.18, .11, .82)
  for (const x of [-3.11, -2.45, -1.79]) {
    box(room, '#855246', x, .51, -3.25, .58, .57, .06)
    oval(room, '#e6ad69', x, .53, -3.2, .045, .045, .035)
  }
  box(room, '#503044', -2.5, 1.88, -3.91, 1.75, 1.08, .08)
  box(room, '#bc9293', -2.5, 1.88, -3.86, 1.55, .88, .025)
  for (let i = 0; i < 7; i++) {
    const h = [.22, .43, .29, .55, .38, .31, .2][i]
    box(room, '#594253', -3.1 + i * .2, 1.51 + h / 2, -3.84, .17, h, .02, false)
  }

  const rug = '#af777b'
  box(room, rug, 1.28, .014, 1.63, 5.07, .035, 2.89)
  box(room, '#c8908e', 1.28, .039, 1.63, 4.8, .018, 2.62)
  for (let i = 0; i < 22; i++) {
    const x = -.96 + i * .215
    for (const z of [.41, 2.85]) box(room, '#995c6d', x, .051, z, .08, .008, .08, false)
  }
  box(room, '#946669', 2.3, .31, 2.9, 4, .56, 1.2)
  box(room, '#ce9587', 2.3, .79, 3.39, 4, .81, .29)
  for (const x of [.94, 2.3, 3.66]) box(room, '#c08a7e', x, .61, 2.82, 1.25, .22, .82)
  for (const x of [.43, 4.17]) box(room, '#b47a74', x, .77, 2.83, .29, .62, 1.12)
  const pillow = box(room, '#934d63', 3.48, .84, 2.99, .56, .37, .3)
  pillow.rotation.z = -.16

  box(room, '#6a4040', -4.7, .61, 2.45, 1.1, 1.22, 1.45)
  for (const y of [.23, .62, 1.01]) {
    box(room, '#392734', -4.68, y, 2.45, .98, .28, 1.28)
    for (let i = 0; i < 7; i++) {
      box(room, ['#bb7861', '#716c80', '#b6926d', '#855869'][i % 4], -5.1 + i * .14, y, 1.77, .105, .16 + i % 3 * .045, .26)
    }
  }
  box(room, '#ae755d', -4.7, 1.25, 2.45, 1.17, .1, 1.53)

  function plant(x, y, z, scale) {
    const group = new T.Group()
    group.position.set(x, y, z)
    group.scale.setScalar(scale)
    room.add(group)
    shape(group, new T.CylinderGeometry(.31, .21, .43, 12), '#9d6a72', 0, .23, 0)
    for (let i = 0; i < 8; i++) {
      const angle = i * 2.4
      const leaf = oval(group, i % 2 ? '#5d6c58' : '#7c8463', Math.sin(angle) * .26, .53 + i * .058,
        Math.cos(angle) * .26, .13, .07, .28)
      leaf.rotation.set(-.45, angle, 0)
    }
  }
  plant(-4.8, 1.31, 2.45, .72)
  plant(5.21, 0, -3.38, .86)
  plant(-3.03, .99, -3.68, .51)

  box(room, '#674341', -5.11, 1.99, .06, 1.03, .11, .16)
  for (let i = 0; i < 3; i++) {
    const coat = new T.Group()
    coat.position.set(-5.22 + i * .22, 0, .07 + i * .12)
    coat.rotation.y = -.35
    room.add(coat)
    const cloth = ['#816457', '#4c455c', '#a77a65'][i]
    shape(coat, new T.CylinderGeometry(.22, .33, 1.24, 5), cloth, 0, 1.26, 0)
    oval(coat, cloth, -.25, 1.32, .02, .11, .47, .12).rotation.z = -.16
    oval(coat, cloth, .25, 1.32, .02, .11, .47, .12).rotation.z = .16
  }

  const blanket = box(room, '#8d515f', 2.49, 1.216, 3.38, .87, .045, .34)
  blanket.rotation.y = -.035
  box(room, '#8d515f', 2.49, .96, 3.219, .87, .48, .026)
  for (let i = 0; i < 8; i++) {
    const x = 2.12 + i * .105
    box(room, '#a86670', x, .96, 3.202, .035, .46, .008, false)
  }
  contact(room, 2.3, 2.78, 5.6, 2.6, .63)
  contact(room, -4.69, 2.44, 2.07, 2.33, .66)
  contact(room, -2.45, -3.5, 3.5, 1.6, .63)
  contact(room, -4.95, .15, 1.8, 1.5, .49)

  const table = new T.Group()
  room.add(table)
  contact(table, .1, .18, 3.55, 2.72, .69)
  box(table, '#a97150', 0, .91, 0, 2.45, .13, 1.42)
  box(table, '#674137', 0, .76, 0, 2.18, .18, 1.17)
  for (const x of [-1.04, 1.04]) for (const z of [-.55, .55]) box(table, '#754b3c', x, .42, z, .17, .84, .17)
  for (const x of [-.8, .8]) {
    box(table, '#d4a68e', x, .988, 0, .69, .018, .65)
    shape(table, new T.CylinderGeometry(.255, .23, .04, 24), '#f5c7a8', x, 1.024, 0)
    oval(table, '#9b614e', x, 1.05, 0, .15, .024, .15)
    oval(table, '#7d9368', x + .07, 1.073, .035, .058, .022, .075)
    box(table, '#ccab91', x + .32, 1.009, -.02, .027, .035, .31)
  }
  shape(table, new T.CylinderGeometry(.13, .16, .055, 16), '#b27854', 0, 1.015, 0)
  shape(table, new T.CylinderGeometry(.066, .077, .27, 12), '#ffe0a2', 0, 1.17, 0)
  const flame = oval(table, '#ffd990', 0, 1.36, 0, .045, .105, .045)
  flame.material = new T.MeshBasicMaterial({ color: '#fff3b4' })
  const candle = new T.PointLight('#ff9b54', 19, 7, 2)
  candle.position.set(0, 1.52, 0)
  table.add(candle)

  const ambient = new T.AmbientLight('#b9a7df', .85)
  const ceiling = new T.DirectionalLight('#ffcfad', 2.25)
  ceiling.position.set(-4, 8, 3)
  const moon = new T.PointLight('#719eff', 29, 9, 2)
  moon.position.set(3.3, 2.1, -4.4)
  scene.add(ambient, ceiling, moon)

  function character(kind) {
    const group = new T.Group()
    scene.add(group)
    const heroine = kind === 'heroine'
    const shadow = kind === 'shadow'
    const skin = heroine ? '#8d543c' : shadow ? '#08060c' : '#c48c6d'
    const top = heroine ? '#f49cae' : shadow ? skin : '#789680'
    const jeans = heroine ? '#4278ab' : shadow ? skin : '#3b364d'
    const hair = heroine ? '#ad573b' : '#302332'
    const legs = []
    for (const x of [-.13, .13]) {
      const leg = new T.Group()
      leg.position.set(x, .78, 0)
      group.add(leg)
      oval(leg, jeans, 0, -.31, 0, .127, .36, .14)
      oval(leg, heroine ? '#e889a1' : shadow ? skin : '#3f283a', 0, -.66, .05, .12, .08, .18)
      legs.push(leg)
      oval(group, top, x * 2.05, .94, .01, .082, .26, .092).rotation.z = x * .95
      oval(group, skin, x * 2.43, .74, .03, .07, .096, .075)
    }
    oval(group, jeans, 0, .73, 0, .236, .17, .176)
    oval(group, top, 0, 1.01, 0, .25, .27, .174)
    oval(group, skin, 0, 1.26, 0, .11, .12, .11)
    if (!shadow) oval(group, hair, 0, 1.48, -.065, .262, .29, .23)
    oval(group, skin, 0, 1.46, .046, .207, .238, .185)
    if (heroine) {
      const fringe = oval(group, '#bd6546', -.095, 1.64, .082, .163, .105, .17)
      fringe.rotation.z = .36
      for (const side of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
          const lock = oval(group, i % 2 ? '#9c4b34' : hair, side * (.205 + (i % 2) * .041),
            1.51 - i * .147, -.073 - i * .031, .116, .135, .132)
          lock.rotation.z = side * (i % 2 ? .42 : -.4)
        }
        oval(group, '#efcb91', side * .196, 1.37, .115, .035, .036, .026)
      }
      oval(group, '#efcb91', 0, 1.195, .154, .029, .03, .016)
    }
    for (const x of [-.078, .078]) {
      const eye = oval(group, '#fff1db', x, 1.485, .207, .046, shadow ? .023 : .055, .023)
      if (shadow) {
        eye.material = new T.MeshBasicMaterial({ color: '#ff213c' })
        eye.rotation.z = x * -3
      } else {
        oval(group, heroine ? '#314f78' : '#312638', x, 1.48, .228, .027, .041, .014)
      }
    }
    return { group, legs }
  }
  const player = character('heroine')
  const poseHeroine = createHeroine(scene, player.group)
  const heroineShadow = contact(room, 0, 0, 1.05, .65, .75)
  const date = character('date')
  function createShadow() {
    const actor = character('shadow')
    const wisps = Array.from({ length: 8 }, () => {
      const mesh = new T.Mesh(new T.PlaneGeometry(.43, .78), new T.MeshBasicMaterial({
        color: '#211229', map: shadowMap, transparent: true, depthWrite: false,
        opacity: .45, side: T.DoubleSide,
      }))
      actor.group.add(mesh)
      return mesh
    })
    return { ...actor, wisps }
  }
  const pursuer = createShadow()
  const procession = descentDelays.map(createShadow)
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  date.group.position.set(.3, 0, -2.23)
  date.group.rotation.y = -.3

  const fireEscape = new T.Group()
  fireEscape.visible = false
  scene.add(fireEscape)
  const firstStepX = -5.16
  const treadWidth = .569
  const floorHeight = x => {
    const tread = Math.floor((x - firstStepX) / treadWidth + .5)
    return -.13 * Math.max(0, Math.min(12, tread - 3))
  }
  box(fireEscape, '#262439', 0, .5, -1.38, 12.2, 6.2, .32)
  const brickColors = ['#393348', '#302c40', '#433749', '#353047']
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 13; col++) {
      const x = -6 + col * .96 + (row % 2 ? .35 : 0)
      box(fireEscape, brickColors[(row + col * 3) % 4], x, -2.06 + row * .63, -1.19, .92, .59, .05, false)
    }
  }
  for (const [x, y] of [[-4.62, 1.1], [-.8, .7], [3.88, .24]]) {
    box(fireEscape, '#161728', x, y, -1.13, 1.42, 2.06, .14)
    box(fireEscape, '#30476e', x, y, -1.048, 1.25, 1.86, .06)
    box(fireEscape, '#222235', x, y, -1.004, .045, 1.86, .06)
    box(fireEscape, '#222235', x, y, -1.004, 1.25, .045, .06)
  }
  for (let i = 0; i < 19; i++) {
    const x = firstStepX + i * treadWidth
    const y = floorHeight(x)
    box(fireEscape, '#424765', x, y - .078, 0, .591, .155, 1.79)
    box(fireEscape, '#282b44', x, y + .66, .83, .593, .07, .075)
    box(fireEscape, '#24253c', x, y + .34, .83, .052, .68, .052)
    for (const z of [-.5, 0, .5]) box(fireEscape, '#515879', x, y + .006, z, .51, .013, .026, false)
  }
  const landingLight = new T.PointLight('#80acff', 24, 10, 2)
  landingLight.position.set(1.3, 2.4, 3.4)
  fireEscape.add(landingLight)
  const glow = oval(fireEscape, '#9ed5ff', spots.landing.x, floorHeight(spots.landing.x) + .065, -.51, .13, .035, .19)
  glow.material = new T.MeshBasicMaterial({ color: '#9ed5ff', transparent: true, opacity: .68 })
  const outsideRainGeometry = new T.BufferGeometry()
  const outsideDrops = new Float32Array(102 * 6)
  outsideRainGeometry.setAttribute('position', new T.BufferAttribute(outsideDrops, 3).setUsage(T.DynamicDrawUsage))
  const outsideRain = new T.LineSegments(outsideRainGeometry, new T.LineBasicMaterial({
    color: '#9cbbef', opacity: .48, transparent: true, depthWrite: false,
  }))
  outsideRain.frustumCulled = false
  fireEscape.add(outsideRain)

  const markers = document.querySelector('#markers')
  const labels = [
    ['Entry', -5.05, 2.4, spots.entry.z],
    ['Hanging coats', -4.85, 1.94, spots.coats.z],
    ['Dining table', 0, 1.2, 0],
    ['Balcony latch', spots.balcony.x, 2.1, spots.balcony.z],
    ['Sideboard', spots.drawer.x, 1.24, -3.3],
    ['Landing', spots.landing.x, floorHeight(spots.landing.x) + .83, 0],
  ].map(([name, x, y, z]) => {
    const element = document.createElement('span')
    element.className = 'marker'
    element.textContent = name
    markers.append(element)
    return { element, position: new T.Vector3(x, y, z) }
  })

  function resize() {
    const { clientWidth: width, clientHeight: height } = container
    const aspect = width / height
    const halfHeight = Math.max(5.7, 6.28 / aspect)
    camera.left = -halfHeight * aspect
    camera.right = halfHeight * aspect
    camera.top = halfHeight
    camera.bottom = -halfHeight
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
  }
  new ResizeObserver(resize).observe(container)
  resize()

  function actorPose(actor, position, time) {
    const dx = position.x - actor.group.position.x
    const dz = position.z - actor.group.position.z
    actor.group.position.set(position.x, 0, position.z)
    if (Math.hypot(dx, dz) > .0001) actor.group.rotation.y = Math.atan2(dx, dz)
    const swing = Math.hypot(dx, dz) > .0001 ? Math.sin(time * 13) * .46 : 0
    actor.legs[0].rotation.x = swing
    actor.legs[1].rotation.x = -swing
  }
  function poseWisps(actor, time) {
    for (const [i, wisp] of actor.wisps.entries()) {
      const progress = (time * .64 + i / actor.wisps.length) % 1
      const side = i % 2 === 0 ? -1 : 1
      wisp.position.set(side * (.13 + progress * .43), .65 + progress * 1.22, Math.sin(i * 2.4) * .21)
      wisp.rotation.z = -side * (.22 + progress * .59)
      wisp.material.opacity = Math.sin(progress * Math.PI) * .64
    }
  }

  function render(game, time) {
    if (game.phase === 'street' || game.phase === 'complete') return
    const blackout = game.phase !== 'date'
    const cinematic = game.phase === 'descent'
    const outside = game.phase === 'fireEscape' || cinematic
    const pan = cinematic && !reducedMotion.matches ? game.cinematicElapsed * .085 : 0
    if (cinematic) {
      camera.position.set(pan, 7.8, 11.4)
      camera.lookAt(pan, .16, 0)
      camera.zoom = 1.1
    } else {
      camera.position.set(0, 15, 9.5)
      camera.lookAt(0, 0, -.35)
      camera.zoom = 1
    }
    camera.updateProjectionMatrix()
    const inside = game.phase === 'blackout' && game.entityInside()
    const ground = outside ? floorHeight(game.player.x) : 0
    room.visible = !outside
    fireEscape.visible = outside
    ceiling.intensity = blackout ? .04 : 2.05
    ambient.intensity = blackout ? .31 : 1.18
    moon.intensity = blackout ? 26 : 15
    candle.intensity = (blackout ? 23 : 11) + Math.sin(time * 19) * 1.4 + Math.sin(time * 8) * 1.2
    flame.scale.y = 1 + Math.sin(time * 16) * .13
    table.position.set(game.table.x, 0, game.table.z)
    const burst = inside ? Math.min(1, (game.elapsed - game.entityArrivalAt()) / .28) : 0
    const swing = 1 - (1 - burst) ** 3 + Math.sin(burst * Math.PI) * .19
    door.rotation.y = -1.17 * swing
    glass.position.x = outside ? -1.35 : 0
    date.group.visible = !blackout
    pursuer.group.visible = inside
    actorPose(player, game.player, time)
    player.group.position.y = ground
    poseHeroine(game, time, ground)
    heroineShadow.position.x = game.player.x
    heroineShadow.position.z = game.player.z + .06
    heroineShadow.visible = !game.hidden
    if (inside) actorPose(pursuer, game.pursuer, time)
    else {
      pursuer.group.position.set(game.pursuer.x, 0, game.pursuer.z)
      pursuer.group.rotation.y = 0
    }
    const entity = entityTypes[Math.min(game.encounters, entityTypes.length - 1)]
    pursuer.group.scale.set(...entity.scale)
    if (inside) poseWisps(pursuer, time)
    procession.forEach((actor, index) => {
      const walkTime = game.cinematicElapsed - descentDelays[index]
      actor.group.visible = cinematic && walkTime >= 0
      if (!actor.group.visible) return
      const type = entityTypes[index % entityTypes.length]
      actor.group.scale.set(...type.scale)
      const x = Math.min(4.45, -4.85 + walkTime * [1.07, 1.02, 1.04, .98][index])
      const position = { x, z: -.12 + index % 2 * .2 }
      actorPose(actor, position, walkTime * .92)
      actor.group.position.y = floorHeight(x)
      actor.group.rotation.y = 1.1
      poseWisps(actor, time + index * .23)
    })
    labels[2].position.set(game.table.x, 1.42, game.table.z)
    for (const [index, { element, position }] of labels.entries()) {
      element.hidden = index === labels.length - 1 ? game.phase !== 'fireEscape' : game.phase !== 'blackout'
      const projected = position.clone().project(camera)
      element.style.left = `${(projected.x + 1) * 50}%`
      element.style.top = `${(1 - projected.y) * 50}%`
    }
    for (let i = 0; i < 72; i++) {
      const x = ((i * .61803399) % 1) * 2.77 - 1.38
      const y = ((i * .387 + time * (.65 + i % 5 * .09)) % 1) * -2.55 + 2.62
      const z = -.18 - (i % 7) * .136
      drops.set([x, y, z, x + .044, y + .13, z], i * 6)
    }
    rainGeometry.attributes.position.needsUpdate = true
    if (outside) {
      glow.visible = !cinematic
      glow.material.opacity = .49 + Math.sin(time * 3.5) * .19
      for (let i = 0; i < outsideDrops.length / 6; i++) {
        const x = ((i * .61803399) % 1) * 12 - 6
        const y = 3.4 - ((i * .387 + time * (.66 + i % 4 * .12)) % 1) * 6
        const z = ((i * .733) % 1) * 3.8 - 1.15
        outsideDrops.set([x, y, z, x + .055, y + .21, z], i * 6)
      }
      outsideRainGeometry.attributes.position.needsUpdate = true
    }
    renderer.render(scene, camera)
  }
  return { render }
}
