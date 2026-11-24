export const spots = {
  entry: { x: -5.2, z: -2.4 },
  coats: { x: -4.5, z: 0.1 },
  balcony: { x: 3.7, z: -3.5 },
}
const start = { x: 0, z: 0.9 }
const tableStart = { x: -1.4, z: -1.35 }
const furniture = [
  { x: 2.3, z: 2.9, w: 4, d: 1.2 },
  { x: -4.7, z: 2.45, w: 1.1, d: 1.45 },
  { x: -2.45, z: -3.65, w: 2.05, d: 0.75 },
]
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)

export function createGame() {
  const game = {
    phase: 'date', player: { ...start }, table: { ...tableStart },
    pursuer: { ...spots.entry }, elapsed: 0, entryAt: 9,
    hidden: false, dragging: false, barricade: false, latch: 0,
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
    if (game.phase !== 'blackout') return ''
    if (game.hidden) return 'Leave hiding spot'
    if (game.dragging) return 'Let go of table'
    if (distance(game.player, spots.balcony) < 1.08) return 'Open balcony latch'
    if (distance(game.player, spots.coats) < 0.9) return 'Hide behind coats'
    if (!game.barricade && game.elapsed < game.entryAt && distance(game.player, game.table) < 1.85) return 'Grab dining table'
    return ''
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
      case 'Open balcony latch': game.latch ||= 1.3; break
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
    if (game.phase !== 'blackout') return
    game.elapsed += dt
    const length = Math.hypot(inputX, inputZ)
    if (!game.hidden && length) {
      const speed = game.dragging ? 1.8 : 3.35
      const x = game.player.x
      const z = game.player.z
      game.latch = 0
      move(game.player, inputX / length * speed * dt, inputZ / length * speed * dt)
      if (game.dragging) {
        game.table.x += game.player.x - x
        game.table.z += game.player.z - z
        if (distance(game.player, spots.entry) < 1.1 && game.elapsed < game.entryAt) {
          game.barricade = true
          game.dragging = false
          game.entryAt += 7
          Object.assign(game.table, { x: -4.58, z: -2.5 })
          Object.assign(game.player, { x: -3.05, z: -2.48 })
          Object.assign(game.pursuer, { x: -4.9, z: -1.45 })
        }
      }
    }
    if (game.elapsed >= game.entryAt) {
      const patrol = game.elapsed % 10 < 5 ? { x: 0, z: 1.4 } : { x: 2.85, z: -2.1 }
      const target = game.hidden ? patrol : game.player
      repath -= dt
      if (repath <= 0 || !waypoint || distance(game.pursuer, waypoint) < 0.12) {
        waypoint = nextWaypoint(target)
        repath = 0.16
      }
      const range = distance(game.pursuer, waypoint)
      if (range > 0.01) {
        const amount = Math.min(range, dt * 2.45) / range
        move(game.pursuer, (waypoint.x - game.pursuer.x) * amount, (waypoint.z - game.pursuer.z) * amount)
      }
      if (!game.hidden && distance(game.player, game.pursuer) < 0.67) {
        game.phase = 'caught'
        return
      }
    }
    if (game.latch > 0) {
      game.latch -= dt
      if (game.latch <= 0) game.phase = 'escaped'
    }
  }

  return Object.assign(game, { action, interact, update })
}
