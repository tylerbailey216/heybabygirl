let context

export function enableEntityAudio() {
  const Audio = window.AudioContext ?? window.webkitAudioContext
  if (!Audio) return
  context ??= new Audio()
  if (context.state === 'suspended') context.resume().catch(() => {})
}

export function playEntitySound(voice) {
  if (context?.state !== 'running') return
  const now = context.currentTime
  const door = voice === 'Door'
  const duration = door ? .32 : voice === 'Grunt' ? .38 : voice === 'Hiss' ? .86 : 1.15
  const length = Math.ceil(context.sampleRate * duration)
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const samples = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    const t = i / context.sampleRate
    const rumble = .45 + .55 * Math.sin(2 * Math.PI * (voice === 'Grunt' ? 51 : 32) * t) ** 2
    samples[i] = (Math.random() * 2 - 1) * (voice === 'Hiss' ? 1 : rumble)
  }
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
  source.connect(filter).connect(volume).connect(context.destination)
  source.start()
  source.onended = () => {
    source.disconnect()
    filter.disconnect()
    volume.disconnect()
  }
}
