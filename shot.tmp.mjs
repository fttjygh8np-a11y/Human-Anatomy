import { chromium } from '@playwright/test'
const S = process.argv[2]
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const p = await b.newPage({ viewport: { width: 1400, height: 850 } })
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
await p.waitForTimeout(6000)
await p.getByRole('button', { name: 'Sınav' }).click()
await p.getByLabel('3B modelde bul').check()
await p.getByRole('button', { name: 'Başlat' }).click()
await p.waitForTimeout(3000)
const prompts = []
for (let i = 0; i < 10; i++) {
  const q = await p.locator('#quiz-q').innerText().catch(() => null)
  if (!q) break
  prompts.push(q)
  await p.getByRole('button', { name: 'Atla' }).click().catch(() => {})
  await p.waitForTimeout(400)
}
console.log(prompts.join('\n'))
console.log('END:', (await p.locator('.app-info').innerText()).replace(/\n/g, ' | ').slice(0, 300))
await b.close()
