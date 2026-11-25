export function bindThumbstick(base) {
  const knob = base.querySelector('span')
  const state = { x: 0, z: 0 }
  let pointer = null
  let touchId = null
  const supportsTouchEvents = 'ontouchstart' in base.ownerDocument.defaultView

  function reset() {
    const previous = pointer
    pointer = null
    touchId = null
    if (previous !== null && base.hasPointerCapture(previous)) base.releasePointerCapture(previous)
    state.x = 0
    state.z = 0
    knob.style.transform = ''
  }

  function move(clientX, clientY) {
    const bounds = base.getBoundingClientRect()
    const radius = (bounds.width - knob.offsetWidth) / 2
    if (radius <= 0) return
    const dx = clientX - (bounds.left + bounds.width / 2)
    const dz = clientY - (bounds.top + bounds.height / 2)
    const length = Math.hypot(dx, dz)
    const limit = length > 0 ? Math.min(1, radius / length) : 1
    knob.style.transform = `translate(${dx * limit}px, ${dz * limit}px)`
    const deadZone = .15
    const strength = Math.max(0, (Math.min(1, length / radius) - deadZone) / (1 - deadZone))
    state.x = length > 0 ? dx / length * strength : 0
    state.z = length > 0 ? dz / length * strength : 0
  }

  for (const type of ['contextmenu', 'selectstart']) {
    base.addEventListener(type, event => event.preventDefault())
  }

  if (supportsTouchEvents) {
    // Safari can start a native long-press gesture unless the touch is canceled.
    const activeTouch = event => Array.from(event.changedTouches).find(touch => touch.identifier === touchId)
    base.addEventListener('touchstart', event => {
      event.preventDefault()
      if (pointer !== null || touchId !== null) return
      const touch = event.changedTouches[0]
      touchId = touch.identifier
      move(touch.clientX, touch.clientY)
    }, { passive: false })
    base.addEventListener('touchmove', event => {
      event.preventDefault()
      const touch = activeTouch(event)
      if (touch) move(touch.clientX, touch.clientY)
    }, { passive: false })
    for (const type of ['touchend', 'touchcancel']) {
      base.addEventListener(type, event => {
        if (activeTouch(event)) reset()
      })
    }
  }

  base.addEventListener('pointerdown', event => {
    const useTouchEvent = event.pointerType === 'touch' && supportsTouchEvents
    const secondaryButton = event.pointerType !== 'touch' && event.button !== 0
    if (useTouchEvent || secondaryButton || pointer !== null || touchId !== null) return
    event.preventDefault()
    pointer = event.pointerId
    base.setPointerCapture(pointer)
    move(event.clientX, event.clientY)
  })
  base.addEventListener('pointermove', event => {
    if (event.pointerId === pointer) move(event.clientX, event.clientY)
  })
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    base.addEventListener(type, event => {
      if (event.pointerId === pointer) reset()
    })
  }
  return Object.assign(state, { reset })
}
