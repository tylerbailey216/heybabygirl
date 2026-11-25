import './style.css'
import { createGame, encounterLimit, entityTypes } from './game.js'
import { createView } from './view.js'
import { bindThumbstick } from './thumbstick.js'
import { enableEntityAudio, playEntitySound } from './entity-audio.js'
import heroinePortrait from './assets/heroine-portrait.webp'
import datePortrait from './assets/date-portrait.webp'
import tallPortrait from './assets/shadow-tall.webp'
import heavyPortrait from './assets/shadow-heavy.webp'
import wiryPortrait from './assets/shadow-wiry.webp'

const dialogueLayer = document.querySelector('#dialogue')
const portrait = document.querySelector('#portrait')
const darkness = document.querySelector('#darkness')
const entityDialogue = document.querySelector('#entity-dialogue')
const entityPortrait = document.querySelector('#entity-portrait')
const entityVoice = document.querySelector('#entity-voice')
const entitySpeaker = document.querySelector('#entity-speaker')
const entityPortraits = [tallPortrait, heavyPortrait, wiryPortrait]
let shownEntity = -1
let voiceEndsAt = 0
let wasInside = false
const entityEntranceBeat = .9
const speaker = document.querySelector('#speaker')
const line = document.querySelector('#line')
const advance = document.querySelector('#continue')
const touch = document.querySelector('#touch')
const itemButtons = [
  { element: document.querySelector('#table-action'), labels: new Map([['Grab dining table', 'Grab table'], ['Let go of table', 'Release table']]), idle: 'Table' },
  { element: document.querySelector('#coats-action'), labels: new Map([['Hide behind coats', 'Hide'], ['Leave hiding spot', 'Leave coats']]), idle: 'Hide' },
  { element: document.querySelector('#latch-action'), labels: new Map([['Open balcony latch', 'Open latch']]), idle: 'Latch' },
]
const stick = bindThumbstick(document.querySelector('#thumbstick'))
const status = document.querySelector('#status')
const hasTouch = matchMedia('(any-pointer: coarse)')
const dialogue = [
  [datePortrait, 'Your date', 'I was going to ask if you wanted to stay for dessert.', 'What did you make?'],
  [datePortrait, 'Your date', 'You hear that? I thought we were the only ones out here.', 'Listen'],
  [heroinePortrait, 'You · Thinking', 'That came from the front door. Wait… where did you go?', 'Get up'],
]
const endings = {
  caught: [heroinePortrait, 'You · Caught', 'It came back. This time, the light didn’t.', 'Retry blackout'],
  escaped: [heroinePortrait, 'You · Escaped', 'The latch gave. I’m taking the fire stairs down.', 'Play again'],
}

let game = createGame()
let beat = 0
const held = new Set()
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
  dialogueLayer.hidden = playing
  touch.hidden = !playing || !hasTouch.matches
  if (touch.hidden) stick.reset()
  if (!playing) {
    const [image, name, text, button] = endings[game.phase] ?? dialogue[beat]
    portrait.src = image
    portrait.hidden = false
    speaker.textContent = name
    line.textContent = text
    advance.textContent = button
  }
}

function reset(phase = 'date') {
  if (phase === 'blackout') enableEntityAudio()
  game = createGame()
  game.phase = phase
  beat = 0
  shownEntity = -1
  voiceEndsAt = 0
  wasInside = false
  entityDialogue.hidden = true
  entityVoice.textContent = ''
  held.clear()
  stick.reset()
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
  for (const { element, labels } of itemButtons) {
    element.addEventListener('click', () => {
      if (labels.has(game.action()) && game.latch <= 0) game.interact()
    })
  }
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
    stick.reset()
  })
  const pressed = (...keys) => keys.some(key => held.has(key))
  let previousTime = performance.now()
  let previousDarkness
  function frame(now) {
    const dt = Math.min((now - previousTime) / 1000, .05)
    previousTime = now
    const phase = game.phase
    const keyboardX = Number(pressed('d', 'ArrowRight')) - Number(pressed('a', 'ArrowLeft'))
    const keyboardZ = Number(pressed('s', 'ArrowDown')) - Number(pressed('w', 'ArrowUp'))
    const usingKeyboard = keyboardX !== 0 || keyboardZ !== 0
    game.update(dt, usingKeyboard ? keyboardX : stick.x, usingKeyboard ? keyboardZ : stick.z)
    if (phase !== game.phase) {
      present()
      advance.focus()
    }

    const playing = game.phase === 'blackout'
    const prompt = game.action()
    const arrivalAt = game.entityArrivalAt()
    const entityInside = playing && game.entityInside()
    if (entityInside && !wasInside) playEntitySound('Door')
    wasInside = entityInside
    if (entityInside && game.elapsed >= arrivalAt + entityEntranceBeat && shownEntity !== game.encounters) {
      shownEntity = game.encounters
      entityPortrait.src = entityPortraits[shownEntity]
      entitySpeaker.textContent = entityTypes[shownEntity].name
      entityDialogue.hidden = false
      const voice = entityTypes[shownEntity].voice
      entityVoice.textContent = `[${voice}]`
      playEntitySound(voice)
      voiceEndsAt = game.elapsed + 2.7
    }
    const showEntityDialogue = entityInside && game.elapsed < voiceEndsAt
    if (!showEntityDialogue && !entityDialogue.hidden) {
      entityDialogue.hidden = true
      entityVoice.textContent = ''
    }
    const opacity = game.phase === 'date' ? 0 : [.32, .55, .76, 1][game.encounters]
    if (previousDarkness !== opacity) {
      darkness.style.opacity = opacity
      darkness.classList.toggle('blackout-complete', game.encounters >= encounterLimit)
      previousDarkness = opacity
    }
    const secondsToArrival = Math.ceil(arrivalAt - game.elapsed)
    let timing = 'Move to investigate'
    if (entityInside) timing = 'It’s inside'
    else if (Number.isFinite(secondsToArrival)) {
      timing = `${game.encounters ? 'Returns' : 'Door bursts open'} in ${secondsToArrival}s`
    }
    let hint = prompt || 'Get to the balcony latch'
    if (game.latch > 0) hint = 'Opening the latch… Hold still'
    else if (game.dragging) hint = 'Drag the table toward the entry'
    else if (game.hidden) hint = 'Hidden · Interact to leave the coats'
    else if (game.barricade && game.elapsed < game.entryAt && !prompt) hint = 'Entry blocked · Get to the balcony latch'
    const encounters = game.encounters ? ` · Encounters ${game.encounters}/${encounterLimit}` : ''
    const message = playing ? `${timing} · ${hint}${encounters}` : ''
    if (message !== status.textContent) status.textContent = message
    for (const { element, labels, idle } of itemButtons) {
      const label = labels.get(prompt) ?? idle
      if (element.textContent !== label) element.textContent = label
      element.disabled = !labels.has(prompt) || game.latch > 0
    }
    view.render(game, now / 1000)
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}
