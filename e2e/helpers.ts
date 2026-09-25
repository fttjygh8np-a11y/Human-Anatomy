/** Shared helpers for the Playwright tests. */
import { existsSync, readdirSync } from 'node:fs'
import { expect, test, type Locator, type Page } from '@playwright/test'

const MODELS_DIR = 'public/models/bp3d'

/** Real BodyParts3D models are generated (npm run models:fetch && npm run models:build), not committed. */
export const hasModels = existsSync(MODELS_DIR) && readdirSync(MODELS_DIR).some((f) => f.endsWith('.glb'))

/** Skips the current test when the generated 3D models are missing. */
export function requireModels(): void {
  test.skip(
    !hasModels,
    `3B modeller yok (${MODELS_DIR}); bu test atlandı. Modelleri üretmek için: npm run models:fetch && npm run models:build && npm run content:build`,
  )
}

/** Opens the app and waits until the content bundle is loaded and the search index is ready. */
export async function openApp(page: Page, path = './'): Promise<void> {
  await page.goto(path)
  await waitForApp(page)
}

export async function waitForApp(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1, name: 'Anatomi 3B' })).toBeVisible({ timeout: 45_000 })
  await expect(searchBox(page)).toBeEnabled()
}

export const searchBox = (page: Page): Locator => page.getByRole('combobox', { name: 'Yapı ara' })

/** Header mode buttons ("Keşfet", "Sınav", "Ayarlar"). */
export const modeButton = (page: Page, name: string): Locator =>
  page.getByRole('navigation', { name: 'Kip' }).getByRole('button', { name, exact: true })

/** The info card of the selected structure (a region named by its title). */
export const infoCard = (page: Page, title: string): Locator => page.getByRole('region', { name: title, exact: true })

/** Searches and chooses the first hit whose text starts with `optionStart`. */
export async function searchAndChoose(page: Page, query: string, optionStart: string): Promise<void> {
  await searchBox(page).fill(query)
  const escaped = optionStart.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&')
  const option = page
    .getByRole('listbox', { name: 'Arama sonuçları' })
    .getByRole('option', { name: new RegExp('^' + escaped) })
    .first()
  await expect(option).toBeVisible()
  await option.click()
}

export const systemTree = (page: Page): Locator => page.getByRole('tree', { name: 'Sistemlere göre yapılar' })

/** Level-1 tree item of a system, e.g. "İskelet sistemi". */
export const systemItem = (page: Page, name: string): Locator =>
  systemTree(page).locator('li[role="treeitem"][aria-level="1"]').filter({ hasText: name })

/** Role and aria-level of the focused element plus its own row label. */
export async function focused(page: Page): Promise<{ role: string | null; level: string | null; label: string }> {
  return page.evaluate(() => {
    const el = document.activeElement
    return {
      role: el?.getAttribute('role') ?? null,
      level: el?.getAttribute('aria-level') ?? null,
      label: el?.querySelector(':scope > .tree-row .tree-label')?.textContent?.trim() ?? '',
    }
  })
}
