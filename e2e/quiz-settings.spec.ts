/** Quiz (name mode) and settings persistence (IndexedDB). */
import { expect, test, type Page } from '@playwright/test'
import { modeButton, openApp, requireModels, waitForApp } from './helpers.ts'

test('sınav (ad modu) başlar ve soru gösterir', async ({ page }) => {
  requireModels()
  await openApp(page)
  await modeButton(page, 'Sınav').click()
  await expect(page.getByRole('heading', { level: 2, name: 'Sınav ve tekrar' })).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Adını yaz / seç' })).toBeChecked()
  await page.getByRole('button', { name: 'Başlat' }).click()

  const question = page.locator('#quiz-q')
  await expect(question).toBeVisible()
  await expect(question).toHaveText(/\S/)
  await expect(page.getByText(/^Soru 1\/\d+/)).toBeVisible()
  // Either answer options or a text field are offered.
  await expect(page.locator('.quiz-options button, #quiz-answer').first()).toBeVisible()
})

/** Settings record as stored by src/user/userDb.ts (database "anatomi-3b-user", store "settings", key "user"). */
function storedSettings(page: Page) {
  return page.evaluate(
    () =>
      new Promise<Record<string, unknown> | null>((resolve, reject) => {
        const req = indexedDB.open('anatomi-3b-user')
        req.onerror = () => reject(req.error)
        req.onsuccess = () => {
          const db = req.result
          const get = db.transaction('settings').objectStore('settings').get('user')
          get.onsuccess = () => {
            db.close()
            resolve((get.result as { value?: Record<string, unknown> } | undefined)?.value ?? null)
          }
          get.onerror = () => reject(get.error)
        }
      }),
  )
}

test('ayarlar: tema ve yazı boyutu yeniden yüklemeden sonra korunur', async ({ page }) => {
  await openApp(page)
  await modeButton(page, 'Ayarlar').click()
  const panel = page.getByRole('region', { name: 'Ayarlar' })
  await panel.getByRole('combobox', { name: /Tema/ }).selectOption('dark')
  const font = panel.getByRole('slider', { name: /Yazı boyutu/ })
  await font.focus()
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight')

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(font).toHaveValue('1.2')
  await expect.poll(() => storedSettings(page)).toMatchObject({ theme: 'dark', fontScale: 1.2 })

  await page.reload()
  await waitForApp(page)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect
    .poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue('--font-scale')))
    .toBe('1.2')
  await modeButton(page, 'Ayarlar').click()
  await expect(panel.getByRole('combobox', { name: /Tema/ })).toHaveValue('dark')
  await expect(panel.getByRole('slider', { name: /Yazı boyutu/ })).toHaveValue('1.2')
})
