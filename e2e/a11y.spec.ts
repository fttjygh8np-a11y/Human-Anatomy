/**
 * Automated accessibility scans (axe-core) of the Keşfet, Sınav and Ayarlar views in light and
 * dark theme. Serious and critical violations fail the test; all findings are attached to the
 * report. Automated checks do not replace testing with assistive technology.
 */
import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { hasModels, infoCard, modeButton, openApp, searchAndChoose } from './helpers.ts'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']

async function scan(page: Page, testInfo: TestInfo, view: string): Promise<void> {
  // Let lazily loaded panels and loading notices settle.
  await expect(page.getByRole('status').filter({ hasText: /yükleniyor…$/ })).toHaveCount(0)
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  await testInfo.attach(`axe-${view}.json`, { body: JSON.stringify(results.violations, null, 2), contentType: 'application/json' })
  const blocking = results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.impact} ${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)
  expect(blocking, `${view}: ciddi/kritik erişilebilirlik ihlali`).toEqual([])
}

/** Opens the app with the given theme chosen in Ayarlar (the default theme is dark). */
async function openThemed(page: Page, scheme: 'light' | 'dark'): Promise<void> {
  await openApp(page)
  await modeButton(page, 'Ayarlar').click()
  await page.getByRole('region', { name: 'Ayarlar' }).getByRole('combobox', { name: /Tema/ }).selectOption(scheme)
  await expect(page.locator('html')).toHaveAttribute('data-theme', scheme)
  await modeButton(page, 'Keşfet').click()
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme === 'light' ? 'açık' : 'koyu'} tema`, () => {
    test.use({ colorScheme: scheme })

    test('Keşfet görünümü', async ({ page }, testInfo) => {
      // Four full-page axe scans with the 3D scene loaded; slow on 2-core CI runners.
      test.setTimeout(180_000)
      await openThemed(page, scheme)
      await scan(page, testInfo, `kesfet-bos-${scheme}`)

      // Info card of a structure with its own sourced text, then a sided instance that shows
      // the text of its generic concept; the skeletal branch of the tree is expanded.
      await searchAndChoose(page, 'kol kemiği', 'Kol kemiği')
      await expect(infoCard(page, 'Kol kemiği')).toBeVisible()
      await page.locator('li[role="treeitem"][aria-level="1"]').first().locator('.tree-toggle').click()
      await scan(page, testInfo, `kesfet-kol-kemigi-${scheme}`)

      await searchAndChoose(page, 'sağ kol kemiği', 'Sağ kol kemiği')
      const card = infoCard(page, 'Sağ kol kemiği')
      await expect(card).toBeVisible()
      if (hasModels) await expect(card.getByRole('button', { name: 'Gizle', exact: true })).toBeEnabled({ timeout: 60_000 })
      await scan(page, testInfo, `kesfet-sag-kol-kemigi-${scheme}`)

      await page.getByRole('tab', { name: 'Bölgeler' }).click()
      await expect(page.getByRole('tree', { name: 'Bölgelere göre yapılar' })).toBeVisible()
      await scan(page, testInfo, `kesfet-bolgeler-${scheme}`)
    })

    test('Sınav görünümü', async ({ page }, testInfo) => {
      await openThemed(page, scheme)
      await modeButton(page, 'Sınav').click()
      await expect(page.getByRole('heading', { level: 2, name: 'Sınav ve tekrar' })).toBeVisible()
      await scan(page, testInfo, `sinav-ayarlar-${scheme}`)

      await page.getByRole('button', { name: 'Başlat' }).click()
      if (hasModels) {
        await expect(page.locator('#quiz-q')).toBeVisible()
        await scan(page, testInfo, `sinav-soru-${scheme}`)
      } else {
        // Without models no question can be generated; the reason is reported.
        await expect(page.getByText('Bu ayarlarla soru üretilemedi.')).toBeVisible()
        await scan(page, testInfo, `sinav-soru-yok-${scheme}`)
      }
    })

    test('Ayarlar görünümü', async ({ page }, testInfo) => {
      await openThemed(page, scheme)
      await modeButton(page, 'Ayarlar').click()
      await expect(page.getByRole('heading', { level: 2, name: 'Ayarlar' })).toBeVisible()
      await scan(page, testInfo, `ayarlar-${scheme}`)
    })
  })
}
