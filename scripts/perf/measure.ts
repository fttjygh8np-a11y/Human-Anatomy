/**
 * `npm run perf` — measures the production build in headless Chromium and writes
 * docs/raporlar/performans.md + performans.json (Turkish).
 *
 * Builds nothing itself: serves the existing dist/ with `vite preview` (own port, default 4184),
 * or measures an already running server given with `--url`. The page is opened with `?perf`,
 * which exposes the engine as `window.__anatomi` (src/app/testHook.ts).
 *
 * Records: time to the first usable view (structure tree rendered), first 3D frame, all default
 * models loaded, system switch (muscular system on), orbit benchmark frame times (p50/p95),
 * draw calls, triangles, JS heap, and transferred bytes per file (Resource Timing).
 *
 * Options:
 *   --url <url>        measure a running server (e.g. http://localhost:4173/) instead of starting one
 *   --port <n>         port of the preview started by this script (default 4184)
 *   --duration <ms>    orbit benchmark length (default 5000)
 *   --out <path>       report path without extension (default docs/raporlar/performans)
 *   --headed           show the browser window
 * Environment: CHROMIUM_PATH (default /opt/pw-browsers/chromium when present, else Playwright's).
 *
 * In a container WebGL runs on SwiftShader (CPU); the numbers say nothing about real devices.
 */
import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import { dirname, resolve } from 'node:path'
import { chromium, type Page } from '@playwright/test'

const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
const LOCAL_CHROMIUM = '/opt/pw-browsers/chromium'
const VIEWPORT = { width: 1280, height: 800 }
/** Systems switched on at first start (src/ui/systems.ts DEFAULT_ON_SYSTEMS). */
const DEFAULT_SYSTEM = 'skeletal'
const SWITCH_SYSTEM = 'muscular'

// ----- options ------------------------------------------------------------------------------

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const givenUrl = arg('url')
const port = Number(arg('port') ?? 4184)
const durationMs = Number(arg('duration') ?? 5000)
const outBase = resolve(arg('out') ?? 'docs/raporlar/performans')
const headed = process.argv.includes('--headed')
const chromiumPath = process.env.CHROMIUM_PATH || (existsSync(LOCAL_CHROMIUM) ? LOCAL_CHROMIUM : undefined)

// ----- types of the in-page hook (see src/app/testHook.ts) --------------------------------------

interface BenchmarkResult {
  durationMs: number
  frames: number
  fps: number
  frameMsP50: number
  frameMsP95: number
  frameMsMax: number
  drawCalls: number
  triangles: number
  jsHeapBytes: number | null
}
interface EngineStats {
  drawCalls: number
  triangles: number
  geometries: number
  textures: number
  loadedAssets: number
  jsHeapBytes: number | null
}
interface Hook {
  engine: { getStats(): EngineStats; runOrbitBenchmark(ms: number): Promise<BenchmarkResult> } | null
  store: {
    getState(): { scene: { loadedAssets: string[] }; setSystemVisible(id: string, on: boolean): void }
  }
  firstFrameMs: number | null
  assetLoads: { assetId: string; ms: number; at: number }[]
}
type PerfWindow = Window & { __anatomi?: Hook; __perfMarks?: { contentReady?: number } }

interface ResourceRow {
  name: string
  kind: 'model' | 'veri' | 'js' | 'css' | 'belge' | 'diğer'
  transferBytes: number
  encodedBytes: number
  decodedBytes: number
  durationMs: number
}

// ----- server ---------------------------------------------------------------------------------

async function reachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

async function startPreview(): Promise<{ url: string; proc: ChildProcess }> {
  if (!existsSync('dist/index.html')) {
    throw new Error('dist/ bulunamadı. Önce "npm run build" çalıştırın (perf betiği derleme yapmaz).')
  }
  // vite preview serves under the build's base path (VITE_BASE, see vite.config.ts).
  const base = process.env.VITE_BASE?.startsWith('/') ? process.env.VITE_BASE : '/'
  const url = `http://localhost:${port}${base.endsWith('/') ? base : `${base}/`}`
  if (await reachable(url)) throw new Error(`${port} numaralı port dolu. --port ile başka bir port verin ya da --url ile o sunucuyu ölçün.`)
  const vite = resolve('node_modules/vite/bin/vite.js')
  const proc = spawn(process.execPath, [vite, 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore' })
  for (let i = 0; i < 100; i++) {
    if (await reachable(url)) return { url, proc }
    if (proc.exitCode !== null) break
    await new Promise((r) => setTimeout(r, 200))
  }
  proc.kill()
  throw new Error('vite preview başlatılamadı.')
}

// ----- in-page helpers ---------------------------------------------------------------------------

/** Ids of the base assets of a system, from the deployed assets.json. */
async function baseAssetsOf(page: Page, system: string): Promise<string[]> {
  return page.evaluate(async (sys) => {
    const raw = (await (await fetch('data/assets.json')).json()) as unknown
    const list = (Array.isArray(raw) ? raw : (raw as { assets: unknown[] }).assets) as { id: string; lod: string; systems: string[] }[]
    return list.filter((a) => a.lod === 'base' && a.systems.includes(sys)).map((a) => a.id)
  }, system)
}

/** Waits until all `ids` are loaded and returns performance.now() of the last 'asset-loaded' among them. */
async function waitForAssets(page: Page, ids: string[], timeoutMs = 300_000): Promise<number> {
  await page.waitForFunction(
    (want) => {
      const h = (window as PerfWindow).__anatomi
      const loaded = new Set(h?.store.getState().scene.loadedAssets ?? [])
      return want.every((id) => loaded.has(id))
    },
    ids,
    { timeout: timeoutMs, polling: 100 },
  )
  return page.evaluate((want) => {
    const loads = (window as PerfWindow).__anatomi?.assetLoads ?? []
    return Math.max(0, ...loads.filter((l) => want.includes(l.assetId)).map((l) => l.at))
  }, ids)
}

/** Resolves after the next two animation frames (the scene has been drawn). */
const nextFrames = (page: Page) =>
  page.evaluate(() => new Promise<number>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(performance.now())))))

async function heap(page: Page): Promise<{ usedBytes: number; totalBytes: number }> {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Performance.enable')
  const { metrics } = await cdp.send('Performance.getMetrics')
  await cdp.detach()
  const m = (name: string) => metrics.find((x) => x.name === name)?.value ?? 0
  return { usedBytes: m('JSHeapUsedSize'), totalBytes: m('JSHeapTotalSize') }
}

function kindOf(path: string): ResourceRow['kind'] {
  if (/\.glb$/i.test(path)) return 'model'
  if (/\/data\/[^/]+\.json$/i.test(path)) return 'veri'
  if (/\.m?js$/i.test(path)) return 'js'
  if (/\.css$/i.test(path)) return 'css'
  if (/\/$|\.html$/i.test(path)) return 'belge'
  return 'diğer'
}

// ----- formatting ---------------------------------------------------------------------------------

const ms = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${Math.round(v).toLocaleString('tr-TR')} ms`)
const num = (v: number, digits = 0) => v.toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits })
const kb = (b: number) => `${num(b / 1024, 1)} kB`
const mb = (b: number | null) => (b === null ? '—' : `${num(b / 1024 / 1024, 1)} MB`)

function gitCommit(): string | null {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

// ----- main ---------------------------------------------------------------------------------------

async function main(): Promise<void> {
  let server: ChildProcess | null = null
  let url: string
  if (givenUrl) {
    url = givenUrl.endsWith('/') ? givenUrl : `${givenUrl}/`
    if (!(await reachable(url))) throw new Error(`${url} yanıt vermiyor.`)
  } else {
    const started = await startPreview()
    server = started.proc
    url = started.url
  }
  console.log(`Ölçülen adres: ${url}`)

  const browser = await chromium.launch({
    headless: !headed,
    ...(chromiumPath ? { executablePath: chromiumPath } : {}),
    args: [...GL_ARGS, '--enable-precise-memory-info'],
  })
  try {
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, locale: 'tr-TR' })
    const page = await context.newPage()
    const pageErrors: string[] = []
    page.on('pageerror', (e) => pageErrors.push(e.message))
    await page.addInitScript(() => {
      performance.setResourceTimingBufferSize(5000)
      const w = window as PerfWindow
      w.__perfMarks = {}
      // First usable view: the structure tree is rendered (content bundle loaded and indexed).
      // Polled: the init script runs before document.documentElement exists, so an observer
      // cannot be attached yet.
      const timer = setInterval(() => {
        if (document.querySelector('[role="tree"]')) {
          w.__perfMarks!.contentReady = performance.now()
          clearInterval(timer)
        }
      }, 10)
    })

    console.log('Sayfa açılıyor…')
    await page.goto(`${url}?perf`, { waitUntil: 'load' })
    await page.waitForFunction(() => (window as PerfWindow).__perfMarks?.contentReady !== undefined, null, { timeout: 120_000 })
    await page.waitForFunction(() => (window as PerfWindow).__anatomi?.firstFrameMs != null, null, { timeout: 300_000 })

    const defaultAssets = await baseAssetsOf(page, DEFAULT_SYSTEM)
    console.log(`Varsayılan modeller bekleniyor (${defaultAssets.length})…`)
    const defaultLoadedAt = await waitForAssets(page, defaultAssets)
    await nextFrames(page)
    await page.waitForTimeout(1000)

    const nav = await page.evaluate(() => {
      const n = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
      const w = window as PerfWindow
      return {
        responseStart: n?.responseStart ?? null,
        domContentLoaded: n?.domContentLoadedEventEnd ?? null,
        load: n?.loadEventEnd ?? null,
        contentReady: w.__perfMarks?.contentReady ?? null,
        firstFrame: w.__anatomi?.firstFrameMs ?? null,
      }
    })
    const gpu = await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2')
      if (!gl) return { renderer: 'WebGL2 yok', vendor: '' }
      const ext = gl.getExtension('WEBGL_debug_renderer_info')
      return {
        renderer: String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)),
        vendor: String(ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR)),
      }
    })

    const statsDefault = await page.evaluate(() => (window as PerfWindow).__anatomi!.engine!.getStats())
    const heapDefault = await heap(page)
    console.log(`Yörünge ölçümü (${DEFAULT_SYSTEM}, ${durationMs} ms)…`)
    const benchDefault = await page.evaluate((d) => (window as PerfWindow).__anatomi!.engine!.runOrbitBenchmark(d), durationMs)

    // System switch: muscular system on → its base models loaded and drawn.
    const switchAssets = await baseAssetsOf(page, SWITCH_SYSTEM)
    console.log(`Sistem geçişi: ${SWITCH_SYSTEM} (${switchAssets.length} model)…`)
    const switchStart = await page.evaluate((sys) => {
      const t = performance.now()
      ;(window as PerfWindow).__anatomi!.store.getState().setSystemVisible(sys, true)
      return t
    }, SWITCH_SYSTEM)
    await waitForAssets(page, switchAssets)
    const switchDrawn = await nextFrames(page)
    await page.waitForTimeout(1000)
    const statsSwitch = await page.evaluate(() => (window as PerfWindow).__anatomi!.engine!.getStats())
    console.log(`Yörünge ölçümü (${DEFAULT_SYSTEM} + ${SWITCH_SYSTEM})…`)
    const benchSwitch = await page.evaluate((d) => (window as PerfWindow).__anatomi!.engine!.runOrbitBenchmark(d), durationMs)
    const heapSwitch = await heap(page)

    // Short stability check: switch the muscular system off and on again three times.
    const cycles: { geometries: number; heapUsedBytes: number }[] = []
    for (let i = 0; i < 3; i++) {
      await page.evaluate((sys) => (window as PerfWindow).__anatomi!.store.getState().setSystemVisible(sys, false), SWITCH_SYSTEM)
      await page.waitForFunction(
        (want) => {
          const loaded = new Set((window as PerfWindow).__anatomi!.store.getState().scene.loadedAssets)
          return want.every((id) => !loaded.has(id))
        },
        switchAssets,
        { timeout: 60_000 },
      )
      await page.evaluate((sys) => (window as PerfWindow).__anatomi!.store.getState().setSystemVisible(sys, true), SWITCH_SYSTEM)
      await waitForAssets(page, switchAssets)
      await nextFrames(page)
      const s = await page.evaluate(() => (window as PerfWindow).__anatomi!.engine!.getStats())
      cycles.push({ geometries: s.geometries, heapUsedBytes: (await heap(page)).usedBytes })
    }

    const resources: ResourceRow[] = await page.evaluate(() =>
      (performance.getEntriesByType('resource') as PerformanceResourceTiming[]).map((e) => ({
        name: new URL(e.name).pathname,
        kind: 'diğer' as const,
        transferBytes: e.transferSize,
        encodedBytes: e.encodedBodySize,
        decodedBytes: e.decodedBodySize,
        durationMs: e.duration,
      })),
    )
    const docEntry = await page.evaluate(() => {
      const n = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      return { name: new URL(n.name).pathname, transferBytes: n.transferSize, encodedBytes: n.encodedBodySize, decodedBytes: n.decodedBodySize, durationMs: n.duration }
    })
    const rows: ResourceRow[] = [{ ...docEntry, kind: 'belge' as const }, ...resources].map((r) => ({ ...r, kind: kindOf(r.name) }))

    const report = {
      generatedAt: new Date().toISOString(),
      commit: gitCommit(),
      url,
      benchmarkDurationMs: durationMs,
      environment: {
        browser: `Chromium ${browser.version()}`,
        headless: !headed,
        webglRenderer: gpu.renderer,
        webglVendor: gpu.vendor,
        softwareRendering: /swiftshader|llvmpipe|software/i.test(gpu.renderer),
        cpu: os.cpus()[0]?.model ?? 'bilinmiyor',
        cpuCount: os.cpus().length,
        memoryBytes: os.totalmem(),
        platform: `${os.type()} ${os.release()} (${os.arch()})`,
        node: process.version,
        viewport: VIEWPORT,
        network: 'yerel sunucu (vite preview, gzip), ağ kısıtlaması yok',
      },
      timings: {
        firstByteMs: nav.responseStart,
        domContentLoadedMs: nav.domContentLoaded,
        loadEventMs: nav.load,
        firstUsableViewMs: nav.contentReady,
        firstFrameMs: nav.firstFrame,
        defaultModelsLoadedMs: defaultLoadedAt,
        systemSwitchMs: switchDrawn - switchStart,
      },
      defaultSystem: { id: DEFAULT_SYSTEM, assets: defaultAssets.length, stats: statsDefault, heap: heapDefault, benchmark: benchDefault },
      switchSystem: { id: SWITCH_SYSTEM, assets: switchAssets.length, stats: statsSwitch, heap: heapSwitch, benchmark: benchSwitch },
      stabilityCycles: cycles,
      assetLoads: await page.evaluate(() => (window as PerfWindow).__anatomi!.assetLoads),
      resources: rows,
      pageErrors,
    }

    mkdirSync(dirname(outBase), { recursive: true })
    writeFileSync(`${outBase}.json`, `${JSON.stringify(report, null, 2)}\n`)
    writeFileSync(`${outBase}.md`, renderMarkdown(report))
    console.log(`Rapor yazıldı: ${outBase}.md ve ${outBase}.json`)
    console.log(
      `İlk görünüm ${ms(nav.contentReady)}, ilk kare ${ms(nav.firstFrame)}, ` +
        `yörünge ${num(benchDefault.fps, 1)} FPS (p95 ${num(benchDefault.frameMsP95, 1)} ms) — SwiftShader: gerçek cihaz ölçümü değildir.`,
    )
  } finally {
    await browser.close()
    server?.kill()
  }
}

type Report = {
  generatedAt: string
  commit: string | null
  url: string
  benchmarkDurationMs: number
  environment: {
    browser: string
    headless: boolean
    webglRenderer: string
    webglVendor: string
    softwareRendering: boolean
    cpu: string
    cpuCount: number
    memoryBytes: number
    platform: string
    node: string
    viewport: { width: number; height: number }
    network: string
  }
  timings: {
    firstByteMs: number | null
    domContentLoadedMs: number | null
    loadEventMs: number | null
    firstUsableViewMs: number | null
    firstFrameMs: number | null
    defaultModelsLoadedMs: number
    systemSwitchMs: number
  }
  defaultSystem: { id: string; assets: number; stats: EngineStats; heap: { usedBytes: number; totalBytes: number }; benchmark: BenchmarkResult }
  switchSystem: { id: string; assets: number; stats: EngineStats; heap: { usedBytes: number; totalBytes: number }; benchmark: BenchmarkResult }
  stabilityCycles: { geometries: number; heapUsedBytes: number }[]
  resources: ResourceRow[]
  pageErrors: string[]
}

function renderMarkdown(r: Report): string {
  const e = r.environment
  const t = r.timings
  const benchRow = (label: string, s: Report['defaultSystem']) => {
    const b = s.benchmark
    return `| ${label} | ${s.assets} | ${num(b.frames)} | ${num(b.fps, 1)} | ${num(b.frameMsP50, 1)} | ${num(b.frameMsP95, 1)} | ${num(b.frameMsMax, 1)} | ${num(b.drawCalls)} | ${num(b.triangles)} |`
  }
  const kinds: ResourceRow['kind'][] = ['belge', 'js', 'css', 'veri', 'model', 'diğer']
  const kindLabel: Record<ResourceRow['kind'], string> = {
    belge: 'HTML belgesi',
    js: 'JavaScript',
    css: 'CSS',
    veri: 'İçerik verisi (data/*.json)',
    model: '3B modeller (GLB)',
    diğer: 'Diğer',
  }
  const sum = (rows: ResourceRow[], k: keyof Pick<ResourceRow, 'transferBytes' | 'decodedBytes'>) => rows.reduce((a, x) => a + x[k], 0)
  const totals = kinds
    .map((k) => {
      const rows = r.resources.filter((x) => x.kind === k)
      if (rows.length === 0) return null
      return `| ${kindLabel[k]} | ${rows.length} | ${kb(sum(rows, 'transferBytes'))} | ${kb(sum(rows, 'decodedBytes'))} |`
    })
    .filter(Boolean)
  const all = r.resources
  const perFile = [...r.resources]
    .sort((a, b) => kinds.indexOf(a.kind) - kinds.indexOf(b.kind) || b.transferBytes - a.transferBytes)
    .map((x) => `| \`${x.name}\` | ${x.kind} | ${kb(x.transferBytes)} | ${kb(x.decodedBytes)} | ${ms(x.durationMs)} |`)
  const cyc = r.stabilityCycles.map((c, i) => `| ${i + 1} | ${num(c.geometries)} | ${mb(c.heapUsedBytes)} |`)

  return `# Performans ölçümü

> **Önemli uyarı — bu sayılar gerçek cihazlar hakkında bir şey söylemez.** Ölçüm, GPU'suz bir
> kapsayıcıda (container) başsız Chromium ile yapıldı; WebGL **${e.softwareRendering ? 'SwiftShader yazılım işleyicisiyle, yani CPU üzerinde' : `"${e.webglRenderer}" ile`}**
> çalıştı. Yazılım işlemede kare süreleri gerçek bir GPU'ya göre kat kat uzundur ve CPU çekirdek
> sayısına bağlıdır. Gereksinimlerdeki (docs/gereksinimler.md §11) **"belirlenen referans cihazda
> en az 30 FPS" hedefi henüz gerçek donanımda ölçülmedi**; bu rapor o hedefin karşılandığını
> göstermez. Rapor yalnızca ölçüm altyapısının çalıştığını gösterir ve aynı ortamda yapılan
> değişikliklerin önce/sonra karşılaştırması için bir taban değer verir.

Oluşturma: ${r.generatedAt} · commit \`${r.commit ?? 'bilinmiyor'}\` · \`npm run perf\` (scripts/perf/measure.ts)

## Ölçüm ortamı

| Özellik | Değer |
| --- | --- |
| Tarayıcı | ${e.browser}${e.headless ? ' (başsız)' : ''} |
| WebGL işleyici | ${e.webglRenderer} (${e.webglVendor}) |
| CPU | ${e.cpu} × ${e.cpuCount} |
| Bellek | ${mb(e.memoryBytes)} |
| İşletim sistemi | ${e.platform} |
| Node.js | ${e.node} |
| Görüntü alanı | ${e.viewport.width}×${e.viewport.height}, cihaz piksel oranı 1 |
| Ağ | ${e.network} |
| Adres | \`${r.url}?perf\` |

## Yükleme ve geçiş süreleri

Süreler sayfa gezintisinin başlangıcından (performance.now()) itibaren ölçülmüştür.

| Ölçüt | Süre |
| --- | --- |
| İlk bayt (HTML) | ${ms(t.firstByteMs)} |
| DOMContentLoaded | ${ms(t.domContentLoadedMs)} |
| İlk kullanılabilir görünüm (yapı ağacı çizildi; arama ve bilgi kartı kullanılabilir) | ${ms(t.firstUsableViewMs)} |
| İlk 3B kare (model içeren ilk kare) | ${ms(t.firstFrameMs)} |
| Varsayılan modellerin tamamı yüklendi (${r.defaultSystem.id}, ${r.defaultSystem.assets} model) | ${ms(t.defaultModelsLoadedMs)} |
| Sistem geçişi: ${r.switchSystem.id} açıldı → ${r.switchSystem.assets} model yüklendi ve çizildi | ${ms(t.systemSwitchMs)} |

## Etkileşim sırasında kare süreleri

\`engine.runOrbitBenchmark(${num(r.benchmarkDurationMs)})\` (${num(r.benchmarkDurationMs / 1000, 1)} sn): kamera hedef çevresinde 360° döner, her animasyon karesi çizilir.

| Sahne | Model | Kare | FPS | p50 kare (ms) | p95 kare (ms) | En uzun (ms) | Çizim çağrısı | Üçgen |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${benchRow(r.defaultSystem.id, r.defaultSystem)}
${benchRow(`${r.defaultSystem.id} + ${r.switchSystem.id}`, r.switchSystem)}

## Bellek

| Durum | JS yığını (kullanılan / ayrılan) | Geometri | Doku |
| --- | --- | --- | --- |
| Varsayılan modeller yüklendikten sonra | ${mb(r.defaultSystem.heap.usedBytes)} / ${mb(r.defaultSystem.heap.totalBytes)} | ${num(r.defaultSystem.stats.geometries)} | ${num(r.defaultSystem.stats.textures)} |
| ${r.switchSystem.id} açıldıktan ve ölçümden sonra | ${mb(r.switchSystem.heap.usedBytes)} / ${mb(r.switchSystem.heap.totalBytes)} | ${num(r.switchSystem.stats.geometries)} | ${num(r.switchSystem.stats.textures)} |

GPU belleği tarayıcıdan okunamadığı için ölçülmedi.

### Kısa kararlılık denetimi

${r.switchSystem.id} sistemi üç kez kapatılıp yeniden açıldı (modeller boşaltılıp yeniden yüklendi). Geometri sayısının
sabit kalması, boşaltılan GPU kaynaklarının temizlendiğini gösterir. Bu, saatler süren kullanımın yerine geçmez.

| Döngü | Geometri | JS yığını |
| --- | --- | --- |
${cyc.join('\n')}

## İndirme boyutları

Resource Timing'e göre aktarılan (sıkıştırılmış) ve açılmış boyutlar; ilk ziyaret, önbellek boş.

| Tür | Dosya | Aktarılan | Açılmış |
| --- | --- | --- | --- |
${totals.join('\n')}
| **Toplam** | ${all.length} | **${kb(sum(all, 'transferBytes'))}** | ${kb(sum(all, 'decodedBytes'))} |

<details>
<summary>Dosya başına</summary>

| Dosya | Tür | Aktarılan | Açılmış | Süre |
| --- | --- | --- | --- | --- |
${perFile.join('\n')}

</details>

${r.pageErrors.length ? `## Sayfa hataları\n\n${r.pageErrors.map((x) => `- ${x}`).join('\n')}\n\n` : ''}## Yeniden üretme

\`\`\`sh
npm run build          # perf derleme yapmaz
npm run perf           # dist/ için kendi vite preview sunucusunu başlatır (port 4184)
npm run perf -- --url http://localhost:4173/   # çalışan bir sunucuyu ölç
\`\`\`

## Gerçek cihazda ölçüm (yapılacak)

30 FPS hedefinin doğrulanması için referans cihaz profili tanımlanıp ölçüm gerçek donanımda
tekrarlanmalıdır; örneğin tümleşik GPU'lu orta sınıf bir dizüstü bilgisayar ve orta sınıf bir
Android tablet, güncel Chrome, gerçekçi ağ koşulu (ör. "Fast 4G" kısıtlaması). Bu cihazlarda
uygulama \`?perf\` ile açılıp tarayıcı konsolunda \`await __anatomi.engine.runOrbitBenchmark(10000)\`
çalıştırılabilir ya da \`npm run perf -- --url <adres> --headed\` ile GPU'lu bir makinede aynı betik
kullanılabilir. Sonuçlar cihaz adı ve tarayıcı sürümüyle birlikte bu klasöre eklenmelidir.
`
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e)
  process.exitCode = 1
})
