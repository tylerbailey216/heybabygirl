import './style.css'
import { createGame, descentDuration, descentFadeAt, encounterLimit, entityTypes, phoneRushDuration, returnDuration, returnFadeAt, returnReachAt, sipDuration, streetLightFade, streetWakeSeconds, wakeGoal } from './game.js'
import { dateDialogue, streetDialogue } from './dialogue.js'
import { newSetup } from './game.js'
import { loadProgress, saveProgress, recordEscape, scoreRun, formatTime } from './arcade.js'
import { createView } from './view.js'
import { bindThumbstick } from './thumbstick.js'
import { enableEntityAudio, playEntitySound, setAudioMuted, updateSceneAudio } from './entity-audio.js'
import heroinePortrait from './assets/heroine-portrait.webp'
import datePortrait from './assets/date-portrait.webp'
import tallPortrait from './assets/shadow-tall.webp'
import heavyPortrait from './assets/shadow-heavy.webp'
import wiryPortrait from './assets/shadow-wiry.webp'
import streetArt from './assets/ending-phone.webp'
import splashArt from './assets/ending-splash.webp'
import breachArt from './assets/breach-intro.webp'

const gameScreen = document.querySelector('#game')
const breachSplash = document.querySelector('#breach-splash')
const breachImage = document.querySelector('#breach-art')
const breachContinue = document.querySelector('#breach-continue')
const streetEnding = document.querySelector('#street-ending')
const streetImage = document.querySelector('#street-art')
const phoneMessage = document.querySelector('#phone-message')
const phoneAction = document.querySelector('#phone-action')
const streetSpeaker = document.querySelector('#street-title')
const streetSpeakerCard = document.querySelector('#street-speaker-card')
const streetChoices = document.querySelector('#street-choices')
const streetButtons = [...streetChoices.querySelectorAll('button')]
const endingSplash = document.querySelector('#ending-splash')
const endingImage = document.querySelector('#ending-art')
const endingRestart = document.querySelector('#ending-restart')
const cinematicFade = document.querySelector('#cinematic-fade')
const restartButton = document.querySelector('#restart')
const soundToggle = document.querySelector('#sound-toggle')
const startPanel = document.querySelector('#start-demo')
const startButton = document.querySelector('#begin')
const arcadeStart = document.querySelector('#arcade-start')
const newRun = document.querySelector('#new-run')
const storyReturn = document.querySelector('#story-return')
const runResult = document.querySelector('#run-result')
const arcadeHud = document.querySelector('#arcade-hud')
const runClock = document.querySelector('#run-clock')
const runClue = document.querySelector('#run-clue')
let storage
try { storage = window.localStorage } catch {}
const progress = loadProgress(storage)
let savedLocally = true
let recordedGame
let isNewBest = false
const wakePanel = document.querySelector('#wake-panel')
const wakeInstructions = document.querySelector('#wake-instructions')
const wakeTimer = document.querySelector('#wake-timer')
const wakeMeter = document.querySelector('#wake-meter')
wakeMeter.max = wakeGoal
const dialogueLayer = document.querySelector('#dialogue')
const portrait = document.querySelector('#portrait')
const darkness = document.querySelector('#darkness')
const entityCue = document.querySelector('#entity-cue')
const entityPortrait = document.querySelector('#entity-portrait')
const entityPortraits = [tallPortrait, heavyPortrait, wiryPortrait]
let shownEntity = -1
let voiceEndsAt = 0
let wasInside = false
const entityEntranceBeat = .9
const speaker = document.querySelector('#speaker')
const line = document.querySelector('#line')
const advance = document.querySelector('#continue')
const speakerCard = document.querySelector('#speaker-card')
const dateChoices = document.querySelector('#date-choices')
const dateButtons = [...dateChoices.querySelectorAll('button')]
const touch = document.querySelector('#touch')
const itemButtons = [
  { element: document.querySelector('#table-action'), labels: new Map([['Grab dining table', 'Grab table'], ['Let go of table', 'Release table']]), idle: 'Table' },
  { element: document.querySelector('#coats-action'), labels: new Map([['Hide behind coats', 'Hide'], ['Leave hiding spot', 'Leave coats']]), idle: 'Hide' },
  { element: document.querySelector('#inspect-action'), labels: new Map([['Search sideboard', 'Search'], ['Search bookshelf', 'Search'], ['Search sofa', 'Search'], ['Check deadbolt', 'Deadbolt'], ['Step onto street', 'Step down']]), idle: 'Inspect', outside: true },
  { element: document.querySelector('#latch-action'), labels: new Map([['Inspect jammed latch', 'Check latch'], ['Open balcony latch', 'Open latch']]), idle: 'Latch' },
]
const stick = bindThumbstick(document.querySelector('#thumbstick'))
const status = document.querySelector('#status')
const statusLine = document.querySelector('#status-line')
const hasTouch = matchMedia('(any-pointer: coarse)')
const portraits = { date: datePortrait, heroine: heroinePortrait }
const appliedSetbacks = new Set()
let started = false
let muted = false
let game = createGame()
let beat = 0
let dateSetback
let streetSetback
const held = new Set()
let view
try {
  view = createView(document.querySelector('#scene'))
} catch (error) {
  console.error(error)
  speaker.textContent = 'Graphics unavailable'
  line.textContent = 'This demo needs WebGL 2. Open it in a browser with hardware acceleration enabled.'
  dateChoices.hidden = true
  advance.hidden = true
  restartButton.hidden = true
}

function present() {
  const { phase } = game
  const waking = phase === 'waking' || phase === 'streetDazed'
  const playing = waking || phase === 'blackout' || phase === 'fireEscape' || phase === 'phoneDark' || phase === 'streetRun'
  const speaking = (!game.arcade && phase === 'caught') || phase === 'date' || phase === 'phoneCaught' || phase === 'streetSafe' || phase === 'returnCaught'
  const results = phase === 'complete' || (game.arcade && phase === 'caught')
  if (phase === 'breachIntro' && !progress.seen.includes(game.entityIndex())) {
    progress.seen.push(game.entityIndex())
    savedLocally = saveProgress(storage, progress)
  }
  if (phase === 'complete' && recordedGame !== game) {
    recordedGame = game
    isNewBest = recordEscape(progress, game)
    savedLocally = saveProgress(storage, progress)
  }
  arcadeStart.disabled = !progress.unlocked
  arcadeStart.textContent = progress.unlocked ? 'After Midnight' : 'After Midnight · Locked'
  document.querySelector('#unlock-note').textContent = progress.unlocked ? 'New setup. Same nightmare. Beat your best.' : 'Escape Story mode to unlock After Midnight.'
  arcadeHud.hidden = !game.arcade || !playing || waking || !started
  runClue.textContent = `${game.currentEntity().name} · ${['Keep your distance.', 'Slower, but a longer reach.', 'Fast. Consider the barricade.'][game.entityIndex()]} ${game.pinSpot.clue}`
  gameScreen.dataset.phase = phase
  startPanel.hidden = started
  restartButton.hidden = !started
  soundToggle.hidden = !started
  dialogueLayer.hidden = !speaking
  breachSplash.hidden = phase !== 'breachIntro'
  if (phase === 'breachIntro') {
    breachImage.src = game.entityIndex() === 0 ? breachArt : entityPortraits[game.entityIndex()]
    breachImage.alt = `${game.currentEntity().name} appears at the apartment door`
    document.querySelector('#breach-title').textContent = `${game.currentEntity().name}. It's inside.`
  }
  streetEnding.hidden = phase !== 'street'
  endingSplash.hidden = !results
  endingSplash.classList.toggle('arcade-results', game.arcade)
  endingImage.src = game.arcade && phase === 'caught' ? (game.entityIndex() === 0 ? breachArt : entityPortraits[game.entityIndex()]) : splashArt
  endingImage.alt = game.arcade && phase === 'caught' ? `${game.currentEntity().name} caught the heroine` : 'The heroine in the rain after leaving the apartment'
  runResult.hidden = !results || !game.arcade
  newRun.hidden = !results || !progress.unlocked
  newRun.textContent = game.arcade ? 'New run' : 'Play After Midnight'
  storyReturn.hidden = !results || !game.arcade
  endingRestart.textContent = game.arcade ? 'Retry this setup' : 'Play Story again'
  document.querySelector('.ending-chapter').textContent = game.arcade ? `After Midnight · Setup ${game.setup + 1}` : 'End of Chapter One'
  document.querySelector('#ending-title').textContent = game.arcade && phase === 'caught' ? 'Caught after midnight' : 'Hey Baby Girl'
  document.querySelector('.ending-subtitle').textContent = game.arcade ? (phase === 'caught' ? game.lossReason || `${game.currentEntity().name} caught you. Try the barricade or break away into hiding.` : 'You made it out.') : 'Blackout Date'
  if (results && game.arcade) {
    const best = progress.bests[game.setup]
    runResult.textContent = phase === 'caught' ? `Run ended at ${formatTime(game.runTime)}. Retry keeps the pin and shadow the same.`
      : `${formatTime(game.runTime)} · ${game.closeEncounters} close escapes · ${scoreRun(game)} points. ${isNewBest ? 'NEW PERSONAL BEST! ' : ''}Best for this setup: ${best.score} pts · fastest ${formatTime(best.time)}.`
    if (!savedLocally) runResult.textContent += ' Phone storage unavailable; records last for this session.'
  }
  touch.hidden = !playing || !hasTouch.matches
  if (touch.hidden) stick.reset()
  wakePanel.hidden = !waking
  wakeTimer.hidden = phase !== 'streetDazed'
  if (waking) {
    wakeInstructions.textContent = hasTouch.matches ? 'Shake the stick left and right' : 'Alternate A and D or the left and right arrows'
    wakeMeter.value = game.wakeProgress
  }
  if (speaking) {
    let prompt = dateSetback
      ? { character: 'heroine', speaker: 'You · Thinking', text: dateSetback }
      : dateDialogue[beat]
    if (phase === 'caught') {
      prompt = { character: 'heroine', speaker: 'You · Caught', text: 'It came back. This time, the light didn’t.' }
    } else if (phase === 'phoneCaught') {
      prompt = { character: 'heroine', speaker: 'You · Caught', text: game.streetChaseFailed ? 'It caught me before I reached the light.' : 'The phone went dark. Something crossed the street before my eyes adjusted.' }
    }
    if (phase === 'returnCaught') {
      prompt = { character: 'heroine', speaker: 'You · Caught', text: 'I went back inside. Something was already waiting for me.' }
    }
    if (phase === 'streetSafe') {
      prompt = { character: 'heroine', speaker: 'You · Thinking', text: 'It stopped where the streetlights began. I kept walking.' }
    }
    const image = portraits[prompt.character]
    portrait.hidden = Boolean(prompt.offscreen)
    if (!portrait.hidden) portrait.src = image
    showSpeakerCard(speakerCard, prompt.offscreen ? image : undefined)
    speaker.textContent = prompt.speaker
    line.textContent = prompt.text
    showChoices(dateChoices, dateButtons, prompt.options)
    advance.hidden = Boolean(prompt.options)
    advance.textContent = phase === 'returnCaught' ? 'Retry the fire escape' : phase === 'streetSafe' ? 'End chapter' : phase === 'phoneCaught' ? 'Retry the street' : phase === 'caught' ? 'Retry nightmare' : 'Try another answer'
  }
  if (phase === 'street') {
    const prompt = streetSetback
      ? { character: 'heroine', speaker: 'You · Caught', text: streetSetback }
      : streetDialogue[Number(game.heardVoice)]
    streetEnding.classList.toggle('street-failed', Boolean(streetSetback))
    streetSpeaker.textContent = prompt.speaker
    showSpeakerCard(streetSpeakerCard, portraits[prompt.character])
    phoneMessage.textContent = prompt.text
    showChoices(streetChoices, streetButtons, prompt.options)
    phoneAction.hidden = !streetSetback
  }
}

function showSpeakerCard(card, image) {
  card.hidden = !image
  if (image) card.src = image
}

function showChoices(group, buttons, options) {
  group.hidden = !options
  options?.forEach(({ label }, index) => {
    buttons[index].textContent = label
  })
}

function reset(retryNightmare = false) {
  if (game.arcade) return startArcade(game.setup)
  if (retryNightmare) enableEntityAudio()
  game = createGame(retryNightmare ? game.penalties : undefined)
  if (retryNightmare) game.beginWake()
  else appliedSetbacks.clear()
  beat = 0
  dateSetback = undefined
  streetSetback = undefined
  shownEntity = -1
  voiceEndsAt = 0
  wasInside = false
  entityCue.hidden = true
  held.clear()
  stick.reset()
  present()
}

function startArcade(setup = newSetup(game.arcade ? game.setup : -1)) {
  if (!progress.unlocked) return
  enableEntityAudio()
  started = true
  game = createGame({}, { mode: 'arcade', setup, skipReveal: progress.seen.includes(Math.floor(setup / 3)) })
  game.beginWake()
  recordedGame = undefined
  shownEntity = -1
  voiceEndsAt = 0
  wasInside = false
  held.clear()
  stick.reset()
  present()
}

function choose(index) {
  if (game.phase === 'date' && !dateSetback) {
    const option = dateDialogue[beat].options[index]
    if (option.music) game.musicDucked = option.music === 'quiet'
    if (option.setback) {
      dateSetback = option.setback.text
      if (!appliedSetbacks.has(beat)) {
        game.penalties[option.setback.key] += option.setback.value
        appliedSetbacks.add(beat)
      }
      present()
      advance.focus()
    } else if (++beat === dateDialogue.length) {
      enableEntityAudio()
      game.beginSip()
      navigator.vibrate?.([55, 130, 85])
      present()
    } else {
      present()
      dateButtons[0].focus()
    }
  } else if (game.phase === 'street' && !streetSetback) {
    const option = streetDialogue[Number(game.heardVoice)].options[index]
    if (option.trap) game.beginPhoneTrap()
    else if (option.setback) streetSetback = option.setback
    else game.interact()
    present()
    if (streetSetback) phoneAction.focus()
    else if (game.phase === 'street') streetButtons[0].focus()
  }
}

function next() {
  if (game.arcade && (game.phase === 'caught' || game.phase === 'complete')) return startArcade(game.setup)
  if (game.phase === 'breachIntro') {
    held.clear()
    stick.reset()
    game.continueBreach()
    present()
    return
  }
  if (game.phase === 'returnCaught') {
    game.retryFireEscape()
    held.clear()
    stick.reset()
    present()
    return
  }
  if (game.phase === 'caught') return reset(true)
  if (game.phase === 'phoneCaught' || (game.phase === 'street' && streetSetback)) {
    streetSetback = undefined
    game.retryStreet()
    held.clear()
    stick.reset()
    present()
    return
  }
  if (game.phase === 'streetSafe') {
    game.interact()
    present()
    return
  }
  if (game.phase === 'complete') return reset()
  if (game.phase === 'date' && dateSetback) {
    dateSetback = undefined
    present()
    dateButtons[0].focus()
  }
}

function startDemo() {
  if (started) return
  enableEntityAudio()
  started = true
  present()
}

function toggleSound() {
  muted = !muted
  if (!muted) enableEntityAudio()
  setAudioMuted(muted)
  soundToggle.textContent = muted ? 'Unmute' : 'Mute'
  soundToggle.setAttribute('aria-pressed', String(muted))
  soundToggle.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound')
}

const movement = new Set(['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])
if (view) {
  breachImage.src = breachArt
  streetImage.src = streetArt
  endingImage.src = splashArt
  present()
  startButton.addEventListener('click', startDemo)
  arcadeStart.addEventListener('click', () => startArcade())
  newRun.addEventListener('click', () => startArcade())
  storyReturn.addEventListener('click', () => {
    game = createGame()
    reset()
    enableEntityAudio()
  })
  soundToggle.addEventListener('click', toggleSound)
  advance.addEventListener('click', next)
  breachContinue.addEventListener('click', next)
  for (const buttons of [dateButtons, streetButtons]) {
    buttons.forEach((button, index) => button.addEventListener('click', () => choose(index)))
  }
  phoneAction.addEventListener('click', next)
  endingRestart.addEventListener('click', () => reset())
  const restart = () => {
    if (game.phase === 'returnNightmare' || game.phase === 'breachIntro') return
    if (game.phase === 'returnCaught') next()
    else reset(['waking', 'blackout', 'caught', 'fireEscape'].includes(game.phase))
  }
  restartButton.addEventListener('click', restart)
  for (const { element, labels } of itemButtons) {
    element.addEventListener('click', () => {
      if (labels.has(game.action()) && game.latch <= 0) game.interact()
    })
  }
  hasTouch.addEventListener('change', present)
  window.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
    if (!started) {
      if (key === 'Enter' || key === 'e' || key === ' ') {
        event.preventDefault()
        if (!event.repeat) startDemo()
      }
      return
    }
    if (key === 'm') {
      if (!event.repeat) toggleSound()
      return
    }
    if (game.phase === 'returnNightmare') {
      if (movement.has(key) || ['e', 'r', 'Enter', ' '].includes(key)) event.preventDefault()
      return
    }
    if (movement.has(key)) {
      event.preventDefault()
      held.add(key)
      return
    }
    if (key === '1' || key === '2') {
      if (!event.repeat) choose(Number(key) - 1)
      return
    }
    const nativeButtonClick = event.target instanceof HTMLButtonElement && (key === 'Enter' || key === ' ')
    if (nativeButtonClick || !['e', 'r', 'Enter', ' '].includes(key)) return
    event.preventDefault()
    if (event.repeat) return
    if (key === 'r') restart()
    else if (game.phase === 'blackout' || game.phase === 'fireEscape') game.interact()
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
  let displayedPhase = game.phase
  function frame(now) {
    const dt = Math.min((now - previousTime) / 1000, .05)
    previousTime = now
    const keyboardX = Number(pressed('d', 'ArrowRight')) - Number(pressed('a', 'ArrowLeft'))
    const keyboardZ = Number(pressed('s', 'ArrowDown')) - Number(pressed('w', 'ArrowUp'))
    const usingKeyboard = keyboardX !== 0 || keyboardZ !== 0
    if (started && !document.hidden) {
      game.update(dt, usingKeyboard ? keyboardX : stick.x, usingKeyboard ? keyboardZ : stick.z)
      updateSceneAudio(game)
    }
    if (displayedPhase !== game.phase) {
      displayedPhase = game.phase
      present()
      if (!dialogueLayer.hidden) (advance.hidden ? dateButtons[0] : advance).focus()
      else if (game.phase === 'breachIntro') {
        breachContinue.focus()
        shownEntity = game.entityIndex()
        playEntitySound('Door')
        playEntitySound(entityTypes[shownEntity].voice, .42)
      } else if (game.phase === 'street') streetButtons[0].focus()
      else if (game.phase === 'complete' || (game.arcade && game.phase === 'caught')) endingRestart.focus()
      if (game.phase === 'phoneRush' || game.phase === 'streetRun') playEntitySound('Hiss')
      if (game.phase === 'returnNightmare') playEntitySound('Growl')
      if (game.phase === 'streetRun' || game.phase === 'returnNightmare' || game.phase === 'breachIntro') {
        held.clear()
        stick.reset()
      }
    }

    const playing = game.phase === 'blackout'
    const waking = game.phase === 'waking'
    const streetDazed = game.phase === 'streetDazed'
    const streetRun = game.phase === 'streetRun'
    if ((waking || streetDazed) && wakeMeter.value !== game.wakeProgress) wakeMeter.value = game.wakeProgress
    if (streetDazed) {
      const seconds = Math.ceil(streetWakeSeconds - Math.max(0, game.phoneElapsed - streetLightFade))
      const text = game.phoneElapsed < streetLightFade ? 'Phone light fading…' : `${seconds}s to wake up`
      if (wakeTimer.textContent !== text) wakeTimer.textContent = text
    }
    const outside = game.phase === 'fireEscape'
    const phoneDark = game.phase === 'phoneDark'
    const phoneRush = game.phase === 'phoneRush'
    const prompt = game.action()
    const arrivalAt = game.entityArrivalAt()
    const entityInside = (playing || waking) && game.entityInside()
    if (entityInside && !wasInside && (game.arcade || game.encounters > 0)) playEntitySound('Door')
    wasInside = entityInside
    if (playing && entityInside && game.elapsed >= arrivalAt + entityEntranceBeat && shownEntity !== game.entityIndex()) {
      shownEntity = game.entityIndex()
      entityPortrait.src = entityPortraits[shownEntity]
      playEntitySound(entityTypes[shownEntity].voice)
      voiceEndsAt = game.elapsed + 1.8
    }
    const activeCue = playing && entityInside && game.elapsed < voiceEndsAt
    entityCue.hidden = !activeCue
    const awakeScene = ['party', 'date', 'sip'].includes(game.phase)
    const opacity = awakeScene || phoneDark || phoneRush || streetDazed || streetRun || game.phase === 'streetSafe' ? 0
      : outside || game.phase === 'descent' ? .16 : Math.min(1, [.32, .55, .76, 1][game.encounters] + game.penalties.darkness)
    if (game.phase === 'returnNightmare' && game.cinematicElapsed >= returnReachAt
      && game.cinematicElapsed - dt < returnReachAt) playEntitySound('Growl')
    let fade = game.phase === 'descent'
      ? Math.max(0, Math.min(1, (game.cinematicElapsed - descentFadeAt) / (descentDuration - descentFadeAt - .4)))
      : phoneRush ? Math.max(0, (game.phoneElapsed - phoneRushDuration + .22) / .22)
        : Number(game.phase === 'complete')
    if (game.phase === 'returnNightmare') {
      fade = Math.max(0, Math.min(1, (game.cinematicElapsed - returnFadeAt) / (returnDuration - returnFadeAt - .3)))
    } else if (game.phase === 'sip') {
      const t = game.introElapsed
      const pulse = Math.sin(Math.PI * (t - .65) / 1.14) ** 2
      fade = t < .65 ? 0 : t < 2.93 ? pulse * .86 : Math.min(1, (t - 2.93) / (sipDuration - 3.28))
    } else if (waking) {
      fade = Math.max(0, 1 - game.elapsed / .75)
    }
    cinematicFade.style.opacity = fade
    if (previousDarkness !== opacity) {
      darkness.style.opacity = opacity
      darkness.classList.toggle('blackout-complete', game.encounters >= encounterLimit)
      previousDarkness = opacity
    }
    const secondsToArrival = Math.ceil(arrivalAt - game.elapsed)
    let timing = 'The power is out'
    if (activeCue) {
      const entity = entityTypes[shownEntity]
      timing = `${entity.name} [${entity.voice}]`
    } else if (entityInside) timing = 'It’s inside'
    else if (Number.isFinite(secondsToArrival)) {
      timing = `${game.encounters ? 'Returns' : 'Door bursts open'} in ${secondsToArrival}s`
    }
    let hint = game.hasPin ? 'Release pin found · Head to the balcony' : game.arcade ? game.pinSpot.clue : 'Check the balcony latch or search the sideboard'
    if (prompt) hint = prompt
    if (game.examinedLatch && !game.hasPin && (!prompt || prompt === 'Inspect jammed latch')) {
      hint = game.arcade ? `Latch jammed · ${game.pinSpot.clue}` : 'Latch jammed · Find the release pin in the sideboard'
    }
    if (game.searchRemaining > 0) hint = `Searching… Hold still ${Math.ceil(game.searchRemaining)}s`
    else if (game.latch > 0) hint = 'Opening the latch… Hold still'
    else if (game.dragging) hint = 'Drag the table toward the entry'
    else if (game.hidden) hint = 'Hidden · Interact to leave the coats'
    else if (game.barricade && game.elapsed < game.entryAt && !prompt) hint = game.hasPin ? 'Entry blocked · Head to the balcony' : 'Entry blocked · Find the release pin'
    const encounters = game.encounters ? ` · Encounters ${game.encounters}/${encounterLimit}` : ''
    const message = streetRun ? 'Run right · Reach the lit intersection' : outside ? (prompt ? 'Street level · Step down' : 'Fire escape · Follow the stairs to the right')
      : playing ? `${timing} · ${hint}${encounters}` : ''
    if (message !== statusLine.textContent) statusLine.textContent = message
    if (game.arcade) runClock.textContent = formatTime(game.runTime)
    status.hidden = !message
    for (const { element, labels, idle, outside: outdoorButton } of itemButtons) {
      element.hidden = waking || streetDazed || streetRun || phoneDark || (outside && !outdoorButton)
      const label = labels.get(prompt) ?? (outside ? 'Street' : idle)
      if (element.textContent !== label) element.textContent = label
      element.disabled = !labels.has(prompt) || game.latch > 0
    }
    view.render(game, now / 1000, game.phase === 'date' && Boolean(dateDialogue[beat]?.offscreen))
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}
