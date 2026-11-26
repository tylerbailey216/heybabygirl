import { test, expect } from '@playwright/test'

async function wake(page) {
  // Observe the meter so software-rendered CI frames cannot miss quick inputs.
  for (let i = 0; i < 9; i++) {
    const before = await page.locator('#wake-meter').evaluate(el => el.value)
    const key = i % 2 ? 'a' : 'd'
    await page.keyboard.down(key)
    if (i === 0) await page.waitForTimeout(500)
    else await expect.poll(() => page.locator('#wake-meter').evaluate(el => el.value), { timeout: 4000 }).toBeGreaterThan(before)
    await page.keyboard.up(key)
    if (await page.locator('#wake-meter').evaluate(el => el.value >= 7)) break
  }
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'blackout')
}

test('story starts locked with the supplied apartment music and party scene', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => {
    const NativeAudio = window.Audio
    window.Audio = function (...args) {
      const audio = new NativeAudio(...args)
      window.testTrack = audio
      return audio
    }
  })
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await expect(page.locator('#arcade-start')).toBeDisabled()
  await page.locator('#begin').click()
  await expect(page.locator('#scene canvas')).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.testTrack?.currentTime || 0)).toBeGreaterThan(0)
  await expect.poll(() => page.evaluate(() => window.testTrack?.src || '')).toContain('corrupted-sector-7')
  await page.screenshot({ path: 'test-results/party-desktop.png' })
  await page.locator('#sound-toggle').click()
  await expect(page.locator('#sound-toggle')).toHaveAttribute('aria-pressed', 'true')
  expect(errors).toEqual([])
})

test('mobile arcade loss, same-setup retry, new run and saved unlock', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  await context.addInitScript(() => {
    if (!localStorage.getItem('hbg-after-midnight-v1')) localStorage.setItem('hbg-after-midnight-v1', JSON.stringify({ unlocked: true, seen: [0, 1, 2], bests: {} }))
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await page.locator('#arcade-start').click()
  await expect(page.locator('#wake-panel')).toBeVisible()
  await wake(page)
  await expect(page.locator('#touch')).toBeVisible()
  await page.screenshot({ path: 'test-results/arcade-mobile.png' })
  await expect(page.locator('#ending-splash')).toBeVisible({ timeout: 90000 })
  await expect(page.locator('#ending-title')).toHaveText('Caught after midnight')
  const setup = await page.locator('.ending-chapter').textContent()
  const clue = await page.locator('#run-clue').textContent()
  await expect(page.locator('#ending-splash')).toHaveCSS('opacity', '1')
  await page.screenshot({ path: 'test-results/results-mobile.png' })
  for (const id of ['ending-restart', 'new-run', 'story-return']) {
    const box = await page.locator(`#${id}`).boundingBox()
    expect(box.height).toBeGreaterThanOrEqual(44)
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.y + box.height).toBeLessThanOrEqual(844)
  }
  await page.locator('#new-run').click()
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'waking')
  expect(await page.locator('#run-clue').textContent()).not.toEqual(clue)
  // Let the same new setup fail to exercise Retry this setup.
  await wake(page)
  await expect(page.locator('#ending-splash')).toBeVisible({ timeout: 90000 })
  expect(await page.locator('.ending-chapter').textContent()).not.toEqual(setup)
  const retryClue = await page.locator('#run-clue').textContent()
  await page.setViewportSize({ width: 844, height: 390 })
  await expect(page.locator('#ending-splash')).toHaveCSS('opacity', '1')
  for (const id of ['ending-restart', 'new-run', 'story-return']) {
    const box = await page.locator(`#${id}`).boundingBox()
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.y + box.height).toBeLessThanOrEqual(390)
  }
  await page.screenshot({ path: 'test-results/results-landscape.png' })
  await page.locator('#ending-restart').click()
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'waking')
  expect(await page.locator('#run-clue').textContent()).toEqual(retryClue)
  await page.reload()
  await expect(page.locator('#arcade-start')).toBeEnabled()
  expect(errors).toEqual([])
  await context.close()
})
