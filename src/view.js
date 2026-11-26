import * as T from 'three'
import { nightmareBeat } from './nightmare.js'
import { phoneBrightness } from './phone.js'
import { dressStreet } from './street.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import lampUrl from './assets/models/floor-lamp.glb?url'
import { descentDelays, entityTypes, guestDepartureTimes, partyDuration, phoneRushDuration, returnReachAt, spots, streetIntersection, streetLightFade, streetProps } from './game.js'
import { createHeroine } from './heroine.js'
import woodUrl from './assets/wood.webp'
import plasterUrl from './assets/plaster.webp'
import rugUrl from './assets/rug.webp'
import fabricUrl from './assets/upholstery.webp'

export function createView(container) {
  const scene = new T.Scene()
  const nightmareFog = new T.FogExp2('#100711', .085)
  scene.background = new T.Color('#100d17')
  const camera = new T.OrthographicCamera()
  camera.position.set(0, 15, 9.5)
  camera.lookAt(0, 0, -0.35)
  const renderer = new T.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))
  renderer.outputColorSpace = T.SRGBColorSpace
  renderer.toneMapping = T.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
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

  // A practical light keeps the apartment recognisable after the party dies.
  const practical = new T.PointLight('#ffc17d', 14, 6, 2)
  practical.position.set(4.8, 1.48, 2.85)
  room.add(practical)
  new GLTFLoader().load(lampUrl, ({ scene: lamp }) => {
    lamp.position.set(4.8, 0, 2.85)
    room.add(lamp)
  }, undefined, error => console.error('Apartment lamp failed to load', error))

  // Narrow moonlit stripes suggest blinds without adding shadow-map cost.
  const stripes = new T.Group()
  room.add(stripes)
  const pinClue = new T.Mesh(new T.CylinderGeometry(.018, .018, .18, 8), new T.MeshStandardMaterial({
    color: '#e2d7b3', metalness: .7, roughness: .3, emissive: '#77694c', emissiveIntensity: .25,
  }))
  pinClue.rotation.z = Math.PI / 2
  room.add(pinClue)
  const openDrawer = box(room, '#855246', -2.45, .51, -3.10, .58, .57, .24)
  const raisedCushion = box(room, '#c08a7e', 2.3, .8, 2.7, .76, .18, .68)
  raisedCushion.rotation.x = -.22
  for (let i = 0; i < 7; i++) {
    const stripe = new T.Mesh(new T.PlaneGeometry(.085, 2.8), new T.MeshBasicMaterial({
      color: '#8faec9', transparent: true, opacity: .09, depthWrite: false,
    }))
    stripe.rotation.set(-Math.PI / 2, 0, -.32)
    stripe.position.set(2.4 + i * .25, .065, -2.1)
    stripes.add(stripe)
  }

  function character(kind, palette = {}) {
    const group = new T.Group()
    scene.add(group)
    const heroine = kind === 'heroine'
    const shadow = kind === 'shadow'
    const skin = heroine ? '#8d543c' : shadow ? '#08060c' : palette.skin ?? '#c48c6d'
    const top = heroine ? '#f49cae' : shadow ? skin : palette.shirt ?? '#789680'
    const jeans = heroine ? '#4278ab' : shadow ? skin : '#3b364d'
    const hair = heroine ? '#ad573b' : palette.hair ?? '#302332'
    const legs = []
    const arms = []
    for (const x of [-.13, .13]) {
      const leg = new T.Group()
      leg.position.set(x, .78, 0)
      group.add(leg)
      oval(leg, jeans, 0, -.31, 0, .127, .36, .14)
      oval(leg, heroine ? '#e889a1' : shadow ? skin : '#3f283a', 0, -.66, .05, .12, .08, .18)
      legs.push(leg)
      const arm = oval(group, top, x * 2.05, .94, .01, .082, .26, .092)
      arm.rotation.z = x * .95
      const hand = oval(group, skin, x * 2.43, .74, .03, .07, .096, .075)
      arms.push({ arm, hand })
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
    return { group, legs, arms }
  }
  const player = character('heroine')
  const poseHeroine = createHeroine(scene, player.group, camera)
  const heroineShadow = contact(room, 0, 0, 1.05, .65, .75)
  const date = character('date')
  // Party-only proportions: the heroine and shadow builders stay independent.
  function partyGuest(palette, index) {
    const group = new T.Group()
    scene.add(group)
    const legs = []
    const arms = []
    const denim = ['#3e526f', '#574451', '#383d47'][index % 3]
    for (const side of [-1, 1]) {
      const leg = new T.Group()
      leg.position.set(side * .15, .61, 0)
      group.add(leg)
      oval(leg, denim, 0, -.22, 0, .145, .27, .16)
      oval(leg, '#302a2b', 0, -.49, .07, .16, .095, .23)
      legs.push(leg)
      oval(group, palette.shirt, side * .32, .86, 0, .14, .23, .15).rotation.z = side * .24
      const hand = oval(group, palette.skin, side * .36, .67, .045, .12, .13, .12)
      arms.push({ hand })
      oval(group, palette.skin, side * .36, 1.39, .01, .085, .12, .09)
    }
    oval(group, denim, 0, .63, 0, .29, .16, .19)
    oval(group, palette.shirt, 0, .9, 0, .32, .3, .21)
    // Rounded head, dot eyes and a small smile echo the supplied civilian refs.
    oval(group, palette.hair, 0, 1.45, -.045, .385, .39, .29)
    oval(group, palette.skin, 0, 1.38, .075, .33, .32, .26)
    const fringe = oval(group, palette.hair, -.075, 1.65, .12, .3, .15, .24)
    fringe.rotation.z = index % 2 ? -.23 : .22
    if (index % 3 === 1) {
      oval(group, palette.hair, .13, 1.83, -.13, .18, .18, .18)
      for (const side of [-1, 1]) oval(group, '#d4ad68', side * .32, 1.22, .09, .04, .045, .035)
    }
    for (const side of [-1, 1]) oval(group, '#18121b', side * .115, 1.4, .318, .035, .057, .022)
    const smile = new T.QuadraticBezierCurve3(new T.Vector3(-.065, 1.27, .32), new T.Vector3(0, 1.22, .34), new T.Vector3(.065, 1.27, .32))
    shape(group, new T.TubeGeometry(smile, 8, .012, 5, false), '#231923', 0, 0, 0, false)
    // Plain tees, jeans and occasional open cardigans: no workplace uniforms.
    oval(group, '#dfc9b6', 0, 1.15, .08, .115, .042, .13)
    if (index % 3 === 0) {
      for (const side of [-1, 1]) oval(group, '#414153', side * .22, .91, .12, .09, .23, .11)
    }
    return { group, legs, arms }
  }
  const guestPositions = [
    { x: 2.4, z: -.1, shirt: '#a6556d', skin: '#87573e', hair: '#242127', scale: 1.07 },
    { x: -3.75, z: -.1, shirt: '#4a7790', skin: '#d79777', hair: '#845133', scale: .92 },
    { x: 3.85, z: -2.05, shirt: '#a48050', skin: '#a97152', hair: '#3f2429', scale: 1.01 },
    { x: -4.6, z: -1.15, shirt: '#694d8c', skin: '#a66e50', hair: '#37253b', scale: 1.12 },
    { x: -2.35, z: .68, shirt: '#98565b', skin: '#794c3e', hair: '#242126', scale: .95 },
    { x: 4.62, z: 1.05, shirt: '#507f73', skin: '#cf8a63', hair: '#472b27', scale: 1.04 },
    { x: .55, z: -2.7, shirt: '#746c9e', skin: '#e0a482', hair: '#663b34', scale: .98 },
  ]
  const guests = guestPositions.map((spec, index) => {
    const actor = partyGuest(spec, index)
    actor.group.scale.setScalar(spec.scale)
    actor.group.visible = false
    return { actor, spec, departure: guestDepartureTimes[index - 3] ?? Infinity }
  })
  const partyLight = new T.PointLight('#ff688f', 18, 7.5, 2)
  partyLight.position.set(2, 2.9, 1)
  room.add(partyLight)
  const partyFill = new T.PointLight('#ad86ff', 14, 8, 2)
  partyFill.position.set(-3, 2.2, -.5)
  room.add(partyFill)
  const dreamLight = new T.PointLight('#9470ff', 0, 5, 2)
  dreamLight.position.set(-4.55, 1.95, -2.28)
  room.add(dreamLight)
  const returnLight = new T.PointLight('#d52b56', 0, 5, 2)
  returnLight.position.set(3.1, 1.8, -2.2)
  room.add(returnLight)
  const drink = shape(room, new T.CylinderGeometry(.074, .058, .19, 10), '#e3b385', .24, 1.05, 1.17, false)
  drink.material = new T.MeshBasicMaterial({ color: '#e1ac7c', depthTest: false, depthWrite: false, transparent: true })
  drink.renderOrder = 11

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
  scene.add(outsideRain)

  const phoneStreet = new T.Group()
  phoneStreet.visible = false
  scene.add(phoneStreet)
  const streetRoad = box(phoneStreet, '#23283a', 32, -.13, .15, 76, .25, 13.2, false)
  streetRoad.material = dressStreet(phoneStreet)
  for (let i = 0; i < 6; i++) {
    box(phoneStreet, '#9a9da9', streetIntersection.x, .006, -1.28 + i * .57, 1.65, .016, .23, false)
  }
  const streetLamp = new T.Group()
  phoneStreet.add(streetLamp)
  streetLamp.position.set(streetIntersection.x, 0, -1.96)
  shape(streetLamp, new T.CylinderGeometry(.045, .075, 3.1, 16), '#535e71', 0, 1.55, 0, false)
  shape(streetLamp, new T.CylinderGeometry(.14, .18, .18, 16), '#353d50', 0, .09, 0, false)
  const neck = new T.CatmullRomCurve3([new T.Vector3(0, 2.8, 0), new T.Vector3(0, 3.13, .18), new T.Vector3(0, 3.16, .7), new T.Vector3(0, 3.02, .9)])
  shape(streetLamp, new T.TubeGeometry(neck, 16, .045, 8, false), '#525b6e', 0, 0, 0, false)
  shape(streetLamp, new RoundedBoxGeometry(.5, .14, .38, 2, .06), '#353b4c', 0, 2.98, .9, false)
  const lampLens = shape(streetLamp, new RoundedBoxGeometry(.42, .035, .31, 2, .025), '#f6d8a8', 0, 2.9, .9, false)
  lampLens.material = new T.MeshBasicMaterial({ color: '#fff0c7' })
  const intersectionLight = new T.PointLight('#ffc585', 26, 8, 2)
  intersectionLight.position.set(0, 2.68, .84)
  streetLamp.add(intersectionLight)
  const phoneLight = new T.PointLight('#88b9ff', 7.8, 2.65, 2)
  scene.add(phoneLight)
  const phoneBeam = new T.SpotLight('#b6dcff', 15, 7, .5, .85, 1.5)
  scene.add(phoneBeam, phoneBeam.target)
  const phonePool = new T.Mesh(new T.PlaneGeometry(3.8, 3.2), new T.MeshBasicMaterial({
    color: '#355f9b', map: shadowMap, transparent: true, opacity: .42, depthWrite: false,
  }))
  phonePool.rotation.x = -Math.PI / 2
  scene.add(phonePool)
  const rushLight = new T.PointLight('#446aa9', 18, 9, 2)
  rushLight.position.set(-2, 2.3, -2.8)
  phoneStreet.add(rushLight)

  const markers = document.querySelector('#markers')
  const labels = [
    ['Entry', -5.05, 2.4, spots.entry.z],
    ['Hanging coats', -4.85, 1.94, spots.coats.z],
    ['Dining table', 0, 1.2, 0],
    ['Balcony latch', spots.balcony.x, 2.1, spots.balcony.z],
    ['Sideboard', spots.drawer.x, 1.24, -3.3],
    ['Apartment', spots.returnDoor.x, 1.4, -.6],
    ['Landing', spots.landing.x, floorHeight(spots.landing.x) + .83, 0],
    ['Streetlight', streetIntersection.x, 1.8, .3],
  ].map(([name, x, y, z]) => {
    const element = document.createElement('button')
    element.className = 'marker'
    element.type = 'button'
    element.dataset.place = name
    element.dataset.kind = ({ Entry: 'uncertain', 'Hanging coats': 'hide', 'Dining table': 'aid', 'Balcony latch': 'escape', Sideboard: 'aid', Apartment: 'uncertain', Landing: 'escape', Streetlight: 'escape' })[name]
    element.setAttribute('aria-label', `Examine ${name}`)
    element.textContent = ''
    element.addEventListener('click', () => document.dispatchEvent(new CustomEvent('examine-place', { detail: element.dataset.place })))
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

  let invertedRoom = false
  const nightmareMaterials = new Map()
  const roomSurfaces = []
  room.traverse(mesh => {
    const material = mesh.material
    if (!mesh.isMesh || !(material?.isMeshToonMaterial || material?.isMeshStandardMaterial)) return
    roomSurfaces.push({ mesh, original: material })
  })

  function setRoomInverted(active) {
    if (invertedRoom === active) return
    invertedRoom = active
    for (const { mesh, original } of roomSurfaces) {
      if (!active) {
        mesh.material = original
        continue
      }
      if (!nightmareMaterials.has(original)) {
        const inverted = original.clone()
        inverted.onBeforeCompile = shader => {
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <map_fragment>',
            '#include <map_fragment>\n diffuseColor.rgb = (vec3(1.0) - diffuseColor.rgb) * vec3(0.44, 0.55, 0.72);',
          )
        }
        nightmareMaterials.set(original, inverted)
      }
      mesh.material = nightmareMaterials.get(original)
    }
  }

  function render(game, time, dateOffscreen) {
    if (game.phase === 'breachIntro' || game.phase === 'street' || game.phase === 'complete' || game.phase === 'phoneCaught' || game.phase === 'returnCaught') return
    const party = game.phase === 'party'
    const sip = game.phase === 'sip'
    const waking = game.phase === 'waking'
    const returning = game.phase === 'returnNightmare'
    const nightmare = nightmareBeat(game.cinematicElapsed, game.nightmareSeed, reducedMotion.matches)
    scene.fog = returning ? nightmareFog : null
    setRoomInverted(returning)
    const partyScene = party || sip || game.phase === 'date'
    const blackout = !partyScene
    // Slow electrical instability, with a steady alternative for reduced motion.
    const unease = reducedMotion.matches ? 1 : .91 + Math.sin(time * 1.7) * .05 + Math.sin(time * 3.1) * .04
    practical.intensity = returning ? .35 : (blackout ? 3.6 : 15) * unease
    practical.color.set(blackout ? '#a7b8a0' : '#ffc17d')
    stripes.visible = blackout
    pinClue.visible = game.arcade && blackout && !game.hasPin
    openDrawer.visible = pinClue.visible && game.setup % 3 === 0
    raisedCushion.visible = pinClue.visible && game.setup % 3 === 2
    const cluePositions = [[-2.45, .85, -2.97], [-4.65, 1.03, 1.60], [2.3, .74, 2.38]]
    pinClue.position.set(...cluePositions[game.setup % 3])
    const dreaming = waking || returning || game.phase === 'blackout'
    const night = party ? Math.min(1, game.introElapsed / partyDuration) : 1
    const cinematic = game.phase === 'descent'
    const outside = game.phase === 'fireEscape' || cinematic
    const phoneDark = game.phase === 'phoneDark'
    const phoneRush = game.phase === 'phoneRush'
    const streetDazed = game.phase === 'streetDazed'
    const streetRun = game.phase === 'streetRun'
    const streetSafe = game.phase === 'streetSafe'
    const streetChase = streetRun || streetSafe
    const trap = phoneDark || phoneRush || streetDazed || streetChase
    const pan = cinematic && !reducedMotion.matches ? game.cinematicElapsed * .085 : 0
    camera.up.set(0, 1, 0)
    if (returning) {
      camera.up.set(Math.sin(nightmare.roll), Math.cos(nightmare.roll), 0)
      camera.position.set(3.05 + nightmare.shakeX, 7.4 + nightmare.shakeY, 5.3)
      camera.lookAt(2.65 + nightmare.shakeX * .4, .65, -1.9)
      camera.zoom = reducedMotion.matches ? 1.49 : 1.42 + nightmare.approach * .17 + nightmare.impact * .11
    } else if (streetChase) {
      const { x, z } = game.player
      const lead = Math.min(x + 1.65, streetIntersection.x - .25)
      camera.position.set(lead, 7.4, z + 8.5)
      camera.lookAt(lead, .9, z - 1.4)
      camera.zoom = 1.23
    } else if (phoneDark || streetDazed) {
      const { x, z } = game.player
      camera.position.set(x, 7.5, z + 8.5)
      camera.lookAt(x, 1, z - 1.4)
      camera.zoom = 1.25
    } else if (phoneRush) {
      camera.position.set(0, 2.15, 5.65)
      camera.lookAt(0, .63, -1.2)
      camera.zoom = 1.8
    } else if (party || sip) {
      const drift = party && !reducedMotion.matches ? Math.sin(game.introElapsed * .22) * .75 : 0
      camera.position.set(drift, 12.7, 10.4)
      camera.lookAt(drift, .2, -.32)
      camera.zoom = sip ? 1.23 : 1.01
    } else if (cinematic) {
      camera.position.set(pan, 7.8, 11.4)
      camera.lookAt(pan, .16, 0)
      camera.zoom = 1.1
    } else {
      camera.position.set(0, 15, 9.5)
      camera.lookAt(0, 0, -.35)
      camera.zoom = 1
    }
    camera.updateProjectionMatrix()
    const inside = (game.phase === 'blackout' || waking) && game.entityInside()
    const ground = outside ? floorHeight(game.player.x) : 0
    room.visible = !outside && !trap
    fireEscape.visible = outside
    phoneStreet.visible = trap
    outsideRain.visible = outside || trap
    outsideRain.material.opacity = phoneDark || streetDazed ? .14 : phoneRush ? .32 : .48
    const phoneStrength = phoneBrightness(game)
    phoneLight.visible = phoneStrength > 0 && !game.hidden
    phonePool.visible = phoneLight.visible
    phoneBeam.visible = phoneLight.visible
    phoneLight.intensity = 7.8 * phoneStrength
    phoneBeam.intensity = 15 * phoneStrength
    phonePool.material.opacity = .3 * phoneStrength
    rushLight.visible = phoneRush
    streetLamp.visible = trap
    if (phoneLight.visible) {
      const phoneGround = outside ? floorHeight(game.player.x) : 0
      const side = game.facing.x < -.15 ? -1 : 1
      phoneLight.position.set(.48 * side, .35, .06).applyQuaternion(camera.quaternion)
      phoneLight.position.add(new T.Vector3(game.player.x, phoneGround + 1.4, game.player.z))
      phoneBeam.position.copy(phoneLight.position)
      phoneBeam.target.position.set(game.player.x + game.facing.x * 2.7, phoneGround + .03, game.player.z + game.facing.z * 2.7)
      phonePool.position.set(game.player.x + game.facing.x * .8, phoneGround + .065, game.player.z + game.facing.z * .8)
    }
    ceiling.intensity = blackout ? .04 : 2.1 - night * 1.15
    ambient.intensity = streetChase ? .38 : trap ? .25 : blackout ? .31 : 1.21 - night * .38
    moon.intensity = trap ? 0 : blackout ? 26 : 12 + night * 9
    partyLight.intensity = partyScene ? (1 - night * .78) * (18 + Math.sin(time * 4.4) * 4) : 0
    dreamLight.intensity = dreaming ? 8 + Math.sin(time * 2.8) * 1.45 : 0
    returnLight.intensity = returning ? 5 + nightmare.light * 12 : 0
    if (returning) {
      ambient.intensity = .12 + nightmare.light * .13
      moon.intensity = 7 + nightmare.light * 16
      dreamLight.intensity = 5 + nightmare.light * 13
      dreamLight.color.set('#bf3158')
    } else dreamLight.color.set('#9470ff')
    partyFill.intensity = partyScene ? (1 - night * .7) * (14 + Math.sin(time * 3.2 + 1) * 3) : 0
    const candleLit = !returning && (party || !game.penalties.darkness)
    flame.visible = candleLit
    candle.intensity = candleLit ? (blackout ? 23 : 11) + Math.sin(time * 19) * 1.4 + Math.sin(time * 8) * 1.2 : 0
    flame.scale.y = 1 + Math.sin(time * 16) * .13
    table.position.set(game.table.x, 0, game.table.z)
    const burst = inside ? Math.min(1, (game.elapsed - game.entityArrivalAt()) / .28) : 0
    const swing = 1 - (1 - burst) ** 3 + Math.sin(burst * Math.PI) * .19
    const partyDoorOpen = party && guestDepartureTimes.some(end => game.introElapsed > end - .45 && game.introElapsed < end + .27)
    door.rotation.y = partyDoorOpen ? -.92 : -1.17 * swing
    glass.position.x = outside ? -1.35 : 0
    date.group.visible = partyScene && !dateOffscreen
    date.group.position.set(sip ? .95 : .3, 0, sip ? .15 : -2.23)
    date.group.rotation.y = sip ? -.7 : -.3
    for (const [index, { actor, spec, departure }] of guests.entries()) {
      actor.group.visible = partyScene && (index < 3 || (party && game.introElapsed < departure))
      if (!actor.group.visible) continue
      const leave = party ? Math.max(0, 1 - (departure - game.introElapsed) / 1.4) : 0
      const sway = Math.sin(time * (1.6 + index * .14) + index) * (.19 - night * .12)
      const x = T.MathUtils.lerp(spec.x + sway, spots.entry.x, leave)
      const z = T.MathUtils.lerp(spec.z + Math.cos(time * 1.65 + index) * .11, spots.entry.z, leave)
      actorPose(actor, { x, z }, time * .56)
      if (!leave) {
        actor.group.rotation.y = Math.sin(time * 1.3 + index) * .38 + (index % 2 ? -.52 : .56)
        actor.legs[0].rotation.x *= .13
        actor.legs[1].rotation.x *= .13
      }
    }
    drink.visible = sip && game.introElapsed < 1.55
    if (drink.visible) {
      const lift = Math.sin(Math.min(1, game.introElapsed / 1.55) * Math.PI)
      drink.position.set(.26 - lift * .18, 1.02 + lift * .5, 1.18)
      drink.rotation.z = -.21 * lift
    }
    pursuer.group.visible = inside || phoneRush || streetRun || returning
    actorPose(player, game.player, time)
    player.group.position.y = ground
    poseHeroine(game, time, ground)
    heroineShadow.position.x = game.player.x
    heroineShadow.position.z = game.player.z + .06
    heroineShadow.visible = !game.hidden
    let reach = 0
    if (returning) {
      const timeInShot = game.cinematicElapsed
      const approach = nightmare.approach
      const lurch = nightmare.side
      const x = T.MathUtils.lerp(1.12, game.player.x - .27, approach) + lurch
      const z = T.MathUtils.lerp(-.55, game.player.z + .41, approach)
      actorPose(pursuer, { x, z }, time * 2.8)
      // It keeps looking out of the scene while its body closes on her.
      pursuer.group.rotation.y = T.MathUtils.lerp(.15, Math.atan2(game.player.x - x, game.player.z - z), Math.max(0, approach - .8) * 1.5)
      reach = T.MathUtils.smoothstep(timeInShot, returnReachAt - .45, returnReachAt + .12)
      pursuer.group.scale.set(1.17 + reach * .24, 1.35 + reach * .22, 1.2)
      pursuer.group.rotation.x = -.09 - reach * .3
      pursuer.group.rotation.z = reducedMotion.matches ? 0 : Math.sin(timeInShot * 23 + game.nightmareSeed) * .065
      poseWisps(pursuer, time * 2.4)
    } else if (phoneRush) {
      const progress = Math.min(1, game.phoneElapsed / phoneRushDuration)
      const dash = progress ** 1.45
      const scramble = Math.sin(progress * 34) * (reducedMotion.matches ? 0 : .26)
      actorPose(pursuer, { x: scramble, z: -5.2 + dash * 8.4 }, time * 2.15)
      pursuer.group.rotation.y = 0
      pursuer.group.rotation.x = -.35
      pursuer.group.scale.set(1.17, .75, 1.35)
      poseWisps(pursuer, time * 2.1)
    } else if (inside || streetRun) actorPose(pursuer, game.pursuer, streetRun ? time * 1.54 : time)
    else {
      pursuer.group.position.set(game.pursuer.x, 0, game.pursuer.z)
      pursuer.group.rotation.y = 0
    }
    const entity = game.currentEntity()
    if (!returning) pursuer.group.rotation.z = 0
    if (!phoneRush && !returning) {
      pursuer.group.scale.set(...(streetRun ? [1.12, .96, 1.2] : entity.scale))
      pursuer.group.rotation.x = streetRun ? -.17 : 0
    }
    for (const [index, { arm, hand }] of pursuer.arms.entries()) {
      const side = index === 0 ? -1 : 1
      arm.rotation.x = -1.09 * reach
      arm.rotation.z = side * (.1235 - reach * .67)
      arm.scale.y = 1 + reach * .55
      hand.position.set(side * (.3159 - reach * .12), .74 + reach * .04, .03 + reach * .34)
    }
    if (inside || streetRun) poseWisps(pursuer, time)
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
    labels[4].position.set(game.pinSpot.x, 1.24, game.pinSpot.z - .5)
    labels[4].element.dataset.place = 'Hidden aid'
    labels[4].element.setAttribute('aria-label', `Examine ${game.pinSpot.name}`)
    for (const [index, { element, position }] of labels.entries()) {
      element.hidden = index === 7 ? game.phase !== 'streetRun' : index >= 5 ? game.phase !== 'fireEscape' : game.phase !== 'blackout'
      const projected = position.clone().project(camera)
      element.style.left = `${Math.max(5, Math.min(95, (projected.x + 1) * 50))}%`
      element.style.top = `${Math.max(15, Math.min(78, (1 - projected.y) * 50))}%`
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
    }
    if (outsideRain.visible) {
      for (let i = 0; i < outsideDrops.length / 6; i++) {
        const x = ((i * .61803399) % 1) * (streetChase ? 15 : 12) - (streetChase ? 4 : 6)
        const y = 3.4 - ((i * .387 + time * (.66 + i % 4 * .12)) % 1) * 6
        const z = ((i * .733) % 1) * (trap ? 10 : 3.8) - (trap ? 6 : 1.15)
        outsideDrops.set([x, y, z, x + .055, y + .21, z], i * 6)
      }
      outsideRainGeometry.attributes.position.needsUpdate = true
    }
    renderer.render(scene, camera)
  }
  return { render }
}
