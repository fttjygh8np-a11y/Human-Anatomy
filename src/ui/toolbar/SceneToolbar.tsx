/**
 * Scene controls: undo/redo (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z or Ctrl+Y), camera presets,
 * isolation/dissection restore, clipping plane, exploded view and labels.
 */
import { useEffect } from 'react'
import { CAMERA_PRESETS } from '../../core/schema.ts'
import { CAMERA_PRESET_LABEL } from '../../i18n/labels.ts'
import { Icon } from '../icons.tsx'
import { Popover } from '../Popover.tsx'
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

  const hasContext = scene.isolated.length > 0 || scene.dissected.length > 0

  return (
    <div className="scene-toolbar" role="toolbar" aria-label="Sahne araçları">
      {hasContext && (
        <div className="dock-context">
          {scene.isolated.length > 0 && (
            <button type="button" className="chip" onClick={() => api.clearIsolation()}>
              <Icon name="unlock" size={16} /> İzolasyonu kaldır
            </button>
          )}
          {scene.dissected.length > 0 && (
            <>
              <button type="button" className="chip" onClick={() => api.restoreDissected(scene.dissected.slice(-1))}>
                <Icon name="restore" size={16} /> Son kaldırılanı geri koy
              </button>
              <button type="button" className="chip" onClick={() => api.restoreDissected()}>
                Tümünü geri koy ({scene.dissected.length})
              </button>
            </>
          )}
        </div>
      )}

      <div className="dock">
        <div className="tool-group">
          <button type="button" className="dock-btn" disabled={!past.length} title={undoLabel} aria-label={undoLabel} onClick={() => api.undo()}>
            <Icon name="undo" />
            <span className="dock-label" aria-hidden="true">
              Geri al
            </span>
          </button>
          <button type="button" className="dock-btn" disabled={!future.length} title={redoLabel} aria-label={redoLabel} onClick={() => api.redo()}>
            <Icon name="redo" />
            <span className="dock-label" aria-hidden="true">
              Yinele
            </span>
          </button>
          <button type="button" className="dock-btn" title="Görünürlük, izolasyon, diseksiyon ve kesiti sıfırla" onClick={() => api.resetScene()}>
            <Icon name="reset" />
            <span className="dock-label">Sıfırla</span>
          </button>
        </div>

        <span className="dock-sep" aria-hidden="true" />

        <div className="tool-group">
          <Popover icon="camera" label="Görünüm" title="Görünüm yönü">
            <div className="preset-grid">
              {CAMERA_PRESETS.map((p) => (
                <button key={p} type="button" disabled={!engine} onClick={() => engine?.setCameraPreset(p)}>
                  {CAMERA_PRESET_LABEL[p]}
                </button>
              ))}
            </div>
            <button type="button" className="wide" disabled={!engine} onClick={() => engine?.resetCamera()}>
              <Icon name="home" size={16} /> Başlangıç
            </button>
          </Popover>

          {outerLayer && (
            <button
              type="button"
              className="dock-btn"
              title={`Deriden derine: en dıştaki görünür sistemi (${outerLayer.name.tr}) sanal diseksiyonla kaldırır (geri alınabilir)`}
              aria-label={`Dış katmanı kaldır: ${outerLayer.name.tr}`}
              onClick={() => api.dissect(index.systemRoots(outerLayer.id).map((r) => r.id))}
            >
              <Icon name="peel" />
              <span className="dock-label" aria-hidden="true">
                Katman kaldır
              </span>
            </button>
          )}

          <Popover icon="slice" label="Kesit" title="Kesit" active={scene.clip.enabled}>
            <label className="switch-row">
              <input type="checkbox" role="switch" checked={scene.clip.enabled} onChange={(e) => api.setClip({ enabled: e.target.checked })} /> Kesit
              açık
            </label>
            <label className="field">
              <span>Düzlem</span>
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
            </label>
            <label className="field">
              <span>Konum</span>
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
              className="wide"
              disabled={!scene.clip.enabled}
              onClick={() => api.setClip({ keep: scene.clip.keep === 'positive' ? 'negative' : 'positive' })}
            >
              <Icon name="flip" size={16} /> Tarafı çevir
            </button>
          </Popover>

          <Popover icon="tag" label="Etiket" title="Etiketler ve ayrıştırma" active={scene.explode > 0}>
            <label className="switch-row">
              <input
                type="checkbox"
                role="switch"
                checked={scene.labels.enabled}
                onChange={(e) => api.setLabels({ enabled: e.target.checked })}
              />{' '}
              Etiketler
            </label>
            <label className="field">
              <span>Yoğunluk</span>
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
            <label className="field">
              <span>
                <Icon name="explode" size={16} /> Ayrıştır
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={scene.explode}
                onChange={(e) => api.setExplode(Number(e.target.value))}
              />
            </label>
          </Popover>
        </div>
      </div>

      <p className="visually-hidden" aria-live="polite">
        {lastAction ?? ''}
      </p>
    </div>
  )
}
