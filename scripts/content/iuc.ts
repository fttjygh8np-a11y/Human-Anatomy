/**
 * `npm run content:iuc` — downloads the İÜC open anatomy textbooks (CC BY 4.0) into vendor/iuc/,
 * checks each PDF against the sha256 recorded in scripts/content/lib/iuc.ts and writes the text of
 * every page with its printed page number to vendor/iuc/<file>.pages.json. The page texts are the
 * reference for quote checks (npm run content:quotecheck) and term extraction.
 *
 * Options: --refresh re-downloads the PDFs. Behind an HTTPS proxy run with NODE_USE_ENV_PROXY=1.
 */
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { REPO_ROOT, repoRelative } from './lib/io.ts'
import { assignPrinted, IUC_BOOKS, iucDownloadUrl, type IucBook } from './lib/iuc.ts'

const DIR = join(REPO_ROOT, 'vendor', 'iuc')
const refresh = process.argv.includes('--refresh')

async function download(book: IucBook, file: string): Promise<void> {
  let lastError: unknown
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(iucDownloadUrl(book))
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await writeFile(file, Buffer.from(await res.arrayBuffer()))
      return
    } catch (e) {
      lastError = e
      await new Promise((r) => setTimeout(r, 2000 * 2 ** i))
    }
  }
  throw new Error(`${book.sourceId} indirilemedi (${iucDownloadUrl(book)}): ${String(lastError)}`)
}

/** Page text with line breaks where the baseline changes. */
async function extractPages(pdf: Uint8Array): Promise<{ pdfPage: number; text: string }[]> {
  const task = getDocument({ data: pdf, verbosity: 0 })
  const doc = await task.promise
  const pages: { pdfPage: number; text: string }[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent()
    let text = ''
    let lastY: number | undefined
    for (const item of content.items) {
      if (!('str' in item)) continue
      const y = item.transform[5] as number
      if (lastY !== undefined && Math.abs(y - lastY) > 2) text += '\n'
      text += item.str
      lastY = y
    }
    pages.push({ pdfPage: i, text })
  }
  await task.destroy()
  return pages
}

async function main(): Promise<number> {
  await mkdir(DIR, { recursive: true })
  for (const book of IUC_BOOKS) {
    const pdfFile = join(DIR, `${book.file}.pdf`)
    if (refresh || !existsSync(pdfFile)) {
      console.log(`İndiriliyor: ${book.sourceId} …`)
      await download(book, pdfFile)
    }
    const pdf = await readFile(pdfFile)
    const sha = createHash('sha256').update(pdf).digest('hex')
    if (sha !== book.sha256) {
      console.error(
        `${repoRelative(pdfFile)}: sha256 beklenenden farklı (${sha}). Yayınevi dosyayı değiştirmiş olabilir; ` +
          'lisans ve sayfa numaraları yeniden doğrulanmadan kullanılmaz (scripts/content/lib/iuc.ts).',
      )
      return 1
    }
    const pages = assignPrinted(await extractPages(new Uint8Array(pdf)))
    const out = join(DIR, `${book.file}.pages.json`)
    await writeFile(out, JSON.stringify({ sourceId: book.sourceId, sha256: sha, pages }))
    const numbered = pages.filter((p) => p.printed !== null).length
    console.log(`${book.sourceId}: ${pages.length} sayfa (${numbered} basılı numaralı) → ${repoRelative(out)}`)
  }
  return 0
}

main().then(
  (code) => {
    process.exitCode = code
  },
  (e: unknown) => {
    console.error('İÜC kitapları hazırlanamadı:', e)
    process.exitCode = 1
  },
)
