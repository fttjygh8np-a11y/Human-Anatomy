/**
 * Per-structure personal tools on the info card: private notes and error reports (wrong label,
 * relation, position…). Reports carry the structure id and the current scene so a reviewer can
 * reproduce the view; they stay local until exported from Ayarlar.
 */
import { useEffect, useState } from 'react'
import type { ErrorReport, Note, StructureId } from '../../core/schema.ts'
import { useServices } from '../services.tsx'

const CATEGORY_LABEL: Record<ErrorReport['category'], string> = {
  label: 'Etiket yanlış',
  name: 'Ad yanlış',
  relation: 'İlişki yanlış',
  geometry: '3B şekil yanlış',
  position: 'Konum/taraf yanlış',
  text: 'Açıklama yanlış',
  question: 'Soru yanlış',
  other: 'Diğer',
}

export function Notes({ id }: { id: StructureId }) {
  const { user } = useServices()
  const [notes, setNotes] = useState<Note[]>([])
  const [text, setText] = useState('')

  useEffect(() => {
    let alive = true
    user?.listNotes(id).then((n) => alive && setNotes(n))
    return () => {
      alive = false
    }
  }, [user, id])

  if (!user) return null
  const add = async () => {
    const t = text.trim()
    if (!t) return
    const n = await user.putNote({ structureId: id, text: t })
    setNotes((cur) => [...cur, n])
    setText('')
  }
  const remove = async (noteId: string) => {
    await user.deleteNote(noteId)
    setNotes((cur) => cur.filter((n) => n.id !== noteId))
  }

  return (
    <section aria-labelledby={`notes-${id}`}>
      <h3 id={`notes-${id}`}>Notlarım</h3>
      {notes.length === 0 && <p className="muted small">Bu yapı için notunuz yok. Notlar yalnızca bu tarayıcıda saklanır.</p>}
      <ul className="notes">
        {notes.map((n) => (
          <li key={n.id}>
            <span>{n.text}</span>{' '}
            <button type="button" className="link-btn" onClick={() => void remove(n.id)} aria-label={`Notu sil: ${n.text.slice(0, 40)}`}>
              Sil
            </button>
          </li>
        ))}
      </ul>
      <label htmlFor={`note-${id}`} className="visually-hidden">
        Yeni not
      </label>
      <textarea id={`note-${id}`} rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Not ekle…" />
      <button type="button" onClick={() => void add()} disabled={!text.trim()}>
        Notu kaydet
      </button>
    </section>
  )
}

/** Public issue tracker of the project; reports can be sent there without any backend. */
const ISSUE_URL = 'https://github.com/fttjygh8np-a11y/Human-Anatomy/issues/new'

function issueLink(p: { id: StructureId; name: string; category: ErrorReport['category']; description: string; contentVersion: string }): string {
  const body = [
    `**Yapı:** ${p.name} (\`${p.id}\`)`,
    `**Tür:** ${CATEGORY_LABEL[p.category]}`,
    `**İçerik sürümü:** \`${p.contentVersion}\``,
    '',
    '**Açıklama:**',
    p.description,
    '',
    '_Uygulamadaki "Hata bildir" formundan oluşturuldu. Kişisel veri eklemeyin._',
  ].join('\n')
  const q = new URLSearchParams({ title: `[Hata] ${p.name}: ${CATEGORY_LABEL[p.category]}`, body, labels: 'içerik-hatası' })
  return `${ISSUE_URL}?${q.toString()}`
}

export function ErrorReportForm({ id }: { id: StructureId }) {
  const { user, store, index } = useServices()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<ErrorReport['category']>('label')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('')
  const [sent, setSent] = useState<string | null>(null)

  if (!user) return null
  const submit = async () => {
    const d = description.trim()
    if (!d) return
    await user.addErrorReport({
      structureId: id,
      category,
      description: d,
      appVersion: import.meta.env.VITE_APP_VERSION ?? '0.1.0',
      contentVersion: index.bundle.manifest.contentVersion,
      view: store.getState().scene,
    })
    setSent(issueLink({ id, name: index.displayName(id), category, description: d, contentVersion: index.bundle.manifest.contentVersion }))
    setDescription('')
    setOpen(false)
    setStatus('Bildiriminiz bu tarayıcıya kaydedildi.')
  }

  return (
    <section>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)}>
          Hata bildir
        </button>
      ) : (
        <fieldset>
          <legend>Hata bildir</legend>
          <label>
            Tür{' '}
            <select value={category} onChange={(e) => setCategory(e.target.value as ErrorReport['category'])}>
              {(Object.keys(CATEGORY_LABEL) as ErrorReport['category'][]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor={`report-${id}`}>Hata açıklaması</label>
          <textarea id={`report-${id}`} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          <p className="small muted">Bildirime yapı kimliği ve şu anki görünüm (görünürlük, kesit, kamera) eklenir.</p>
          <button type="button" className="primary" disabled={!description.trim()} onClick={() => void submit()}>
            Gönder
          </button>{' '}
          <button type="button" onClick={() => setOpen(false)}>
            Vazgeç
          </button>
        </fieldset>
      )}
      <p role="status" className="small">
        {status}
      </p>
      {sent && (
        <p className="small">
          İçerik ekibine iletmek için:{' '}
          <a href={sent} target="_blank" rel="noreferrer noopener">
            GitHub'da bildir
          </a>{' '}
          (GitHub hesabı gerekir; bildirim herkese açık olur). Ya da Ayarlar › Hata bildirimlerim bölümünden JSON olarak dışa aktarın.
        </p>
      )}
    </section>
  )
}

/** Side-by-side names and classification of several selected structures. */
export function Compare({ ids }: { ids: StructureId[] }) {
  const { index } = useServices()
  const rows = ids.map((id) => index.getStructure(id)).filter((s) => s !== undefined)
  return (
    <section aria-labelledby="compare-title">
      <h3 id="compare-title">Seçili yapıları karşılaştır ({rows.length})</h3>
      <div className="table-scroll">
        <table className="compare">
          <thead>
            <tr>
              <th scope="col">TR</th>
              <th scope="col">LA</th>
              <th scope="col">EN</th>
              <th scope="col">Sistem</th>
              <th scope="col">Taraf</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td>{s.names.tr?.value ?? '—'}</td>
                <td lang="la">{s.names.la?.value ?? '—'}</td>
                <td lang="en">{s.names.en.value}</td>
                <td>{s.systems.map((x) => index.bundle.systems.find((r) => r.id === x)?.name.tr ?? x).join(', ')}</td>
                <td>{s.laterality === 'right' ? 'Sağ' : s.laterality === 'left' ? 'Sol' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted">Birden fazla yapı seçmek için Shift ile tıklayın.</p>
    </section>
  )
}
