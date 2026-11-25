export const entityTypes = [
  { name: 'Tall shadow', voice: 'Growl', speed: 1.02, reach: .67, recovery: 6, scale: [.86, 1.58, .86] },
  { name: 'Heavy shadow', voice: 'Grunt', speed: .78, reach: .84, recovery: 5, scale: [1.38, 1.42, 1.25] },
  { name: 'Wiry shadow', voice: 'Hiss', speed: 1.2, reach: .57, recovery: 6, scale: [.94, 1.13, .95] },
]
export const encounterLimit = entityTypes.length
export const descentFadeAt = 7.7
export const descentDuration = 9.3
export const descentDelays = [0, 1.9, 2.8, 3.7]

export const spots = {
  entry: { x: -5.2, z: -2.4 },
  coats: { x: -4.5, z: 0.1 },
  balcony: { x: 3.7, z: -3.5 },
  drawer: { x: -2.45, z: -2.53 },
  landing: { x: 4.65, z: 0 },
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

export function createGame(setbacks = {}) {
  const penalties = { entry: 0, latch: 0, darkness: 0, ...setbacks }
  const game = {
    phase: 'date', penalties, player: { ...start }, table: { ...tableStart },
    pursuer: { ...spots.entry }, elapsed: 0, entryAt: Infinity, reappearsAt: 0, encounters: 0,
    hidden: false, dragging: false, barricade: false, latch: 0,
    hasPin: false, examinedLatch: false, phoneRead: false, cinematicElapsed: 0,
  }

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
    if (game.phase === 'street') return game.phoneRead ? 'Look up' : 'Check phone'
    if (game.phase !== 'blackout') return ''
    if (game.hidden) return 'Leave hiding spot'
    if (game.dragging) return 'Let go of table'
    if (distance(game.player, spots.balcony) < 1.08) {
      return game.hasPin ? 'Open balcony latch' : 'Inspect jammed latch'
    }
    if (!game.hasPin && distance(game.player, spots.drawer) < .83) return 'Search sideboard'
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
        game.hasPin = true
        triggerBreach()
        break
      case 'Check deadbolt': triggerBreach(); break
      case 'Open balcony latch': game.latch ||= 2.5 + penalties.latch; break
      case 'Step onto street': game.phase = 'street'; break
      case 'Check phone': game.phoneRead = true; break
      case 'Look up': game.phase = 'descent'; break
      case 'Hide behind coats': game.hidden = true; game.latch = 0; break
      case 'Grab dining table': game.dragging = true; break
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
  function update(dt, inputX, inputZ) {
    if (game.phase === 'descent') {
      game.cinematicElapsed = Math.min(descentDuration, game.cinematicElapsed + dt)
      if (game.cinematicElapsed >= descentDuration) game.phase = 'complete'
      return
    }
    const length = Math.hypot(inputX, inputZ)
    const normalizer = Math.max(1, length)
    if (game.phase === 'fireEscape') {
      const step = 1.55 * dt / normalizer
      game.player.x = Math.max(-5.12, Math.min(5.12, game.player.x + inputX * step))
      game.player.z = Math.max(-.65, Math.min(.65, game.player.z + inputZ * step))
      return
    }
    if (game.phase !== 'blackout') return
    game.elapsed += dt
    if (!game.hidden && length) {
      const speed = game.dragging ? 1.8 : 3.35
      const x = game.player.x
      const z = game.player.z
      game.latch = 0
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
      const entity = entityTypes[game.encounters]
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
        if (game.encounters >= encounterLimit) {
          game.phase = 'caught'
          return
        }
        game.reappearsAt = game.elapsed + entity.recovery
        Object.assign(game.pursuer, game.barricade ? { x: -4.9, z: -1.45 } : spots.entry)
        waypoint = undefined
      }
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
    return game.elapsed >= entityArrivalAt()
  }

  return Object.assign(game, { action, interact, update, entityArrivalAt, entityInside })
}
