/** Explore mode: content loading, search → info card, trees, hide/undo, keyboard navigation. */
import { expect, test } from '@playwright/test'
import { focused, infoCard, openApp, requireModels, searchAndChoose, systemItem, systemTree } from './helpers.ts'

test('uygulama içeriği yükler: ağaç, arama ve 3B alanı hazır', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await openApp(page)

  const tree = systemTree(page)
  await expect(tree.locator('li[role="treeitem"][aria-level="1"]')).not.toHaveCount(0)
  await expect(systemItem(page, 'İskelet sistemi')).toBeVisible()
  await expect(page.getByRole('tree', { name: 'Sistemlere göre yapılar' })).toBeVisible()
  await expect(page.getByText('Bilgi görmek için modelde, ağaçta veya aramada bir yapı seçin.')).toBeVisible()
  // The lazily loaded viewer chunk mounts its accessible region.
  await expect(page.getByRole('application', { name: '3B anatomi modeli' })).toBeAttached()
  expect(errors).toEqual([])
})

test('"kol kemiği" araması: bilgi kartında kaynaklı TR/LA/EN adlar', async ({ page }) => {
  await openApp(page)
  await searchAndChoose(page, 'kol kemiği', 'Kol kemiği')

  const card = infoCard(page, 'Kol kemiği')
  await expect(card.getByRole('heading', { level: 2, name: 'Kol kemiği' })).toBeVisible()
  const lines = card.locator('.names .name-line')
  await expect(lines).toHaveCount(3)
  const expected = [
    ['TR', 'Kol kemiği'],
    ['LA', 'humerus'],
    ['EN', 'Humerus'],
  ] as const
  for (const [i, [tag, value]] of expected.entries()) {
    const line = lines.nth(i)
    await expect(line.locator('.lang-tag')).toHaveText(tag)
    await expect(line.locator(`[lang="${tag.toLowerCase()}"]`)).toHaveText(value)
    // Every name cites at least one source.
    await expect(line.locator('cite').first()).toHaveText(/\S/)
  }
  await expect(lines.nth(0).locator('cite')).toContainText(['TDK'])
  await expect(lines.nth(1).locator('cite')).toContainText(['TA2'])
})

test('sistem ağacı: dal açılır ve yapı seçilir', async ({ page }) => {
  await openApp(page)
  const skeletal = systemItem(page, 'İskelet sistemi')
  await expect(skeletal).toHaveAttribute('aria-expanded', 'false')
  await skeletal.locator(':scope > .tree-row > .tree-toggle').click()
  await expect(skeletal).toHaveAttribute('aria-expanded', 'true')

  const child = skeletal.locator(':scope > ul[role="group"] > li[role="treeitem"]').first()
  await expect(child).toBeVisible()
  const label = child.locator(':scope > .tree-row .tree-label')
  const name = (await label.innerText()).trim()
  await label.click()
  await expect(child).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#info-title')).toHaveText(name)
})

test('gizle → araç çubuğu ve Ctrl+Z ile geri al, yinele', async ({ page }) => {
  requireModels()
  await openApp(page)
  await searchAndChoose(page, 'sağ kol kemiği', 'Sağ kol kemiği')
  const card = infoCard(page, 'Sağ kol kemiği')
  const hide = card.getByRole('button', { name: 'Gizle', exact: true })
  const show = card.getByRole('button', { name: 'Göster', exact: true })
  // Enabled once the upper-limb skeleton model has loaded.
  await expect(hide).toBeEnabled({ timeout: 60_000 })

  const toolbar = page.getByRole('toolbar', { name: 'Sahne araçları' })
  await hide.click()
  await expect(show).toBeVisible()
  await toolbar.getByRole('button', { name: /^Geri al:/ }).click()
  await expect(hide).toBeVisible()
  await toolbar.getByRole('button', { name: /^Yinele:/ }).click()
  await expect(show).toBeVisible()

  await page.keyboard.press('Control+z')
  await expect(hide).toBeVisible()
  await page.keyboard.press('Control+Shift+z')
  await expect(show).toBeVisible()
})

test('ağaçta yalnızca klavye ile gezinme ve seçim', async ({ page }) => {
  await openApp(page)
  // Tab from the start of the page until a tree item has focus.
  for (let i = 0; i < 25 && (await focused(page)).role !== 'treeitem'; i++) await page.keyboard.press('Tab')
  expect(await focused(page)).toMatchObject({ role: 'treeitem', level: '1', label: expect.stringContaining('İskelet sistemi') })

  await page.keyboard.press('ArrowDown')
  expect((await focused(page)).label).toContain('Eklem sistemi')
  await page.keyboard.press('Home')
  expect((await focused(page)).label).toContain('İskelet sistemi')

  const skeletal = systemItem(page, 'İskelet sistemi')
  await page.keyboard.press('ArrowRight')
  await expect(skeletal).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('ArrowRight')
  const child = await focused(page)
  expect(child).toMatchObject({ role: 'treeitem', level: '2' })
  expect(child.label).not.toBe('')

  await page.keyboard.press('Enter')
  await expect(page.locator('#info-title')).toHaveText(child.label)
  await expect(page.locator('li[role="treeitem"][aria-selected="true"]')).toHaveCount(1)

  await page.keyboard.press('ArrowLeft')
  expect(await focused(page)).toMatchObject({ level: '1', label: expect.stringContaining('İskelet sistemi') })
  await page.keyboard.press('ArrowLeft')
  await expect(skeletal).toHaveAttribute('aria-expanded', 'false')
  await page.keyboard.press('End')
  expect(await focused(page)).toMatchObject({ role: 'treeitem', level: '1' })
  expect((await focused(page)).label).not.toContain('İskelet sistemi')
})
