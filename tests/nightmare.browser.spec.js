import { test, expect } from '@playwright/test'

test('return nightmare renders its lunges, reduced-motion shot and clean exterior reset', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.setViewportSize({ width: 960, height: 700 })
  await page.route('**/src/main.js', route => route.fulfill({ contentType: 'application/javascript', body: `
    import '/src/style.css'
    import { createView } from '/src/view.js'
    import { createGame } from '/src/game.js'
    import { nightmareBeat } from '/src/nightmare.js'
    const view = createView(document.querySelector('#scene'))
    const game = createGame()
    game.nightmareSeed = 2
    game.phase = 'fireEscape'
    game.player.x = -5.02
    game.update(.05, -1, 0)
    document.querySelector('#dialogue').hidden = true
    window.shot = t => {
      game.cinematicElapsed = t
      const beat = nightmareBeat(t, game.nightmareSeed, matchMedia('(prefers-reduced-motion: reduce)').matches)
      const screen = document.querySelector('#game')
      screen.dataset.phase = game.phase
      screen.style.setProperty('--nightmare-blur', beat.blur + 'px')
      screen.style.setProperty('--nightmare-darkness', beat.darkness)
      view.render(game, t)
      return beat
    }
    window.resetExterior = () => {
      game.update(3.5, 0, 0)
      game.retryFireEscape()
      window.shot(0)
    }
    window.shot(.2)
  ` }))
  await page.goto('/')
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'returnNightmare')
  await expect(page.locator('#scene canvas')).toBeVisible()
  // Let the heroine atlas finish loading before comparing the shots.
  await page.evaluate(async () => {
    const image = new Image()
    image.src = '/src/assets/heroine.webp'
    await image.decode()
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  })
  await page.evaluate(() => window.shot(.55))
  await page.screenshot({ path: 'test-results/nightmare-first-lunge.png' })
  const impact = await page.evaluate(() => window.shot(1.85))
  expect(impact.approach).toBe(1)
  await page.screenshot({ path: 'test-results/nightmare-impact.png' })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate(() => window.shot(1.85))
  await expect(page.locator('#scene canvas')).toHaveCSS('filter', 'blur(0.65px) contrast(1.35) saturate(0.55)')
  await page.screenshot({ path: 'test-results/nightmare-reduced-motion.png' })
  await page.evaluate(() => window.resetExterior())
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'fireEscape')
  await expect(page.locator('#scene canvas')).toHaveCSS('filter', 'none')
  expect(errors).toEqual([])
})
