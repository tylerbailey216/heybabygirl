import { test, expect } from '@playwright/test'

test('chevrons reveal compact remembered information and daily challenge opens', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hbg-after-midnight-v1', JSON.stringify({ unlocked: true, seen: [0,1,2], bests: {} })))
  await page.route('**/src/game.js', async route => {
    const response = await route.fetch()
    await route.fulfill({ response, body: (await response.text()).replace("phase: 'party', introElapsed", "phase: 'blackout', introElapsed") })
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.locator('#begin').click()
  const marker = page.getByRole('button', { name: 'Examine Hanging coats', exact: true })
  await expect(marker).toBeVisible()
  await expect(marker).toHaveText('')
  await marker.click()
  await expect(page.locator('#examination')).toContainText('Orange / Hiding place')
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await marker.click()
  await expect(page.locator('#examination')).toContainText('Remembered:')
  await page.screenshot({ path: 'test-results/chevrons-mobile.png' })
  await page.reload()
  await page.getByRole('button', { name: 'Daily nightmare', exact: true }).click()
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'waking')
})
