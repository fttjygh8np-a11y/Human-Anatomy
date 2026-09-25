/** Save the current study view (visibility, isolation, dissection, clipping, camera) and reopen it later. */
import { useEffect, useState } from 'react'
import type { SavedView } from '../../core/schema.ts'
import { useServices } from '../services.tsx'

export function SavedViews() {
  const { user, store, engine, index } = useServices()
  const [views, setViews] = useState<SavedView[]>([])
  const [name, setName] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    let alive = true
    user?.listViews().then((v) => alive && setViews(v))
    return () => {
      alive = false
    }
  }, [user])

  if (!user) return null
  const save = async () => {
    const scene = { ...store.getState().scene, ...(engine ? { camera: engine.getCameraState() } : {}) }
    const v = await user.saveView({
      name: name.trim() || `Görünüm ${views.length + 1}`,
      contentVersion: index.bundle.manifest.contentVersion,
      scene,
    })
    setViews((cur) => [...cur, v])
    setName('')
    setStatus(`"${v.name}" kaydedildi.`)
  }
  const open = (v: SavedView) => {
    store.getState().loadScene(v.scene, `Kayıtlı görünüm: ${v.name}`)
    if (v.scene.camera) engine?.setCameraState(v.scene.camera)
    setStatus(`"${v.name}" açıldı${v.contentVersion && v.contentVersion !== index.bundle.manifest.contentVersion ? ' (içerik sürümü değişmiş; bazı yapılar farklı olabilir)' : ''}.`)
  }
  const remove = async (v: SavedView) => {
    await user.deleteView(v.id)
    setViews((cur) => cur.filter((x) => x.id !== v.id))
  }

  return (
    <details className="saved-views">
      <summary>Kayıtlı görünümler ({views.length})</summary>
      <div className="row">
        <label htmlFor="view-name" className="visually-hidden">
          Görünüm adı
        </label>
        <input id="view-name" value={name} placeholder="Görünüm adı" onChange={(e) => setName(e.target.value)} />
        <button type="button" onClick={() => void save()}>
          Kaydet
        </button>
      </div>
      <ul>
        {views.map((v) => (
          <li key={v.id}>
            <button type="button" className="link-btn" onClick={() => open(v)}>
              {v.name}
            </button>{' '}
            <span className="small muted">{v.createdAt.slice(0, 10)}</span>{' '}
            <button type="button" className="link-btn" aria-label={`Sil: ${v.name}`} onClick={() => void remove(v)}>
              Sil
            </button>
          </li>
        ))}
      </ul>
      <p role="status" className="small">
        {status}
      </p>
    </details>
  )
}
