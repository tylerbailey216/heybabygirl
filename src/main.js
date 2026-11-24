import './style.css'
import { createGame } from './game.js'
import { createView } from './view.js'

const panel = document.querySelector('#panel')
const speaker = document.querySelector('#speaker')
const line = document.querySelector('#line')
const advance = document.querySelector('#continue')
const touch = document.querySelector('#touch')
const action = document.querySelector('#action')
const status = document.querySelector('#status')
const hasTouch = matchMedia('(any-pointer: coarse)')
const dialogue = [
  ['Your date', 'I was going to ask if you wanted to stay for dessert.', 'What did you make?'],
  ['Your date', 'You hear that? I thought we were the only ones out here.', 'Look toward the balcony'],
  ['You', 'There’s someone outside. Wait… where did you go?', 'Get up'],
]
const endings = {
  caught: ['Caught', 'Something moved in the dark. Then it was right behind you.', 'Retry blackout'],
  escaped: ['Escaped', 'The latch gives. You step into the rain and take the fire stairs down.', 'Play again'],
}

let game = createGame()
let beat = 0
const held = new Set()
const pointers = new Map()
let view
try {
  view = createView(document.querySelector('#scene'))
} catch (error) {
  console.error(error)
  speaker.textContent = 'Graphics unavailable'
  line.textContent = 'This demo needs WebGL 2. Open it in a browser with hardware acceleration enabled.'
  advance.hidden = true
  document.querySelector('#restart').hidden = true
}

function present() {
  const playing = game.phase === 'blackout'
  panel.hidden = playing
  touch.hidden = !playing || !hasTouch.matches
  if (!playing) {
    const [name, text, button] = endings[game.phase] ?? dialogue[beat]
    speaker.textContent = name
    line.textContent = text
    advance.textContent = button
  }
}

function reset(phase = 'date') {
  game = createGame()
  game.phase = phase
  beat = 0
  held.clear()
  pointers.clear()
  present()
}

function next() {
  if (game.phase === 'caught') return reset('blackout')
  if (game.phase === 'escaped') return reset()
  if (game.phase !== 'date') return
  beat++
  if (beat === dialogue.length) reset('blackout')
  else present()
}

const movement = new Set(['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])
if (view) {
  present()
  advance.addEventListener('click', next)
  document.querySelector('#restart').addEventListener('click', () => reset(game.phase === 'date' ? 'date' : 'blackout'))
  action.addEventListener('click', () => game.interact())
  hasTouch.addEventListener('change', present)
  window.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
    if (movement.has(key)) {
      event.preventDefault()
      held.add(key)
      return
    }
    const nativeButtonClick = event.target instanceof HTMLButtonElement && (key === 'Enter' || key === ' ')
    if (nativeButtonClick || !['e', 'r', 'Enter', ' '].includes(key)) return
    event.preventDefault()
    if (event.repeat) return
    if (key === 'r') reset(game.phase === 'date' ? 'date' : 'blackout')
    else if (game.phase === 'blackout') game.interact()
    else next()
  })
  window.addEventListener('keyup', event => held.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key))
  window.addEventListener('blur', () => {
    held.clear()
    pointers.clear()
  })
  for (const button of document.querySelectorAll('[data-move]')) {
    button.addEventListener('pointerdown', event => {
      event.preventDefault()
      button.setPointerCapture(event.pointerId)
      pointers.set(event.pointerId, button.dataset.move)
    })
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      button.addEventListener(type, event => pointers.delete(event.pointerId))
    }
  }

  const pressed = (...keys) => keys.some(key => held.has(key) || [...pointers.values()].includes(key))
  let previousTime = performance.now()
  function frame(now) {
    const dt = Math.min((now - previousTime) / 1000, .05)
    previousTime = now
    const phase = game.phase
    game.update(dt,
      Number(pressed('d', 'ArrowRight')) - Number(pressed('a', 'ArrowLeft')),
      Number(pressed('s', 'ArrowDown')) - Number(pressed('w', 'ArrowUp')))
    if (phase !== game.phase) {
      present()
      advance.focus()
    }

    const playing = game.phase === 'blackout'
    const prompt = game.action()
    const seconds = Math.max(0, Math.ceil(game.entryAt - game.elapsed))
    const timing = seconds > 0 ? `Entry in ${seconds}s` : 'It’s inside'
    let hint = prompt || 'Get to the balcony latch'
    if (game.latch > 0) hint = 'Opening the latch… Hold still'
    else if (game.dragging) hint = 'Drag the table toward the entry'
    else if (game.hidden) hint = 'Hidden · Interact to leave the coats'
    else if (game.barricade && seconds > 0 && !prompt) hint = 'Entry blocked · Get to the balcony latch'
    const message = playing ? `${timing} · ${hint}` : ''
    if (message !== status.textContent) status.textContent = message
    action.textContent = prompt || 'Interact'
    action.disabled = !prompt
    view.render(game, now / 1000)
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}
