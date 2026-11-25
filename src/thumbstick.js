export function bindThumbstick(base) {
  const knob = base.querySelector('span')
  const state = { x: 0, z: 0 }
  let pointer = null

  function reset() {
    const previous = pointer
    pointer = null
    if (previous !== null && base.hasPointerCapture(previous)) base.releasePointerCapture(previous)
    state.x = 0
    state.z = 0
    knob.style.transform = ''
  }

  function move(event) {
    if (event.pointerId !== pointer) return
    const bounds = base.getBoundingClientRect()
    const radius = (bounds.width - knob.offsetWidth) / 2
    if (radius <= 0) return
    const dx = event.clientX - (bounds.left + bounds.width / 2)
    const dz = event.clientY - (bounds.top + bounds.height / 2)
    const length = Math.hypot(dx, dz)
    const limit = length > 0 ? Math.min(1, radius / length) : 1
    knob.style.transform = `translate(${dx * limit}px, ${dz * limit}px)`
    const deadZone = .15
    const strength = Math.max(0, (Math.min(1, length / radius) - deadZone) / (1 - deadZone))
    state.x = length > 0 ? dx / length * strength : 0
    state.z = length > 0 ? dz / length * strength : 0
  }

  base.addEventListener('pointerdown', event => {
    if (pointer !== null || event.button !== 0) return
    event.preventDefault()
    pointer = event.pointerId
    base.setPointerCapture(pointer)
    move(event)
  })
  base.addEventListener('pointermove', move)
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    base.addEventListener(type, event => {
      if (event.pointerId === pointer) reset()
    })
  }
  return Object.assign(state, { reset })
}
