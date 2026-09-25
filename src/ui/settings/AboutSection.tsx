/**
 * "Hakkında ve kaynaklar": the educational-use notice and the attribution of every content, model
 * and font source with its licence (required by CC BY / CC BY-SA). Generated from the sources in
 * the content bundle, so a new source appears here without code changes.
 */
import type { Source } from '../../core/schema.ts'
import { useServices } from '../services.tsx'

const USE_LABEL: [RegExp, string][] = [
  [/^geometry/, '3B modeller'],
  [/^names:/, 'adlar'],
  [/^content:/, 'açıklamalar'],
  [/^relations/, 'ilişkiler'],
  [/^(lessons|questions)/, 'dersler ve sorular'],
  [/^scope-basis/, 'kapsam'],
  [/^identifiers/, 'kimlikler'],
]

function usesOf(s: Source): string {
  const labels = new Set<string>()
  for (const u of s.usedFor) for (const [re, label] of USE_LABEL) if (re.test(u)) labels.add(label)
  return [...labels].join(', ')
}

export function AboutSection() {
  const { index } = useServices()
  const sources = [...index.bundle.sources].sort((a, b) => a.shortLabel.localeCompare(b.shortLabel, 'tr'))
  return (
    <fieldset className="about">
      <legend>Hakkında ve kaynaklar</legend>
      <div className="notice" role="note">
        <strong>Eğitim amaçlıdır.</strong> İçerik henüz bir anatomi uzmanının incelemesinden geçmemiştir ve hata içerebilir. Tıbbi tanı,
        tedavi veya karar için kullanılmaz. Adlar ve açıklamalar kaynaklarıyla birlikte gösterilir; "Doğrulanmadı" etiketi uzman onayı
        olmadığını belirtir.
      </div>
      <p className="small muted">
        İçerik sürümü <code>{index.bundle.manifest.contentVersion}</code>. Hataları bilgi kartındaki "Hata bildir" düğmesiyle
        iletebilirsiniz.
      </p>
      <ul className="source-list">
        {sources.map((s) => (
          <li key={s.id}>
            <div className="source-head">
              <strong>{s.shortLabel}</strong>
              {s.license.url ? (
                <a href={s.license.url} target="_blank" rel="noreferrer noopener" className="badge">
                  {s.license.id}
                </a>
              ) : (
                <span className="badge">{s.license.id}</span>
              )}
              <span className={`badge ${s.license.verifiedAt ? 'ok' : 'warn'}`}>
                {s.license.verifiedAt ? `Lisans doğrulandı (${s.license.verifiedAt.date})` : 'Lisans doğrulanmadı'}
              </span>
            </div>
            <p className="small">
              {s.url ? (
                <a href={s.url} target="_blank" rel="noreferrer noopener">
                  {s.license.attribution ?? s.citation}
                </a>
              ) : (
                (s.license.attribution ?? s.citation)
              )}
              {usesOf(s) && <span className="muted"> · Kullanım: {usesOf(s)}</span>}
            </p>
          </li>
        ))}
        <li>
          <div className="source-head">
            <strong>Inter yazı tipi</strong>
            <a href="https://openfontlicense.org/" target="_blank" rel="noreferrer noopener" className="badge">
              OFL-1.1
            </a>
          </div>
          <p className="small">The Inter Project Authors (github.com/rsms/inter), uygulamayla birlikte yerel olarak sunulur.</p>
        </li>
      </ul>
      <p className="small muted">
        Değişiklik bildirimi: 3B modeller biçim dönüştürme, eksen dönüşümü ve sıkıştırma ile uyarlanmıştır; metinler kısaltılarak
        alıntılanmış veya Türkçe özetlenmiştir. Ayrıntılar depodaki <code>docs/kaynakca.md</code> ve <code>docs/model-katalogu.md</code>{' '}
        belgelerindedir.
      </p>
    </fieldset>
  )
}
