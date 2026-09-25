/** Notes, saved views and error reports persist locally; guided lessons; female (HRA) model view. */
import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { modeButton, openApp, requireModels, searchAndChoose } from './helpers.ts'

test('not, kayıtlı görünüm ve hata bildirimi yeniden yüklemeden sonra korunur', async ({ page }) => {
  requireModels()
  await openApp(page)
  await searchAndChoose(page, 'kol kemiği', 'Kol kemiği')
  await page.getByLabel('Yeni not').fill('Tuberculum majus')
  await page.getByRole('button', { name: 'Notu kaydet' }).click()
  await expect(page.locator('ul.notes li')).toHaveCount(1)
  await page.getByRole('button', { name: 'Hata bildir' }).click()
  await page.getByLabel('Hata açıklaması').fill('Deneme bildirimi')
  await page.getByRole('button', { name: 'Gönder' }).click()
  await expect(page.getByText(/Bildiriminiz .*kaydedildi/)).toBeVisible()
  await page.getByText(/Kayıtlı görünümler/).click()
  await page.getByLabel('Görünüm adı').fill('Kol')
  await page.getByRole('button', { name: 'Kaydet', exact: true }).click()
  // Wait for every IndexedDB write to be acknowledged before reloading.
  await expect(page.getByText('"Kol" kaydedildi.')).toBeVisible()

  await page.reload()
  await searchAndChoose(page, 'kol kemiği', 'Kol kemiği')
  await expect(page.locator('ul.notes li')).toHaveCount(1)
  await page.getByText(/Kayıtlı görünümler \(1\)/).click()
  await expect(page.locator('.saved-views').getByRole('button', { name: 'Kol', exact: true })).toBeVisible()
  await modeButton(page, 'Ayarlar').click()
  await expect(page.getByText('Hata bildirimlerim (1)')).toBeVisible()
})

test('rehberli ders adım adım ilerler ve erişilebilirlik ihlali yok', async ({ page }) => {
  requireModels()
  await openApp(page)
  await modeButton(page, 'Dersler').click()
  await page.getByRole('button', { name: 'Derse başla' }).first().click()
  await expect(page.getByText(/Adım 1\/\d+/)).toBeVisible()
  await page.getByRole('button', { name: 'Sonraki adım' }).click()
  await expect(page.getByText(/Adım 2\/\d+/)).toBeVisible()
  const results = await new AxeBuilder({ page }).include('.app-info').analyze()
  expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
  await page.getByRole('button', { name: 'Dersten çık' }).click()
  await expect(page.getByRole('heading', { name: 'Rehberli dersler' })).toBeVisible()
})

test('kadın yapısı seçilince HRA modeli görünümü açılır', async ({ page }) => {
  requireModels()
  await openApp(page)
  test.skip((await page.locator('.model-switch').count()) === 0, 'HRA modelleri derlenmemiş (npm run models:hra)')
  await searchAndChoose(page, 'sol yumurtalık', 'Sol yumurtalık')
  await expect(page.locator('.model-switch select')).toHaveValue('female')
})
