export const entityTypes = [
  { name: 'Tall shadow', voice: 'Growl', speed: 1.02, reach: .67, recovery: 6, scale: [.86, 1.58, .86] },
  { name: 'Heavy shadow', voice: 'Grunt', speed: .78, reach: .84, recovery: 5, scale: [1.38, 1.42, 1.25] },
  { name: 'Wiry shadow', voice: 'Hiss', speed: 1.2, reach: .57, recovery: 6, scale: [.94, 1.13, .95] },
]
export const encounterLimit = entityTypes.length
export const descentFadeAt = 7.7
export const descentDuration = 9.3
export const returnReachAt = 1.85
export const returnFadeAt = 2.2
export const returnDuration = 3.5
export const descentDelays = [0, 1.9, 2.8, 3.7]
export const partyDuration = 11.8
export const guestDepartureTimes = [4.7, 6.1, 7.5, 9.2]
export const sipDuration = 4.2
export const wakeGoal = 7
export const phoneDarkDuration = 3.2
export const phoneRushDuration = 1.45
export const streetLightFade = 1.6
export const streetWakeSeconds = 7
export const streetIntersection = { x: 62, z: .3 }
// Shared with the renderer: every repeated street block needs matching collision.
export const streetBlockOffsets = [0, 21, 42, 63]
export const streetProps = streetBlockOffsets.flatMap(offset => [
  { x: offset - 1.9, z: -.95, w: .65, d: .6 },
  { x: offset + 1.75, z: -.65, w: .72, d: .7 },
])


export const spots = {
  entry: { x: -5.2, z: -2.4 },
  coats: { x: -4.5, z: 0.1 },
  balcony: { x: 3.7, z: -3.5 },
  drawer: { x: -2.45, z: -2.53 },
  landing: { x: 4.65, z: 0 },
  returnDoor: { x: -5.02, z: 0 },
  returnHeroine: { x: 3.57, z: -2.73 },
}
const start = { x: 0, z: 0.9 }
const entryCountdown = 10
const fireEscapeStart = { x: -4.65, z: 0 }
const tableStart = { x: -1.4, z: -1.35 }
const furniture = [
  { x: 2.3, z: 2.9, w: 4, d: 1.2 },
  { x: -4.7, z: 2.45, w: 1.1, d: 1.45 },
  { x: -2.45, z: -3.65, w: 2.05, d: 0.75 },
]
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)

export const pinLocations = [
  { name: 'sideboard', x: -2.45, z: -2.53, clue: 'A drawer is half open beneath the picture.' },
  { name: 'bookshelf', x: -4.65, z: 1.25, clue: 'Something silver slipped between the books.' },
  { name: 'sofa', x: 2.3, z: 1.9, clue: 'A cushion is raised. Metal catches the lamplight.' },
]
export function newSetup(previous = -1, random = Math.random) {
  // Pick one of the other eight combinations; New run always changes something.
  const pick = Math.floor(random() * (previous < 0 ? 9 : 8))
  return previous < 0 ? pick : pick >= previous ? pick + 1 : pick
}

export function createGame(setbacks = {}, options = {}) {
  const arcade = options.mode === 'arcade'
  const setup = Math.max(0, Math.min(8, Math.trunc(options.setup || 0)))
  const pinSpot = pinLocations[arcade ? setup % 3 : 0]
  const penalties = { entry: 0, latch: 0, darkness: 0, ...setbacks }
  const game = {
    phase: 'party', introElapsed: 0, wakeProgress: 0, penalties, player: { ...start }, table: { ...tableStart },
    pursuer: { ...spots.entry }, elapsed: 0, entryAt: Infinity, reappearsAt: 0, encounters: 0,
    hidden: false, dragging: false, barricade: false, latch: 0,
    hasPin: false, examinedLatch: false, heardVoice: false, cinematicElapsed: 0, phoneElapsed: 0, streetChaseFailed: false,
    arcade, setup, pinSpot, runTime: 0, closeEncounters: 0, searchRemaining: 0, musicDucked: false, nightmareSeed: Math.random() * Math.PI * 2,
    chaseElapsed: 0, phoneOn: true, facing: { x: 1, z: 0 },
  }
  const entityIndex = () => arcade ? Math.floor(setup / 3) : Math.min(game.encounters, entityTypes.length - 1)
  const currentEntity = () => entityTypes[entityIndex()]
  let nearThreat = false

  function clear(x, z, actor) {
    const margin = 0.23
    const table = { ...game.table, w: 2.45, d: 1.42 }
    return Math.abs(x) <= 5.48 && z >= -3.82 && z <= 3.67
      && ![...furniture, ...(game.dragging && actor === game.player ? [] : [table])]
        .some(box => Math.abs(x - box.x) < box.w / 2 + margin
          && Math.abs(z - box.z) < box.d / 2 + margin)
  }

  function move(actor, x, z) {
    if (clear(actor.x + x, actor.z, actor)) actor.x += x
    if (clear(actor.x, actor.z + z, actor)) actor.z += z
  }

  function action() {
    if (game.phase === 'fireEscape') {
      return distance(game.player, spots.landing) < .85 ? 'Step onto street' : ''
    }
    if (game.phase === 'street') return game.heardVoice ? 'Look up' : 'Listen'
    if (game.phase === 'streetSafe') return 'End chapter'
    if (game.phase !== 'blackout') return ''
    if (game.hidden) return 'Leave hiding spot'
    if (game.dragging) return 'Let go of table'
    if (distance(game.player, spots.balcony) < 1.08) {
      return game.hasPin ? 'Open balcony latch' : 'Inspect jammed latch'
    }
    if (!game.hasPin && distance(game.player, pinSpot) < .83) return `Search ${pinSpot.name}`
    if (game.entryAt === Infinity && distance(game.player, spots.entry) < 1.13) return 'Check deadbolt'
    if (distance(game.player, spots.coats) < 0.9) return 'Hide behind coats'
    if (!game.barricade && game.elapsed < game.entryAt && distance(game.player, game.table) < 1.85) return 'Grab dining table'
    return ''
  }

  function triggerBreach() {
    if (game.entryAt === Infinity) game.entryAt = game.elapsed + entryCountdown - penalties.entry + (game.barricade ? 7 : 0)
  }

  function interact() {
    switch (action()) {
      case 'Leave hiding spot': game.hidden = false; break
      case 'Let go of table':
        // Return an abandoned table to its original position.
        game.dragging = false
        Object.assign(game.table, tableStart)
        if (!clear(game.player.x, game.player.z, game.player)) Object.assign(game.player, start)
        break
      case 'Inspect jammed latch': game.examinedLatch = true; break
      case 'Search sideboard':
      case 'Search bookshelf':
      case 'Search sofa':
        if (arcade) game.searchRemaining ||= 3
        else { game.hasPin = true; triggerBreach() }
        break
      case 'Check deadbolt': triggerBreach(); break
      case 'Open balcony latch': game.latch ||= 2.5 + penalties.latch; break
      case 'Step onto street':
        game.phase = arcade ? 'streetRun' : 'street'
        if (arcade) { Object.assign(game.player, { x: 0, z: .35 }); Object.assign(game.pursuer, { x: -3.45, z: .52 }) }
        break
      case 'Listen': game.heardVoice = true; break
      case 'Look up': game.phase = 'descent'; break
      case 'End chapter': game.phase = 'complete'; break
      case 'Hide behind coats': game.hidden = true; game.latch = 0; break
      case 'Grab dining table': game.dragging = true; break
    }
  }

  function retryFireEscape() {
    if (game.phase !== 'returnCaught') return
    game.phase = 'fireEscape'
    game.cinematicElapsed = 0
    Object.assign(game.player, fireEscapeStart)
  }

  function beginSip() {
    if (game.phase !== 'date') return
    game.introElapsed = 0
    game.phase = 'sip'
  }

  let breachResume
  let breachSeen = arcade && Boolean(options.skipReveal)
  function continueBreach() {
    if (game.phase !== 'breachIntro') return
    game.phase = breachResume
    breachSeen = true
  }

  function beginWake() {
    game.phase = 'waking'
    game.elapsed = 0
    game.entryAt = arcade ? Infinity : Math.max(.3, 1.55 - penalties.entry)
  }

  function beginPhoneTrap() {
    if (game.phase !== 'street' || game.heardVoice) return
    game.phase = 'phoneDark'
    game.phoneElapsed = 0
    Object.assign(game.player, { x: 0, z: .35 })
  }

  function retryStreet() {
    if (game.phase !== 'phoneCaught' && game.phase !== 'street') return
    game.phase = 'streetDazed'
    game.phoneElapsed = 0
    game.wakeProgress = 0
    game.streetChaseFailed = false
    game.chaseElapsed = 0
    lastShake = undefined
    lastShakeAt = -Infinity
    Object.assign(game.player, { x: 0, z: .35 })
  }

  function moveOnStreet(dx, dz, maxX) {
    const { player } = game
    const open = (x, z) => x >= Math.max(-3.7, -maxX) && x <= maxX && z >= -1.55 && z <= 2
      && !streetProps.some(prop => Math.abs(x - prop.x) < prop.w / 2 + .22
        && Math.abs(z - prop.z) < prop.d / 2 + .22)
    // Small steps prevent a long frame from tunnelling through a narrow prop.
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / .1))
    for (let i = 0; i < steps; i++) {
      if (open(player.x + dx / steps, player.z)) player.x += dx / steps
      if (open(player.x, player.z + dz / steps)) player.z += dz / steps
    }
  }

  // Use a small navigation grid so the pursuer can go around furniture.
  const step = 0.45
  const point = (x, z) => ({ x: x * step, z: z * step })
  const key = (x, z) => `${x},${z}`
  function nextWaypoint(target) {
    const x = Math.round(game.pursuer.x / step)
    const z = Math.round(game.pursuer.z / step)
    const queue = [{ x, z, first: null }]
    const seen = new Set([key(x, z)])
    let best = queue[0]
    for (let i = 0; i < queue.length; i++) {
      const cell = queue[i]
      if (distance(point(cell.x, cell.z), target) < distance(point(best.x, best.z), target)) best = cell
      if (distance(point(best.x, best.z), target) < step * 0.75) break
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cell.x + dx
        const nz = cell.z + dz
        const p = point(nx, nz)
        if (seen.has(key(nx, nz)) || !clear(p.x, p.z, game.pursuer)) continue
        seen.add(key(nx, nz))
        queue.push({ x: nx, z: nz, first: cell.first ?? p })
      }
    }
    return best.first ?? target
  }

  let waypoint
  let repath = 0
  let lastShake
  let lastShakeAt = -Infinity
  function shake(x, z, length, time) {
    if (game.wakeProgress >= wakeGoal || length < .48 || time - lastShakeAt < .075) return
    x /= length
    z /= length
    if (lastShake && x * lastShake.x + z * lastShake.z > -.24) return
    if (lastShake) game.wakeProgress++
    lastShake = { x, z }
    lastShakeAt = time
  }

  function update(dt, inputX, inputZ) {
    if (arcade && (game.phase === 'blackout' || game.phase === 'fireEscape' || game.phase === 'streetRun')) game.runTime += dt
    if (game.phase === 'party' || game.phase === 'sip') {
      game.introElapsed += dt
      if (game.phase === 'party' && game.introElapsed >= partyDuration) game.phase = 'date'
      else if (game.phase === 'sip' && game.introElapsed >= sipDuration) beginWake()
      return
    }
    if (game.phase === 'returnNightmare') {
      game.cinematicElapsed = Math.min(returnDuration, game.cinematicElapsed + dt)
      if (game.cinematicElapsed >= returnDuration) game.phase = 'returnCaught'
      return
    }
    if (game.phase === 'descent') {
      game.cinematicElapsed = Math.min(descentDuration, game.cinematicElapsed + dt)
      if (game.cinematicElapsed >= descentDuration) game.phase = 'complete'
      return
    }
    const length = Math.hypot(inputX, inputZ)
    if (length > .15 && ['blackout', 'fireEscape', 'phoneDark', 'streetRun'].includes(game.phase)) {
      game.facing.x = inputX / length
      game.facing.z = inputZ / length
    }
    const normalizer = Math.max(1, length)
    if (game.phase === 'phoneDark') {
      game.phoneElapsed += dt
      const step = 1.6 * dt / normalizer
      moveOnStreet(inputX * step, inputZ * step, 2.8)
      if (game.phoneElapsed >= phoneDarkDuration) {
        game.phase = 'phoneRush'
        game.phoneElapsed -= phoneDarkDuration
      }
      return
    }
    if (game.phase === 'streetDazed') {
      game.phoneElapsed += dt
      const wakeTime = game.phoneElapsed - streetLightFade
      if (wakeTime < 0) return
      if (wakeTime < streetWakeSeconds) shake(inputX, inputZ, length, wakeTime)
      if (game.wakeProgress === wakeGoal) {
        game.phase = 'streetRun'
        game.phoneElapsed = 0
        Object.assign(game.pursuer, { x: -3.45, z: .52 })
      } else if (wakeTime >= streetWakeSeconds) {
        game.phase = 'phoneRush'
        game.phoneElapsed = wakeTime - streetWakeSeconds
      }
      return
    }
    if (game.phase === 'streetRun') {
      game.chaseElapsed += dt
      const step = 3.45 * dt / normalizer
      moveOnStreet(inputX * step, inputZ * step, streetIntersection.x + .75)
      if (distance(game.player, streetIntersection) < .92) {
        game.phase = arcade ? 'complete' : 'streetSafe'
        return
      }
      const range = distance(game.pursuer, game.player)
      if (range <= .65) {
        game.streetChaseFailed = true
        game.phoneElapsed = 0
        game.phase = arcade ? 'caught' : 'phoneRush'
        game.lossReason = 'The street shadow caught you. Keep moving toward the blue exit chevron.'
      } else {
        const stride = Math.min(range, dt * (range > 5 ? 3.7 : game.chaseElapsed % 6 > 4.8 ? 3.9 : 2.95)) / range
        game.pursuer.x += (game.player.x - game.pursuer.x) * stride
        game.pursuer.z += (game.player.z - game.pursuer.z) * stride
      }
      return
    }
    if (game.phase === 'phoneRush') {
      game.phoneElapsed += dt
      if (game.phoneElapsed >= phoneRushDuration) game.phase = 'phoneCaught'
      return
    }
    if (game.phase === 'fireEscape') {
      const step = 1.55 * dt / normalizer
      game.player.x = Math.max(-5.12, Math.min(5.12, game.player.x + inputX * step))
      game.player.z = Math.max(-.65, Math.min(.65, game.player.z + inputZ * step))
      if (inputX < 0 && game.player.x <= spots.returnDoor.x) {
        if (arcade) {
          game.phase = 'caught'
          game.lossReason = 'You turned back into the apartment. The way out was to the right.'
          return
        }
        Object.assign(game.player, spots.returnHeroine)
        game.cinematicElapsed = 0
        game.phase = 'returnNightmare'
      }
      return
    }
    const waking = game.phase === 'waking'
    if (!waking && game.phase !== 'blackout') return
    if (!breachSeen && game.elapsed + dt >= game.entryAt) {
      game.elapsed = game.entryAt
      breachResume = game.phase
      game.phase = 'breachIntro'
      return
    }
    game.elapsed += dt
    if (waking) shake(inputX, inputZ, length, game.elapsed)
    if (waking && game.wakeProgress === wakeGoal && game.elapsed - lastShakeAt >= .16) {
      game.phase = 'blackout'
      if (arcade) game.entryAt = game.elapsed + 9
    }
    if (!waking && !game.hidden && length) {
      const speed = game.dragging ? 1.8 : 3.35
      const x = game.player.x
      const z = game.player.z
      game.latch = 0
      game.searchRemaining = 0
      move(game.player, inputX / normalizer * speed * dt, inputZ / normalizer * speed * dt)
      if (game.dragging) {
        game.table.x += game.player.x - x
        game.table.z += game.player.z - z
        if (distance(game.player, spots.entry) < 1.1 && game.elapsed < game.entryAt) {
          game.barricade = true
          game.dragging = false
          if (game.entryAt !== Infinity) game.entryAt += 7
          Object.assign(game.table, { x: -4.58, z: -2.5 })
          Object.assign(game.player, { x: -3.05, z: -2.48 })
          Object.assign(game.pursuer, { x: -4.9, z: -1.45 })
        }
      }
    }
    if (entityInside()) {
      const entity = currentEntity()
      const proximity = distance(game.player, game.pursuer)
      if (!game.hidden && proximity < 1.5) nearThreat = true
      if (nearThreat && (game.hidden || proximity > 2.2)) {
        game.closeEncounters++
        nearThreat = false
      }
      const patrol = game.elapsed % 10 < 5 ? { x: 0, z: 1.4 } : { x: 2.85, z: -2.1 }
      const target = game.hidden ? patrol : game.player
      repath -= dt
      if (repath <= 0 || !waypoint || distance(game.pursuer, waypoint) < 0.12) {
        waypoint = nextWaypoint(target)
        repath = 0.16
      }
      const range = distance(game.pursuer, waypoint)
      if (range > 0.01) {
        const amount = Math.min(range, dt * entity.speed * (game.hidden ? .64 : 1)) / range
        move(game.pursuer, (waypoint.x - game.pursuer.x) * amount, (waypoint.z - game.pursuer.z) * amount)
      }
      if (!game.hidden && distance(game.player, game.pursuer) < entity.reach) {
        game.encounters++
        if (arcade || game.encounters >= encounterLimit) {
          game.phase = 'caught'
          return
        }
        game.reappearsAt = game.elapsed + entity.recovery
        Object.assign(game.pursuer, game.barricade ? { x: -4.9, z: -1.45 } : spots.entry)
        waypoint = undefined
      }
    }
    if (game.searchRemaining > 0 && !game.hidden && !length) {
      game.searchRemaining = Math.max(0, game.searchRemaining - dt)
      if (!game.searchRemaining) { game.hasPin = true; triggerBreach() }
    }
    if (game.latch > 0) {
      game.latch -= dt
      if (game.latch <= 0) {
        game.phase = 'fireEscape'
        Object.assign(game.player, fireEscapeStart)
      }
    }
  }

  function entityArrivalAt() {
    return Math.max(game.entryAt, game.reappearsAt)
  }

  function entityInside() {
    return game.phase !== 'breachIntro' && game.elapsed >= entityArrivalAt()
  }

  return Object.assign(game, { action, interact, update, entityArrivalAt, entityInside, continueBreach, beginSip, beginWake, beginPhoneTrap, retryStreet, retryFireEscape, entityIndex, currentEntity })
}
