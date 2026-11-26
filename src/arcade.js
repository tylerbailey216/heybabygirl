const key = 'hbg-after-midnight-v1'
export function loadProgress(storage) {
  try {
    const data = JSON.parse(storage.getItem(key)) || {}
    return { unlocked: data.unlocked === true, seen: Array.isArray(data.seen) ? data.seen.filter(n => Number.isInteger(n) && n >= 0 && n < 3) : [],
      bests: data.bests && typeof data.bests === 'object' ? data.bests : {} }
  } catch { return { unlocked: false, seen: [], bests: {} } }
}
export function saveProgress(storage, progress) {
  try { storage.setItem(key, JSON.stringify(progress)); return true } catch { return false }
}
export function scoreRun(game) {
  return Math.max(0, Math.round(10000 - game.runTime * 40 + Math.min(3, game.closeEncounters) * 250))
}
export function recordEscape(progress, game) {
  progress.unlocked = true
  if (!game.arcade) return false
  const score = scoreRun(game)
  const previous = progress.bests[game.setup]
  const newBest = !previous || !Number.isFinite(previous.score) || score > previous.score
  progress.bests[game.setup] = { score: newBest ? score : previous.score,
    time: previous && Number.isFinite(previous.time) ? Math.min(previous.time, game.runTime) : game.runTime }
  return newBest
}
export const formatTime = seconds => `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, '0')}`
