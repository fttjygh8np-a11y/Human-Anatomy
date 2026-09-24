/**
 * Thin React wrapper around the imperative 3D engine (src/viewer/engine.ts).
 *
 * - Creates the engine once per (index, store), mounts it into an accessible
 *   `role="application"` region and disposes it on unmount.
 * - Forwards engine events through props; by default a pick selects in the scene store
 *   (disable with `selectOnPick={false}`, e.g. in quiz modes).
 * - Shows honest status: loading progress, load errors with retry, context loss,
 *   unsupported WebGL (pointing to the text-based tree/card alternative), and notices when
 *   the picture is modified (exploded view, surface clipping, schematic models).
 * - Orientation markers show which side of the SUBJECT faces each screen edge.
 */
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { useStore } from 'zustand'
import type { ModelAsset, StructureId } from '../../core/schema.ts'
import type { ContentIndex } from '../../data/types.ts'
import { CAMERA_PRESET_LABEL } from '../../i18n/labels.ts'
import type { SceneStoreApi } from '../../state/sceneStore.ts'
import { createViewerEngine } from '../../viewer/engine.ts'
import { KEYBOARD_HELP_TR } from '../../viewer/keyboard.ts'
import { oppositeDirection } from '../../viewer/math.ts'
import type { EngineDeps, EngineEvent, LoadProgress, QualityLevel, ScreenOrientation, ViewerEngine } from '../../viewer/types.ts'

type PickEvent = Extract<EngineEvent, { type: 'pick' }>
type Direction = ScreenOrientation['screenRight']

/** Direction words always refer to the subject (patient), never to the viewer. */
const DIRECTION_LABEL: Record<Direction, string> = {
  right: 'Sağ',
  left: 'Sol',
  anterior: 'Ön',
  posterior: 'Arka',
  superior: 'Üst',
  inferior: 'Alt',
}

export interface ViewerCanvasProps {
  index: ContentIndex
  store: SceneStoreApi
  /** Resolves an asset's file to a URL (handles the app base path). */
  assetUrl: (asset: ModelAsset) => string
  /** Localised structure name for labels; defaults to `index.displayName(id)`. */
  labelFor?: (id: StructureId) => string
  /** Assets to keep loaded (declarative). Assets loaded by this prop are unloaded when removed from it. */
  assets?: readonly ModelAsset[]
  /** Exam mode: no structure names in labels or announcements. */
  suppressNames?: boolean
  quality?: QualityLevel
  reducedMotion?: boolean
  /** Select picked structures in the scene store (default true). */
  selectOnPick?: boolean
  showOrientationMarkers?: boolean
  onEvent?: (e: EngineEvent) => void
  onPick?: (e: PickEvent) => void
  onHover?: (id: StructureId | null) => void
  /** Receives the engine after mount (and null before it is disposed) for imperative calls. */
  onEngine?: (engine: ViewerEngine | null) => void
  ariaLabel?: string
  className?: string
  style?: CSSProperties
  /** Engine constructor (tests / alternative engines). Read once per (index, store). */
  engineFactory?: (deps: EngineDeps) => ViewerEngine
}

interface AssetErrorState {
  assetId: string
  message: string
  retryable: boolean
}

const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

const panel: CSSProperties = {
  font: '13px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  color: 'var(--viewer-panel-fg, #1d2125)',
  background: 'var(--viewer-panel-bg, rgba(255,255,255,.92))',
  border: '1px solid var(--viewer-panel-border, rgba(0,0,0,.15))',
  borderRadius: 6,
  padding: '6px 10px',
  maxWidth: 'min(90%, 36rem)',
}

function labelOfAsset(index: ContentIndex, assets: readonly ModelAsset[] | undefined, id: string): string {
  return index.getAsset(id)?.label.tr ?? assets?.find((a) => a.id === id)?.label.tr ?? id
}

const markerBase: CSSProperties = {
  position: 'absolute',
  font: '600 12px/1 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  color: 'var(--viewer-marker-fg, #1d2125)',
  background: 'var(--viewer-marker-bg, rgba(255,255,255,.75))',
  borderRadius: 4,
  padding: '3px 6px',
  pointerEvents: 'none',
}

export function ViewerCanvas(props: ViewerCanvasProps) {
  const { index, store, assets, suppressNames = false, quality, reducedMotion, showOrientationMarkers = true } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<ViewerEngine | null>(null)
  const helpId = useId()
  const latest = useRef(props)
  useLayoutEffect(() => {
    latest.current = props
  })

  const [unsupported, setUnsupported] = useState<string | null>(null)
  const [contextLost, setContextLost] = useState(false)
  const [loading, setLoading] = useState<Record<string, LoadProgress>>({})
  const [errors, setErrors] = useState<AssetErrorState[]>([])
  const [orientation, setOrientation] = useState<ScreenOrientation | null>(null)
  const [announcement, setAnnouncement] = useState('')

  const labels = useStore(store, (s) => s.scene.labels)
  const explode = useStore(store, (s) => s.scene.explode)
  const clipEnabled = useStore(store, (s) => s.scene.clip.enabled)
  const loadedAssets = useStore(store, (s) => s.scene.loadedAssets)

  // ----- engine lifecycle -----------------------------------------------------------
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const assetLabel = (id: string) => labelOfAsset(index, latest.current.assets, id)
    const engine = (latest.current.engineFactory ?? createViewerEngine)({
      index,
      store,
      assetUrl: (a) => latest.current.assetUrl(a),
      labelFor: (id) => (latest.current.labelFor ? latest.current.labelFor(id) : index.displayName(id)),
    })
    let lastPreset: string | null = null
    const off = engine.on((e) => {
      const p = latest.current
      p.onEvent?.(e)
      switch (e.type) {
        case 'pick': {
          p.onPick?.(e)
          if (p.selectOnPick ?? true) {
            const st = store.getState()
            if (e.structureId) st.select([e.structureId], { additive: e.additive })
            else if (!e.additive) st.clearSelection()
          }
          if (e.structureId) {
            const name = p.labelFor ? p.labelFor(e.structureId) : index.displayName(e.structureId)
            setAnnouncement(p.suppressNames ? 'Bir yapı seçildi.' : `Seçildi: ${name}`)
          }
          break
        }
        case 'hover':
          p.onHover?.(e.structureId)
          break
        case 'asset-loading':
          setLoading((cur) => ({ ...cur, [e.progress.assetId]: e.progress }))
          if (e.progress.loaded === 0) setAnnouncement(`Model yükleniyor: ${assetLabel(e.progress.assetId)}`)
          break
        case 'asset-loaded':
          setLoading(({ [e.assetId]: _done, ...rest }) => rest)
          setErrors((cur) => cur.filter((x) => x.assetId !== e.assetId))
          setAnnouncement(`Model yüklendi: ${assetLabel(e.assetId)}`)
          break
        case 'asset-error':
          setLoading(({ [e.assetId]: _failed, ...rest }) => rest)
          setErrors((cur) => [...cur.filter((x) => x.assetId !== e.assetId), { assetId: e.assetId, message: e.error, retryable: e.retryable }])
          setAnnouncement(`Model yüklenemedi: ${assetLabel(e.assetId)}`)
          break
        case 'context-lost':
          setContextLost(true)
          setAnnouncement('Grafik bağlamı kaybedildi.')
          break
        case 'context-restored':
          setContextLost(false)
          setAnnouncement('Grafik bağlamı geri yüklendi.')
          break
        case 'unsupported':
          setUnsupported(e.reason)
          break
        case 'orientation':
          setOrientation(e.orientation)
          if (lastPreset !== null && lastPreset !== e.orientation.nearestPreset) {
            setAnnouncement(`Görünüm: ${CAMERA_PRESET_LABEL[e.orientation.nearestPreset]}`)
          }
          lastPreset = e.orientation.nearestPreset
          break
        case 'first-frame':
          break
      }
    })
    engine.mount(el)
    engineRef.current = engine
    latest.current.onEngine?.(engine)
    return () => {
      latest.current.onEngine?.(null)
      off()
      engineRef.current = null
      engine.dispose()
    }
  }, [index, store])

  // ----- prop → engine synchronisation --------------------------------------------------
  useEffect(() => {
    engineRef.current?.setLabelOptions({ enabled: labels.enabled, density: labels.density, suppressNames })
  }, [index, store, labels.enabled, labels.density, suppressNames])

  useEffect(() => {
    if (quality) engineRef.current?.setQuality(quality)
  }, [index, store, quality])

  useEffect(() => {
    if (reducedMotion !== undefined) engineRef.current?.setReducedMotion(reducedMotion)
  }, [index, store, reducedMotion])

  const propLoaded = useRef(new Set<string>())
  useEffect(() => {
    const engine = engineRef.current
    if (!engine || !assets) return
    const wanted = new Set(assets.map((a) => a.id))
    for (const id of propLoaded.current) {
      if (!wanted.has(id)) {
        engine.unloadAsset(id)
        propLoaded.current.delete(id)
      }
    }
    for (const a of assets) {
      propLoaded.current.add(a.id)
      // Failures are reported through 'asset-error' events (shown below with a retry button).
      engine.loadAsset(a).catch(() => {})
    }
  }, [index, store, assets])

  const retry = (assetId: string) => {
    const asset = index.getAsset(assetId) ?? assets?.find((a) => a.id === assetId)
    if (!asset) return
    setErrors((cur) => cur.filter((x) => x.assetId !== assetId))
    engineRef.current?.loadAsset(asset).catch(() => {})
  }

  // ----- derived notices -------------------------------------------------------------------
  const representationOf = (id: string) => index.getAsset(id)?.representation ?? assets?.find((a) => a.id === id)?.representation
  const schematicLoaded = loadedAssets.some((id) => representationOf(id) === 'schematic')
  const notices: string[] = []
  if (schematicLoaded) notices.push('Şematik model: basit geometrik şekillerdir, anatomik değildir.')
  if (explode > 0) notices.push('Ayrıştırılmış görünüm: yapılar gerçek konumlarında gösterilmiyor.')
  if (clipEnabled) notices.push('Kesit: yüzey modeli kırpıldı; BT veya MR görüntüsü değildir, kesit yüzeyi iç yapı içermez.')

  const loadingList = Object.values(loading)

  return (
    <div className={props.className} style={{ position: 'relative', width: '100%', height: '100%', minHeight: 200, ...props.style }}>
      <div
        ref={containerRef}
        role="application"
        aria-roledescription="3B model görüntüleyici"
        aria-label={props.ariaLabel ?? '3B anatomi modeli'}
        aria-describedby={helpId}
        tabIndex={0}
        style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
      />
      <p id={helpId} style={visuallyHidden}>
        {KEYBOARD_HELP_TR} Yapılara metin üzerinden ulaşmak için sistem ve bölge ağaçlarını kullanabilirsiniz.
      </p>
      <div role="status" aria-live="polite" aria-atomic="true" style={visuallyHidden}>
        {announcement}
      </div>

      {showOrientationMarkers && orientation && !unsupported && (
        <div aria-hidden="true" data-viewer-orientation="">
          <span style={{ ...markerBase, top: '50%', right: 6, transform: 'translateY(-50%)' }} title="Hastanın bu tarafı ekranın sağında">
            {DIRECTION_LABEL[orientation.screenRight]}
          </span>
          <span style={{ ...markerBase, top: '50%', left: 6, transform: 'translateY(-50%)' }}>
            {DIRECTION_LABEL[oppositeDirection(orientation.screenRight)]}
          </span>
          <span style={{ ...markerBase, top: 6, left: '50%', transform: 'translateX(-50%)' }}>{DIRECTION_LABEL[orientation.screenUp]}</span>
          <span style={{ ...markerBase, bottom: 6, left: '50%', transform: 'translateX(-50%)' }}>
            {DIRECTION_LABEL[oppositeDirection(orientation.screenUp)]}
          </span>
        </div>
      )}

      {notices.length > 0 && !unsupported && (
        <ul role="note" aria-label="Görünüm uyarıları" style={{ ...panel, position: 'absolute', left: 8, bottom: 32, margin: 0, paddingLeft: 24 }}>
          {notices.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      {loadingList.length > 0 && (
        <div style={{ ...panel, position: 'absolute', left: 8, top: 8 }}>
          {loadingList.map((p) => {
            const label = labelOfAsset(index, assets, p.assetId)
            return (
              <div key={p.assetId}>
                <span>Yükleniyor: {label} </span>
                {p.total ? (
                  <progress max={p.total} value={p.loaded} aria-label={`${label} yükleme durumu`} />
                ) : (
                  <progress aria-label={`${label} yükleme durumu`} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {(errors.length > 0 || contextLost || unsupported) && (
        <div role="alert" style={{ ...panel, position: 'absolute', left: '50%', top: 8, transform: 'translateX(-50%)' }}>
          {unsupported && (
            <p style={{ margin: 0 }}>
              {unsupported} Yapılara sistem ve bölge ağaçları ile bilgi kartları üzerinden metin olarak ulaşabilirsiniz.
            </p>
          )}
          {contextLost && <p style={{ margin: 0 }}>Grafik bağlamı kaybedildi. Tarayıcı bağlamı geri yüklemeye çalışıyor…</p>}
          {errors.map((err) => (
            <p key={err.assetId} style={{ margin: 0 }}>
              {labelOfAsset(index, assets, err.assetId)}: {err.message}{' '}
              {err.retryable && (
                <button type="button" onClick={() => retry(err.assetId)}>
                  Yeniden dene
                </button>
              )}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
