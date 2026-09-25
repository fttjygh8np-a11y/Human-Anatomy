/**
 * Application shell: loads the content bundle, opens local user data, builds the search
 * index and wires the 3D viewer, trees, info card, quiz and settings together.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ModelAsset } from '../core/schema.ts'
import { createContentIndex } from '../data/contentIndex.ts'
import { ContentLoadError, loadContentBundle } from '../data/loader.ts'
import type { ContentIndex } from '../data/types.ts'
import { createSearchService } from '../search/searchIndex.ts'
import { useSceneStore } from '../state/hooks.ts'
import { sceneStore } from '../state/sceneStore.ts'
import { InfoPanel } from '../ui/info/InfoPanel.tsx'
import { SearchBox } from '../ui/search/SearchBox.tsx'
import { ServicesContext, type Services } from '../ui/services.tsx'
import { isSystemOn } from '../ui/systems.ts'
import { SavedViews } from '../ui/views/SavedViews.tsx'
import { SceneToolbar } from '../ui/toolbar/SceneToolbar.tsx'
import { RegionTree, SystemTree } from '../ui/tree/StructureTree.tsx'
import '../ui/styles.css'
import { openUserDb, type LocalUserDataStore } from '../user/userDb.ts'
import { DEFAULT_SETTINGS, type UserSettings } from '../user/types.ts'
import type { ViewerEngine } from '../viewer/types.ts'
import { Deferred, LessonPanel, preloadViewer, QuizPanel, SettingsPanel, ViewerCanvas } from './lazy.tsx'
import { exposeEngine } from './testHook.ts'

type Load = { status: 'loading' } | { status: 'error'; message: string; retryable: boolean } | { status: 'ready'; index: ContentIndex }
type SideTab = 'explore' | 'lessons' | 'quiz' | 'settings'
type NavTab = 'systems' | 'regions'

const BASE = import.meta.env.BASE_URL
const assetUrl = (a: ModelAsset) => `${BASE}${a.file.replace(/^\//, '')}`

function usePrefersReducedMotion(): boolean {
  const q = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
  const [v, setV] = useState(q?.matches ?? false)
  useEffect(() => {
    if (!q) return
    const on = () => setV(q.matches)
    q.addEventListener('change', on)
    return () => q.removeEventListener('change', on)
  }, [q])
  return v
}

function Shell({ index }: { index: ContentIndex }) {
  const [user, setUser] = useState<LocalUserDataStore | null>(null)
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
  const [engine, setEngine] = useState<ViewerEngine | null>(null)
  const [side, setSide] = useState<SideTab>('explore')
  const [nav, setNav] = useState<NavTab>('systems')
  const [suppressNames, setSuppressNames] = useState(false)
  const scene = useSceneStore((s) => s.scene)
  const systemReduced = usePrefersReducedMotion()
  const search = useMemo(() => createSearchService(index), [index])
  const onEngine = useCallback((e: ViewerEngine | null) => {
    setEngine(e)
    exposeEngine(e, sceneStore)
  }, [])

  useEffect(() => {
    let alive = true
    openUserDb()
      .then(async (db) => {
        const s = await db.getSettings()
        if (!alive) return db.close()
        setUser(db)
        setSettings(s)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const updateSettings = useCallback(
    (patch: Partial<UserSettings>) => {
      setSettings((cur) => ({ ...cur, ...patch }))
      user?.setSettings(patch).catch(() => {})
    },
    [user],
  )

  // Theme and font scale.
  useEffect(() => {
    const root = document.documentElement
    if (settings.theme === 'system') delete root.dataset.theme
    else root.dataset.theme = settings.theme
    root.style.setProperty('--font-scale', String(settings.fontScale))
  }, [settings.theme, settings.fontScale])

  const reducedMotion = settings.reducedMotion === 'system' ? systemReduced : settings.reducedMotion === 'on'

  // Base models of the switched-on systems.
  // Body model: BodyParts3D (male, whole body) or HRA female reproductive organs. The HRA models
  // belong to another donor and are not registered to the BodyParts3D body, so they form a
  // separate view instead of being mixed into the male body.
  const [bodyModel, setBodyModel] = useState<'male' | 'female'>('male')
  // Phones/tablets: side panels can be folded away so the 3D area keeps its space.
  const [navOpen, setNavOpen] = useState(true)
  const [infoOpen, setInfoOpen] = useState(true)
  const hasFemaleModel = useMemo(() => index.bundle.assets.some((a) => !a.registeredToBody), [index])
  const assets = useMemo(
    () =>
      bodyModel === 'female'
        ? index.bundle.assets.filter((a) => !a.registeredToBody)
        : index.bundle.assets.filter((a) => a.registeredToBody && a.lod === 'base' && a.systems.some((s) => isSystemOn(scene, s))),
    [index, scene, bodyModel],
  )
  // After switching body models, frame the new content once its first model has loaded.
  useEffect(() => {
    if (!engine) return
    let done = false
    const off = engine.on((e) => {
      if (done || e.type !== 'asset-loaded') return
      done = true
      const id = sceneStore.getState().scene.selected.at(-1)
      if (id && index.hasModel(id)) engine.focusStructures([id])
      else engine.resetCamera()
    })
    return off
  }, [engine, bodyModel, index])

  // Selecting a structure that only exists in the other body model switches the view.
  useEffect(
    () =>
      sceneStore.subscribe((st, prev) => {
        const id = st.scene.selected.at(-1)
        if (!id || id === prev.scene.selected.at(-1)) return
        const nodeAssets = index.assetsFor(id).map((a) => index.getAsset(a))
        if (nodeAssets.length === 0) return
        if (nodeAssets.every((a) => a && !a.registeredToBody)) setBodyModel('female')
        else if (nodeAssets.every((a) => a && a.registeredToBody)) setBodyModel('male')
      }),
    [index],
  )

  const services: Services = useMemo(
    () => ({ index, store: sceneStore, search, user, engine, settings, updateSettings }),
    [index, search, user, engine, settings, updateSettings],
  )

  const quizMode = side === 'quiz'
  return (
    <ServicesContext.Provider value={services}>
      <a className="skip-link" href="#main-info">
        Bilgi paneline geç
      </a>
      <div className="app">
        <header className="app-header">
          <h1>Anatomi 3B</h1>
          <div className="mobile-only panel-toggles">
            <button type="button" aria-expanded={navOpen} aria-controls="main-nav" onClick={() => setNavOpen((x) => !x)}>
              Yapı ağacı
            </button>
            <button type="button" aria-expanded={infoOpen} aria-controls="main-info" onClick={() => setInfoOpen((x) => !x)}>
              Bilgi paneli
            </button>
          </div>
          <SearchBox />
          {hasFemaleModel && (
            <label className="model-switch">
              Model{' '}
              <select value={bodyModel} onChange={(e) => setBodyModel(e.target.value as 'male' | 'female')}>
                <option value="male">Tüm vücut (erkek, BodyParts3D)</option>
                <option value="female">Kadın üreme organları (HRA)</option>
              </select>
            </label>
          )}
          <nav className="tabs" aria-label="Kip">
            {(
              [
                ['explore', 'Keşfet'],
                ['lessons', 'Dersler'],
                ['quiz', 'Sınav'],
                ['settings', 'Ayarlar'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" aria-pressed={side === id} onClick={() => setSide(id)}>
                {label}
              </button>
            ))}
          </nav>
        </header>

        <aside className="app-nav" id="main-nav" data-collapsed={!navOpen} aria-label="Yapı ağacı">
          <div className="tabs" role="tablist" aria-label="Ağaç türü">
            <button type="button" role="tab" aria-selected={nav === 'systems'} onClick={() => setNav('systems')}>
              Sistemler
            </button>
            <button type="button" role="tab" aria-selected={nav === 'regions'} onClick={() => setNav('regions')}>
              Bölgeler
            </button>
          </div>
          {nav === 'systems' ? <SystemTree /> : <RegionTree />}
          <SavedViews />
        </aside>

        <main className="app-viewer">
          <SceneToolbar />
          {settings.textMode ? (
            <p className="muted" style={{ padding: 16 }}>
              Metin modu açık: yapıları ağaçtan ve aramadan inceleyebilirsiniz. 3B görünüm Ayarlar'dan açılabilir.
            </p>
          ) : (
            <div className="viewer-host">
              {index.bundle.assets.length === 0 && (
                <p className="muted" style={{ position: 'absolute', zIndex: 1, padding: 16 }}>
                  3B modeller henüz derlenmedi (npm run models:fetch ve models:build). Ağaç, bilgi kartı ve arama kullanılabilir.
                </p>
              )}
              <Deferred what="3B görüntüleyici">
                <ViewerCanvas
                  index={index}
                  store={sceneStore}
                  assetUrl={assetUrl}
                  labelFor={(id) => index.displayName(id, settings.nameLanguage)}
                  assets={assets}
                  suppressNames={suppressNames}
                  selectOnPick={!quizMode}
                  reducedMotion={reducedMotion}
                  quality={settings.quality === 'auto' ? undefined : settings.quality}
                  onEngine={onEngine}
                  style={{ position: 'absolute', inset: 0 }}
                />
              </Deferred>
            </div>
          )}
        </main>

        <aside className="app-info" id="main-info" data-collapsed={!infoOpen} aria-label="Ayrıntılar" tabIndex={-1}>
          {side === 'explore' && <InfoPanel />}
          {side === 'lessons' && (
            <Deferred what="Ders paneli">
              <LessonPanel />
            </Deferred>
          )}
          {side === 'quiz' && (
            <Deferred what="Sınav paneli">
              <QuizPanel onActiveChange={setSuppressNames} />
            </Deferred>
          )}
          {side === 'settings' && (
            <Deferred what="Ayarlar paneli">
              <SettingsPanel />
            </Deferred>
          )}
          {user && !user.persistent && (
            <p className="small muted">Yerel depolama kullanılamıyor; notlar ve ilerleme bu oturum kapanınca silinir.</p>
          )}
        </aside>
      </div>
    </ServicesContext.Provider>
  )
}

export function App() {
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    // Download the 3D viewer chunk in parallel with the content bundle.
    preloadViewer().catch(() => {})
    loadContentBundle(BASE)
      .then((bundle) => alive && setLoad({ status: 'ready', index: createContentIndex(bundle) }))
      .catch((e: unknown) => {
        if (!alive) return
        setLoad({
          status: 'error',
          message: e instanceof Error ? e.message : String(e),
          retryable: e instanceof ContentLoadError ? e.retryable : true,
        })
      })
    return () => {
      alive = false
    }
  }, [attempt])

  if (load.status === 'loading') {
    return (
      <p role="status" style={{ padding: 16 }}>
        Anatomi içeriği yükleniyor…
      </p>
    )
  }
  if (load.status === 'error') {
    return (
      <div role="alert" style={{ padding: 16, whiteSpace: 'pre-line' }}>
        <p>{load.message}</p>
        {load.retryable && (
          <button
            type="button"
            onClick={() => {
              setLoad({ status: 'loading' })
              setAttempt((n) => n + 1)
            }}
          >
            Yeniden dene
          </button>
        )}
      </div>
    )
  }
  return <Shell index={load.index} />
}
