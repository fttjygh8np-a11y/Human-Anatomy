/**
 * Scene controls: undo/redo (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z or Ctrl+Y), camera presets,
 * isolation/dissection restore, clipping plane, exploded view and labels.
 */
import { useEffect } from 'react'
import { CAMERA_PRESETS } from '../../core/schema.ts'
import { CAMERA_PRESET_LABEL } from '../../i18n/labels.ts'
import { useScene, useServices } from '../services.tsx'

const PLANE_LABEL = { sagittal: 'Sagittal', coronal: 'Koronal', axial: 'Aksiyel (transvers)' } as const
/** Plane normal axis in the anat-gltf-v1 frame (bbox index of the min value). */
const PLANE_AXIS = { sagittal: 0, coronal: 2, axial: 1 } as const

export function SceneToolbar() {
  const { store, engine, index } = useServices()
  const scene = useScene((s) => s.scene)
  const past = useScene((s) => s.past)
  const future = useScene((s) => s.future)
  const lastAction = useScene((s) => s.lastAction)
  const api = store.getState()

  // Slider range = extent of loaded content along the plane normal (fallback ±1 m).
  const axis = PLANE_AXIS[scene.clip.plane]
  let lo = Infinity
  let hi = -Infinity
  for (const id of scene.loadedAssets) {
    for (const n of index.getAsset(id)?.nodes ?? []) {
      lo = Math.min(lo, n.bbox[axis])
      hi = Math.max(hi, n.bbox[axis + 3] ?? -Infinity)
    }
  }
  if (!(hi > lo)) {
    lo = -1
    hi = 1
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (!(e.ctrlKey || e.metaKey)) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) store.getState().undo()
      else if ((k === 'z' && e.shiftKey) || k === 'y') store.getState().redo()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [store])

  const lastPast = past.at(-1)
  const lastFuture = future.at(-1)
  // Outermost system (lowest layerOrder) that is loaded and still has visible, undissected roots.
  const dissected = new Set(scene.dissected)
  const outerLayer = [...index.bundle.systems]
    .sort((a, b) => a.layerOrder - b.layerOrder)
    .find((sys) => {
      const roots = index.systemRoots(sys.id)
      return roots.some((r) => !dissected.has(r.id) && index.isLoaded(r.id, scene)) && scene.systemVisibility[sys.id] !== false
    })

  const undoLabel = lastPast ? `Geri al: ${lastPast.label}` : 'Geri alınacak işlem yok'
  const redoLabel = lastFuture ? `Yinele: ${lastFuture.label}` : 'Yinelenecek işlem yok'

  return (
    <div className="scene-toolbar" role="toolbar" aria-label="Sahne araçları">
      <div className="tool-group">
        <button type="button" disabled={!past.length} title={undoLabel} aria-label={undoLabel} onClick={() => api.undo()}>
          ↶
        </button>
        <button type="button" disabled={!future.length} title={redoLabel} aria-label={redoLabel} onClick={() => api.redo()}>
          ↷
        </button>
        <button type="button" onClick={() => api.resetScene()}>
          Sıfırla
        </button>
      </div>

      <div className="tool-group" role="group" aria-label="Görünüm yönü">
        {CAMERA_PRESETS.map((p) => (
          <button key={p} type="button" disabled={!engine} onClick={() => engine?.setCameraPreset(p)}>
            {CAMERA_PRESET_LABEL[p]}
          </button>
        ))}
        <button type="button" disabled={!engine} onClick={() => engine?.resetCamera()}>
          Başlangıç
        </button>
      </div>

      {outerLayer && (
        <div className="tool-group">
          <button
            type="button"
            title="Deriden derine: en dıştaki görünür sistemi sanal diseksiyonla kaldırır (geri alınabilir)"
            onClick={() => api.dissect(index.systemRoots(outerLayer.id).map((r) => r.id))}
          >
            Dış katmanı kaldır: {outerLayer.name.tr}
          </button>
        </div>
      )}

      {(scene.isolated.length > 0 || scene.dissected.length > 0) && (
        <div className="tool-group">
          {scene.isolated.length > 0 && (
            <button type="button" onClick={() => api.clearIsolation()}>
              İzolasyonu kaldır
            </button>
          )}
          {scene.dissected.length > 0 && (
            <>
              <button type="button" onClick={() => api.restoreDissected(scene.dissected.slice(-1))}>
                Son kaldırılanı geri koy
              </button>
              <button type="button" onClick={() => api.restoreDissected()}>
                Tümünü geri koy ({scene.dissected.length})
              </button>
            </>
          )}
        </div>
      )}

      <fieldset className="tool-group">
        <legend>Kesit</legend>
        <label>
          <input type="checkbox" checked={scene.clip.enabled} onChange={(e) => api.setClip({ enabled: e.target.checked })} /> Açık
        </label>
        <select
          aria-label="Kesit düzlemi"
          value={scene.clip.plane}
          onChange={(e) => api.setClip({ plane: e.target.value as keyof typeof PLANE_LABEL })}
        >
          {(Object.keys(PLANE_LABEL) as (keyof typeof PLANE_LABEL)[]).map((p) => (
            <option key={p} value={p}>
              {PLANE_LABEL[p]}
            </option>
          ))}
        </select>
        <label>
          Konum
          <input
            type="range"
            min={lo}
            max={hi}
            step={(hi - lo) / 400}
            value={scene.clip.offset}
            disabled={!scene.clip.enabled}
            onChange={(e) => api.setClip({ offset: Number(e.target.value) })}
          />
        </label>
        <button
          type="button"
          disabled={!scene.clip.enabled}
          onClick={() => api.setClip({ keep: scene.clip.keep === 'positive' ? 'negative' : 'positive' })}
        >
          Tarafı çevir
        </button>
      </fieldset>

      <div className="tool-group">
        <label>
          Ayrıştır
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={scene.explode}
            onChange={(e) => api.setExplode(Number(e.target.value))}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={scene.labels.enabled}
            onChange={(e) => api.setLabels({ enabled: e.target.checked })}
          />{' '}
          Etiketler
        </label>
        <label>
          <span className="visually-hidden">Etiket yoğunluğu</span>
          <select
            aria-label="Etiket yoğunluğu"
            value={scene.labels.density}
            disabled={!scene.labels.enabled}
            onChange={(e) => api.setLabels({ density: e.target.value as typeof scene.labels.density })}
          >
            <option value="low">Az etiket</option>
            <option value="medium">Orta</option>
            <option value="high">Çok etiket</option>
          </select>
        </label>
      </div>

      <p className="visually-hidden" aria-live="polite">
        {lastAction ?? ''}
      </p>
    </div>
  )
}
