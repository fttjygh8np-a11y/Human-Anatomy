/**
 * Learning progress (viewed and correctly answered are shown separately), favourites and the
 * learner's local error reports with JSON export for the content team.
 */
import { useEffect, useState } from 'react'
import type { ErrorReport, Favorite, Progress, QuizAttempt } from '../../core/schema.ts'
import { useServices } from '../services.tsx'

export function ProgressSection() {
  const { user, index, store, settings } = useServices()
  const [progress, setProgress] = useState<Progress[]>([])
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
  const [reports, setReports] = useState<ErrorReport[]>([])

  useEffect(() => {
    if (!user) return
    let alive = true
    void Promise.all([user.listProgress(), user.listFavorites(), user.listQuizAttempts(), user.listErrorReports()]).then(([p, f, a, r]) => {
      if (!alive) return
      setProgress(p)
      setFavorites(f)
      setAttempts(a)
      setReports(r)
    })
    return () => {
      alive = false
    }
  }, [user])

  if (!user) return null
  const viewed = progress.filter((p) => p.viewCount > 0).length
  const answered = progress.filter((p) => p.attempts > 0).length
  const correct = progress.filter((p) => p.correct > 0).length
  const due = progress.filter((p) => p.srs && p.srs.dueAt <= new Date().toISOString()).length
  const name = (id: string) => index.displayName(id, settings.nameLanguage)

  const exportReports = async () => {
    const pending = reports.filter((r) => r.status === 'local')
    if (pending.length === 0) return
    const url = URL.createObjectURL(new Blob([JSON.stringify(pending, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `anatomi-3b-hata-bildirimleri-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    await user.markReportsExported(pending.map((r) => r.id))
    setReports(await user.listErrorReports())
  }

  return (
    <>
      <fieldset>
        <legend>İlerlemem</legend>
        <dl className="facts">
          <dt>İncelenen yapı</dt>
          <dd>{viewed}</dd>
          <dt>Soru yanıtlanan yapı</dt>
          <dd>{answered}</dd>
          <dt>En az bir kez doğru yanıtlanan</dt>
          <dd>{correct}</dd>
          <dt>Tekrar zamanı gelen</dt>
          <dd>{due}</dd>
          <dt>Tamamlanan sınav/tekrar</dt>
          <dd>{attempts.filter((a) => a.finishedAt).length}</dd>
        </dl>
        <p className="small muted">İncelemek ve doğru yanıtlamak ayrı sayılır; bir yapıyı açmak onu öğrenmiş sayılmanız anlamına gelmez.</p>
      </fieldset>
      <fieldset>
        <legend>Favorilerim ({favorites.length})</legend>
        {favorites.length === 0 && <p className="small muted">Bilgi kartındaki ☆ düğmesiyle favori ekleyebilirsiniz.</p>}
        <ul>
          {favorites.map((f) => (
            <li key={f.structureId}>
              <button type="button" className="link-btn" onClick={() => store.getState().select([f.structureId])}>
                {name(f.structureId)}
              </button>
            </li>
          ))}
        </ul>
      </fieldset>
      <fieldset>
        <legend>Hata bildirimlerim ({reports.length})</legend>
        <ul className="small">
          {reports.map((r) => (
            <li key={r.id}>
              {r.createdAt.slice(0, 10)} · {r.structureId ? name(r.structureId) : '—'} · {r.description.slice(0, 80)}{' '}
              <span className="badge">{r.status === 'exported' ? 'Dışa aktarıldı' : 'Yerel'}</span>
            </li>
          ))}
        </ul>
        <button type="button" disabled={!reports.some((r) => r.status === 'local')} onClick={() => void exportReports()}>
          Bekleyen bildirimleri dışa aktar (JSON)
        </button>
        <p className="small muted">Bildirimler sunucuya gönderilmez; dışa aktarılan dosyayı içerik ekibine iletin.</p>
      </fieldset>
    </>
  )
}
