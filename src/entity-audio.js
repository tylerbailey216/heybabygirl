import { guestDepartureTimes } from './game.js'

let context
let master
let music
let musicFilter
let crowd
let rain
let muted = false
let nextBeat = 0
let beat = 0
let lastPhase
let lastGame
let lastRoomSound = -1
let lastRaining
let previousStep
let distanceSinceStep = 0

const rainyPhases = new Set(['fireEscape', 'street', 'streetDazed', 'streetRun', 'streetSafe', 'phoneDark', 'phoneRush', 'descent'])
const beatInterval = .29
const bassNotes = [46, 46, 53, 46, 43, 43, 50, 43]
const chordNotes = [[62, 65, 69], [58, 62, 65], [60, 64, 67], [57, 60, 64]]

function makeNoise(seconds, pattern = () => 1, voice = () => 0) {
  const length = Math.ceil(context.sampleRate * seconds)
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const samples = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    const t = i / context.sampleRate
    const edge = Math.min(1, t / .025, (seconds - t) / .025)
    samples[i] = ((Math.random() * 2 - 1) * pattern(t) + voice(t)) * edge
  }
  return buffer
}

function bed(buffer, type, frequency, resonance = .75) {
  const source = context.createBufferSource()
  source.buffer = buffer
  source.loop = true
  const filter = context.createBiquadFilter()
  filter.type = type
  filter.frequency.value = frequency
  filter.Q.value = resonance
  const level = context.createGain()
  level.gain.value = 0
  source.connect(filter).connect(level).connect(master)
  source.start()
  return level
}

export function enableEntityAudio() {
  const Audio = window.AudioContext ?? window.webkitAudioContext
  if (!Audio) return
  if (!context) {
    try {
      context = new Audio()
    } catch {
      return
    }
    master = context.createGain()
    master.gain.value = muted ? 0 : .64
    master.connect(context.destination)
    music = context.createGain()
    music.gain.value = 0
    musicFilter = context.createBiquadFilter()
    musicFilter.type = 'lowpass'
    music.connect(musicFilter).connect(master)
    crowd = bed(makeNoise(3.9, t => {
      const near = .5 + .5 * Math.sin(t * 13 + Math.sin(t * 4) * 2)
      const far = .5 + .5 * Math.sin(t * 8 + Math.sin(t * 2.1))
      return .15 + near ** 2 * .48 + far ** 2 * .33
    }, t => {
      const syllable = .5 + .5 * Math.sin(t * 9.5 + Math.sin(t * 3.3) * 2)
      const vowel = Math.sin(t * 1130 + Math.sin(t * 4.4) * 3) + .46 * Math.sin(t * 2260)
      const distant = Math.sin(t * 915 + Math.sin(t * 5.1) * 3) * (.5 + .5 * Math.sin(t * 12))
      return vowel * syllable ** 3 * .14 + distant * .09
    }), 'bandpass', 455, 1.4)
    rain = bed(makeNoise(4.4, t => .72 + .17 * Math.sin(t * 2.15) + .09 * Math.sin(t * 8)), 'highpass', 860, .45)
  }
  if (context.state !== 'running' && context.state !== 'closed') context.resume().catch(() => {})
}

export function setAudioMuted(value) {
  muted = value
  if (context && master) master.gain.setTargetAtTime(muted ? 0 : .64, context.currentTime, .035)
}

function tone(type, frequency, endFrequency, level, now, duration, output) {
  const oscillator = context.createOscillator()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, now)
  if (endFrequency !== frequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration)
  const volume = context.createGain()
  volume.gain.setValueAtTime(.001, now)
  volume.gain.linearRampToValueAtTime(level, now + .012)
  volume.gain.exponentialRampToValueAtTime(.001, now + duration)
  oscillator.connect(volume).connect(output)
  oscillator.start(now)
  oscillator.stop(now + duration)
  oscillator.onended = () => {
    oscillator.disconnect()
    volume.disconnect()
  }
}

const pitch = note => 440 * 2 ** ((note - 69) / 12)

function playPartyBeat(now) {
  const slot = beat % 8
  if (slot % 2 === 0) {
    const bass = pitch(bassNotes[Math.floor(beat / 2) % bassNotes.length])
    tone('triangle', bass, bass, .34, now, .21, music)
  }
  if (slot === 0 || slot === 4) tone('sine', 110, 44, .42, now, .19, music)
  if (slot === 2 || slot === 6) {
    for (const note of chordNotes[Math.floor(beat / 8) % chordNotes.length]) {
      const key = pitch(note)
      tone('sine', key, key, .12, now, .37, music)
    }
  }
  if (slot % 2) tone('triangle', 2250, 1220, .07, now, .035, music)
  beat++
}

function metalStep(now) {
  tone('triangle', 161, 81, .08, now, .105, master)
  tone('sine', 1050, 520, .052, now + .008, .16, master)
}

export function updateSceneAudio(game) {
  if (context?.state !== 'running') return
  const now = context.currentTime
  const { phase } = game
  const changed = phase !== lastPhase || game !== lastGame
  if (changed) {
    lastPhase = phase
    lastGame = game
    previousStep = undefined
    distanceSinceStep = 0
    if (phase === 'party') {
      beat = 0
      nextBeat = now
    }
  }

  const remaining = phase === 'party'
    ? 4 + guestDepartureTimes.filter(departure => game.introElapsed < departure).length
    : 4
  const sipFalloff = Math.max(0, 1 - Math.max(0, game.introElapsed - .45) / 1.15)
  const roomSound = phase === 'party' ? remaining / 8
    : phase === 'date' ? .28 : phase === 'sip' ? .28 * sipFalloff : 0
  if (Math.abs(roomSound - lastRoomSound) >= .004 || (roomSound === 0 && lastRoomSound !== 0)) {
    music.gain.setTargetAtTime(.27 * roomSound, now, .14)
    musicFilter.frequency.setTargetAtTime(550 + roomSound * 1850, now, .2)
    crowd.gain.setTargetAtTime(.16 * roomSound, now, .19)
    lastRoomSound = roomSound
  }
  const raining = rainyPhases.has(phase)
  if (raining !== lastRaining) {
    rain.gain.setTargetAtTime(raining ? .14 : 0, now, .25)
    lastRaining = raining
  }
  if (roomSound > 0) {
    if (nextBeat < now - .1) nextBeat = now
    while (nextBeat < now + .055) {
      playPartyBeat(Math.max(now, nextBeat))
      nextBeat += beatInterval
    }
  }

  if (phase === 'fireEscape') {
    if (previousStep) distanceSinceStep += Math.hypot(game.player.x - previousStep.x, game.player.z - previousStep.z)
    previousStep = { ...game.player }
    if (distanceSinceStep >= .52) {
      metalStep(now)
      distanceSinceStep %= .52
    }
  }
}

export function playEntitySound(voice, delay = 0) {
  if (context?.state !== 'running') return
  const now = context.currentTime + delay
  const door = voice === 'Door'
  const duration = door ? .32 : voice === 'Grunt' ? .38 : voice === 'Hiss' ? .86 : 1.15
  const buffer = makeNoise(duration, t => {
    const rumble = .45 + .55 * Math.sin(2 * Math.PI * (voice === 'Grunt' ? 51 : 32) * t) ** 2
    return voice === 'Hiss' ? 1 : rumble
  })
  const source = context.createBufferSource()
  source.buffer = buffer
  const filter = context.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(door ? 160 : voice === 'Hiss' ? 3100 : 240, now)
  filter.frequency.exponentialRampToValueAtTime(door ? 55 : voice === 'Hiss' ? 1400 : 105, now + duration)
  filter.Q.value = voice === 'Hiss' ? .65 : 1.1
  const volume = context.createGain()
  volume.gain.setValueAtTime(.001, now)
  volume.gain.linearRampToValueAtTime(voice === 'Hiss' ? .17 : .3, now + (door ? .012 : .07))
  volume.gain.exponentialRampToValueAtTime(.001, now + duration)
  source.connect(filter).connect(volume).connect(master)
  source.start(now)
  source.onended = () => {
    source.disconnect()
    filter.disconnect()
    volume.disconnect()
  }
}
