const words = process.argv.slice(2)
const out = {}
for (const w of words) {
  const r = await fetch('https://sozluk.gov.tr/gts?ara=' + encodeURIComponent(w), { headers: { 'User-Agent': 'Mozilla/5.0 (anatomi-3b egitim projesi)' } })
  const j = await r.json().catch(() => ({ error: 'parse' }))
  if (j.error) { console.log(`✗ ${w}`); continue }
  for (const e of j) {
    const senses = e.anlamlarListe.map((a) => `${a.anlam} [${(a.ozelliklerListe || []).map((o) => o.tam_adi).join(',')}]`)
    console.log(`✓ ${e.madde} (madde_id ${e.madde_id}): ${senses.join(' ; ').slice(0, 260)}`)
    out[w] = j
  }
}
process.stdout.write('')
import('node:fs').then((fs) => fs.writeFileSync(process.env.S + '/tdk-' + Date.now() + '.json', JSON.stringify(out)))
