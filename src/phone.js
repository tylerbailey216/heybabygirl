export const phonePhases = new Set(['blackout', 'fireEscape', 'phoneDark', 'streetDazed', 'streetRun', 'streetSafe'])
export function phoneBrightness(game) {
  if (!game.phoneOn || !phonePhases.has(game.phase)) return 0
  return game.phase === 'streetDazed' ? Math.max(.22, 1 - game.phoneElapsed / 1.6) : 1
}
