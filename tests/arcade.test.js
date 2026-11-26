import test from 'node:test'
import assert from 'node:assert/strict'
import { createGame, newSetup, pinLocations, spots } from '../src/game.js'
import { loadProgress, saveProgress, recordEscape, scoreRun } from '../src/arcade.js'
import { nightmareBeat } from '../src/nightmare.js'

function awake(game) {
  game.beginWake()
  for (let i = 0; i < 9; i++) game.update(.1, i % 2 ? 1 : -1, 0)
  game.update(.2, 0, 0)
  assert.equal(game.phase, 'blackout')
}

test('all nine setups retain the selected pin and shadow on retry', () => {
  for (let setup = 0; setup < 9; setup++) {
    const options = { mode: 'arcade', setup, skipReveal: true }
    const game = createGame({}, options)
    awake(game)
    assert.equal(game.runTime, 0)
    assert.equal(game.pinSpot, pinLocations[setup % 3])
    assert.equal(game.entityIndex(), Math.floor(setup / 3))
    Object.assign(game.player, game.pinSpot)
    assert.equal(game.action(), `Search ${game.pinSpot.name}`)
    game.interact()
    game.update(1, 0, 0)
    assert.equal(game.hasPin, false)
    game.update(2.01, 0, 0)
    assert.equal(game.hasPin, true)
    assert.equal(game.runTime, 3.01)
    const retry = createGame({}, options)
    awake(retry)
    assert.equal(retry.hasPin, false)
    assert.equal(retry.runTime, 0)
    assert.equal(retry.entityIndex(), game.entityIndex())
    assert.equal(retry.pinSpot, game.pinSpot)
  }
})

test('moving cancels a search; only the chosen location yields a pin', () => {
  const game = createGame({}, { mode: 'arcade', setup: 1 })
  awake(game)
  Object.assign(game.player, spots.drawer)
  assert.notEqual(game.action(), 'Search sideboard')
  Object.assign(game.player, game.pinSpot)
  game.interact()
  game.update(.2, 1, 0)
  assert.equal(game.searchRemaining, 0)
  assert.equal(game.hasPin, false)
})

test('all pin sites and the balcony are reachable through actual movement', () => {
  const travel = (game, x, z) => {
    for (let i = 0; i < 240; i++) {
      if (game.phase === 'breachIntro') game.continueBreach()
      const dx = x - game.player.x
      const dz = z - game.player.z
      if (Math.hypot(dx, dz) < .12) return
      const scale = Math.max(.1675, Math.hypot(dx, dz))
      game.update(.05, dx / scale, dz / scale)
      assert.notEqual(game.phase, 'caught', `setup ${game.setup} caught en route`)
    }
    assert.fail(`setup ${game.setup} blocked near ${game.player.x},${game.player.z}`)
  }
  for (let setup = 0; setup < 9; setup++) {
    const game = createGame({}, { mode: 'arcade', setup, skipReveal: true })
    awake(game)
    if (setup % 3 === 0) { travel(game, 1, .9); travel(game, 1, -2.6) }
    travel(game, game.pinSpot.x, game.pinSpot.z)
    game.interact()
    for (let i = 0; i < 61; i++) game.update(.05, 0, 0)
    assert.equal(game.hasPin, true)
    if (setup % 3 === 1) { travel(game, 1, 1.25); travel(game, 1, -2.6) }
    if (setup % 3 === 2) travel(game, 2.3, -2.6)
    travel(game, 3.7, -2.6)
    travel(game, 3.7, -3.5)
    assert.equal(game.action(), 'Open balcony latch')
    game.interact()
    for (let i = 0; i < 52; i++) game.update(.05, 0, 0)
    assert.equal(game.phase, 'fireEscape')
  }
})

test('first reveal pauses time; a seen shadow enters without a splash', () => {
  for (const skipReveal of [false, true]) {
    const game = createGame({}, { mode: 'arcade', setup: 6, skipReveal })
    awake(game)
    game.update(9.01, 0, 0)
    assert.equal(game.phase, skipReveal ? 'blackout' : 'breachIntro')
    if (!skipReveal) {
      const time = game.runTime
      game.update(30, 0, 0)
      assert.equal(game.runTime, time)
      game.continueBreach()
      assert.equal(game.phase, 'blackout')
    }
  }
})

test('one arcade capture ends the run, story retains three encounters', () => {
  const game = createGame({}, { mode: 'arcade', setup: 3, skipReveal: true })
  awake(game)
  game.elapsed = game.entryAt
  Object.assign(game.pursuer, game.player)
  game.update(.01, 0, 0)
  assert.equal(game.phase, 'caught')
  const story = createGame()
  story.beginWake()
  story.update(2, 0, 0)
  assert.equal(story.phase, 'breachIntro')
  story.continueBreach()
  Object.assign(story.pursuer, story.player)
  story.update(.01, 0, 0)
  assert.equal(story.encounters, 1)
  assert.notEqual(story.phase, 'caught')
})

test('balcony escape finishes arcade without story cinematics; time freezes', () => {
  const game = createGame({}, { mode: 'arcade' })
  awake(game)
  game.hasPin = true
  Object.assign(game.player, spots.balcony)
  game.interact()
  game.update(2.6, 0, 0)
  assert.equal(game.phase, 'fireEscape')
  game.update(6, 1, 0)
  assert.equal(game.action(), 'Step onto street')
  game.interact()
  assert.equal(game.phase, 'complete')
  const time = game.runTime
  game.update(10, 0, 0)
  assert.equal(game.runTime, time)
})

test('new runs differ and all setups can be reached', () => {
  for (let previous = 0; previous < 9; previous++) {
    const picks = Array.from({ length: 8 }, (_, i) => newSetup(previous, () => i / 8))
    assert.equal(new Set(picks).size, 8)
    assert.ok(!picks.includes(previous))
  }
})

test('unlock, setup bests, and discovered shadows survive storage; denied storage is safe', () => {
  let value
  const storage = { getItem: () => value, setItem: (_, data) => { value = data } }
  const progress = loadProgress(storage)
  assert.equal(progress.unlocked, false)
  recordEscape(progress, { arcade: false })
  assert.equal(progress.unlocked, true)
  const game = { arcade: true, setup: 2, runTime: 60, closeEncounters: 2 }
  assert.equal(recordEscape(progress, game), true)
  assert.equal(recordEscape(progress, { ...game, runTime: 80 }), false)
  progress.seen.push(1)
  assert.equal(saveProgress(storage, progress), true)
  assert.deepEqual(loadProgress(storage), progress)
  assert.equal(scoreRun({ ...game, closeEncounters: 999 }), scoreRun({ ...game, closeEncounters: 3 }))
  assert.equal(saveProgress(undefined, progress), false)
  assert.equal(loadProgress(undefined).unlocked, false)
})

test('return nightmare lunges quickly, ends cleanly, and retries outside', () => {
  const game = createGame()
  game.phase = 'fireEscape'
  game.player.x = -5.02
  game.update(.05, -1, 0)
  assert.equal(game.phase, 'returnNightmare')
  assert.ok(nightmareBeat(.6).approach > .35)
  assert.ok(nightmareBeat(1.2).approach > .64)
  assert.equal(nightmareBeat(1.85).approach, 1)
  const alternate = nightmareBeat(.42, 2)
  assert.notEqual(alternate.side, nightmareBeat(.42, 0).side)
  game.update(3.5, 0, 0)
  assert.equal(game.phase, 'returnCaught')
  game.retryFireEscape()
  assert.equal(game.phase, 'fireEscape')
  assert.equal(game.cinematicElapsed, 0)
})

test('reduced motion removes camera movement and lighting/blur pulses', () => {
  const shots = [.2, .7, 1.2, 1.85].map(t => nightmareBeat(t, 3, true))
  for (const shot of shots) {
    assert.equal(shot.shakeX, 0)
    assert.equal(shot.shakeY, 0)
    assert.equal(shot.roll, 0)
    assert.equal(shot.side, 0)
    assert.equal(shot.light, shots[0].light)
    assert.equal(shot.darkness, shots[0].darkness)
    assert.equal(shot.blur, shots[0].blur)
  }
})
