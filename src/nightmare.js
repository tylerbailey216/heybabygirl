import { returnReachAt } from './game.js'

const smooth = (t, a, b) => {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a)))
  return x * x * (3 - 2 * x)
}

export function nightmareBeat(time, seed = 0, reducedMotion = false) {
  const t = Math.max(0, time)
  const offset = Math.sin(seed) * .07
  // Three discontinuous advances: watch, displace, then close the last gap.
  const approach = reducedMotion ? smooth(t, .3, returnReachAt)
    : .37 * smooth(t, .28 + offset, .53 + offset)
      + .29 * smooth(t, .91 - offset, 1.13 - offset)
      + .34 * smooth(t, 1.48, returnReachAt)
  const impact = Math.exp(-(((t - returnReachAt) / .19) ** 2))
  const breath = reducedMotion ? .5 : .5 + .5 * Math.sin(t * 5.1 + seed)
  const shake = reducedMotion ? 0 : .012 + approach * .045 + impact * .13
  return {
    approach, impact,
    side: reducedMotion ? 0 : Math.sin(t * 19 + seed) * .11 * Math.sin(approach * Math.PI) + Math.sin(approach * 10) * .23,
    shakeX: reducedMotion ? 0 : Math.sin(t * 47 + seed) * shake,
    shakeY: reducedMotion ? 0 : Math.sin(t * 61 + seed * 2) * shake * .6,
    roll: reducedMotion ? 0 : Math.sin(t * 8.3 + seed) * (.014 + impact * .045),
    darkness: reducedMotion ? .42 : .28 + breath * .25 + impact * .19,
    blur: reducedMotion ? .65 : .8 + breath * 1.1 + impact * 2,
    light: reducedMotion ? .45 : .16 + (1 - breath) * .55,
  }
}
