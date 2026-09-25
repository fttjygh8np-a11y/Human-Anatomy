/**
 * Imperative Three.js engine implementing `ViewerEngine` (see ./types.ts).
 *
 * - WebGL2 only (emits 'unsupported' otherwise); handles context loss/restore.
 * - One entry per catalogue node (`asset.nodes[].node`), looked up by glTF node name; each
 *   node gets its own material so visibility / ghosting / highlight are per structure.
 * - Subscribes to the scene store and renders `resolveVisibility` results; never writes
 *   scene state except `loadedAssets` (merged: the engine adds/removes only its own ids).
 * - Renders on demand (store change, camera change, animation), not in a continuous loop.
 *
 * Coordinates are the app frame `anat-gltf-v1` (+X subject's left, +Y superior, +Z anterior).
 */
import {
  ACESFilmicToneMapping,
  AlwaysStencilFunc,
  BackSide,
  Box3,
  BufferGeometry,
  Color,
  DecrementWrapStencilOp,
  DirectionalLight,
  DoubleSide,
  FrontSide,
  Group,
  HemisphereLight,
  IncrementWrapStencilOp,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NotEqualStencilFunc,
  Object3D,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  PMREMGenerator,
  PropertyBinding,
  Quaternion,
  Raycaster,
  ReplaceStencilOp,
  Scene,
  Texture,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Intersection,
  type Side,
} from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh'

import type { AssetNode, CameraPreset, CameraState, ClipState, ModelAsset, SceneState, StructureId, Vec3 } from '../core/schema.ts'
import { resolveVisibility, type EffectiveVisibility, type VisibilityGraph } from '../state/visibility.ts'
import { AssetLoadError, describeLoadError, fetchAssetBuffer, isAbortError, resourcePathOf, verifySha256 } from './fetchAsset.ts'
import { keyAction } from './keyboard.ts'
import { LabelOverlay } from './labelOverlay.ts'
import { chooseLabelCandidates, layoutLabels, LABEL_DENSITY_COUNT, type LabelBox, type LabelCandidate } from './labels.ts'
import {
  bboxCenter,
  bboxRadius,
  clamp,
  clipPlaneFromState,
  easeInOutCubic,
  explodeOffset,
  fitDistance,
  interpolateOrbit,
  isClick,
  nearFarFor,
  presetCameraPlacement,
  sameOrientation,
  screenOrientation,
  summarizeFrameTimes,
  type Bbox,
  type OrbitPose,
  type PointerSample,
} from './math.ts'
import {
  CAP_COLOR,
  DEFAULT_BASE_COLOR,
  computeNodeStyle,
  jitterColor,
  pickHighlight,
  styleKey,
  type NodeStyle,
} from './styles.ts'
import type {
  BenchmarkResult,
  EngineDeps,
  EngineEvent,
  EngineStats,
  HighlightStyle,
  LabelOptions,
  QualityLevel,
  ScreenOrientation,
  ViewerEngine,
} from './types.ts'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Opaque anatomy + lights. */
const LAYER_MAIN = 0
/** Opaque solids that feed the clipping-cap stencil. */
const LAYER_STENCIL = 1
const LAYER_CAP = 2
/** Transparent (ghost / reduced-opacity) anatomy, drawn after the cap. */
const LAYER_TRANSPARENT = 3

const DEFAULT_FOV = 35
const TWEEN_MS = 650
const OCCLUSION_REFRESH_MS = 150

export const QUALITY_SETTINGS: Record<QualityLevel, { maxPixelRatio: number; antialias: boolean }> = {
  low: { maxPixelRatio: 1, antialias: false },
  medium: { maxPixelRatio: 1.5, antialias: true },
  high: { maxPixelRatio: 2, antialias: true },
}

export const UNSUPPORTED_MESSAGE =
  'Bu tarayıcı veya grafik sürücüsü WebGL 2 desteklemiyor ya da donanım hızlandırması kapalı. 3B görünüm açılamıyor.'

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface Anchor {
  mesh: Mesh
  local: Vector3
}

interface NodeEntry {
  key: string
  assetId: string
  node: string
  structureId: StructureId
  meshes: Mesh[]
  basePositions: Vector3[]
  material: MeshStandardMaterial
  /** Base (non-exploded) world centroid and bbox. */
  centroid: Vector3
  baseBox: Box3
  size: number
  offset: Vector3
  vis: EffectiveVisibility
  style: NodeStyle
  appliedKey: string
  anchor?: Anchor | null
  clipAnchor?: { key: string; anchor: Anchor | null }
}

interface LoadedAsset {
  asset: ModelAsset
  root: Group
  entries: NodeEntry[]
  geometries: Set<BufferGeometry>
  /** Asset not present in the content bundle (e.g. dev fixture). */
  foreign: boolean
}

interface Tween {
  from: OrbitPose & { fov: number }
  to: OrbitPose & { fov: number }
  start: number | null
  duration: number
}

const nodeKey = (assetId: string, node: string) => `${assetId}\u0000${node}`
const v3 = (v: Vector3): Vec3 => [v.x, v.y, v.z]
const box3ToBbox = (b: Box3): Bbox => ({ min: v3(b.min), max: v3(b.max) })
const HIDDEN_VIS: EffectiveVisibility = { mode: 'absent', opacity: 0, reason: 'not_loaded' }

function abortError(): DOMException {
  return new DOMException('Yükleme iptal edildi.', 'AbortError')
}

function disposeMaterial(m: Material): void {
  for (const value of Object.values(m)) {
    if (value instanceof Texture) value.dispose()
  }
  m.dispose()
}

/** Meshes belonging to one glTF node: the node itself and descendants that are not other named nodes. */
function collectNodeMeshes(obj: Object3D): Mesh[] {
  const out: Mesh[] = []
  const visit = (o: Object3D, isRoot: boolean) => {
    if (!isRoot && typeof o.userData.name === 'string') return
    if ((o as Mesh).isMesh) out.push(o as Mesh)
    for (const c of o.children) visit(c, false)
  }
  visit(obj, true)
  return out
}

function heapBytes(): number | null {
  const mem = (performance as Performance & { memory?: { usedJSHeapSize?: number } }).memory
  return typeof mem?.usedJSHeapSize === 'number' ? mem.usedJSHeapSize : null
}

function prefersReducedMotion(): boolean {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/** Per-node render state, for tests and diagnostics (not part of the UI contract). */
export interface EngineDebugNode {
  assetId: string
  node: string
  structureId: StructureId
  visible: boolean
  opacity: number
  transparent: boolean
  selectable: boolean
  ghost: boolean
  /** sRGB hex of the emissive tint (#000000 when none). */
  emissive: string
  emissiveIntensity: number
  /** Material currently clipped by the section plane. */
  clipped: boolean
  /** Exploded-view translation currently applied (metres). */
  offset: Vec3
}

export interface ViewerEngineWithDebug extends ViewerEngine {
  debugNodes(): EngineDebugNode[]
}

export function createViewerEngine(deps: EngineDeps): ViewerEngineWithDebug {
  const { index, store } = deps

  // ----- state ------------------------------------------------------------
  let phase: 'created' | 'mounted' | 'unsupported' | 'disposed' = 'created'
  const listeners = new Set<(e: EngineEvent) => void>()
  // A function (not an inline comparison) so TS does not keep a stale narrowing across awaits.
  const isDisposed = () => phase === 'disposed'

  const scene = new Scene()
  const content = new Group()
  content.name = 'anatomy'
  scene.add(content)

  const camera = new PerspectiveCamera(DEFAULT_FOV, 1, 0.01, 100)
  camera.position.set(0, 0, 3)
  camera.up.set(0, 1, 0)
  const target = new Vector3()
  camera.lookAt(target)
  scene.add(camera)

  // Lighting ("studio"): soft hemisphere fill, a key light and a rim light that follow the
  // camera so every view is lit and silhouettes stay readable against the dark background.
  // A pre-filtered room environment (see setupEnvironment) adds soft reflections.
  const hemi = new HemisphereLight(0xf2f6ff, 0x3a3530, 0.75)
  hemi.layers.enable(LAYER_TRANSPARENT)
  scene.add(hemi)
  const headlight = new DirectionalLight(0xfff6ec, 1.9)
  headlight.layers.enable(LAYER_TRANSPARENT)
  headlight.position.set(0.45, 0.7, 1)
  camera.add(headlight)
  camera.add(headlight.target)
  headlight.target.position.set(0, 0, -1)
  const rimLight = new DirectionalLight(0xbfdcff, 1.35)
  rimLight.layers.enable(LAYER_TRANSPARENT)
  rimLight.position.set(-0.6, 0.5, -3)
  camera.add(rimLight)
  camera.add(rimLight.target)
  rimLight.target.position.set(0, 0, -1)
  let envTexture: Texture | null = null

  // Clipping + stencil cap resources.
  const clipPlane = new Plane(new Vector3(1, 0, 0), 0)
  const clipPlanes = [clipPlane]
  let clipOn = false
  let capOn = false
  let clipKey = ''
  const stencilBack = new MeshBasicMaterial({
    side: BackSide,
    colorWrite: false,
    depthWrite: false,
    depthTest: false,
    stencilWrite: true,
    stencilFunc: AlwaysStencilFunc,
    stencilFail: IncrementWrapStencilOp,
    stencilZFail: IncrementWrapStencilOp,
    stencilZPass: IncrementWrapStencilOp,
  })
  stencilBack.clippingPlanes = clipPlanes
  const stencilFront = stencilBack.clone()
  stencilFront.side = FrontSide
  stencilFront.stencilFail = DecrementWrapStencilOp
  stencilFront.stencilZFail = DecrementWrapStencilOp
  stencilFront.stencilZPass = DecrementWrapStencilOp
  stencilFront.clippingPlanes = clipPlanes
  const capMaterial = new MeshBasicMaterial({
    color: new Color(CAP_COLOR),
    side: DoubleSide,
    stencilWrite: true,
    stencilRef: 0,
    stencilFunc: NotEqualStencilFunc,
    stencilFail: ReplaceStencilOp,
    stencilZFail: ReplaceStencilOp,
    stencilZPass: ReplaceStencilOp,
  })
  const capGeometry = new PlaneGeometry(1, 1)
  const capMesh = new Mesh(capGeometry, capMaterial)
  capMesh.name = 'clip-cap'
  capMesh.layers.set(LAYER_CAP)
  capMesh.visible = false
  capMesh.renderOrder = 10
  capMesh.raycast = () => {}
  scene.add(capMesh)

  // Content registry.
  const assets = new Map<string, LoadedAsset>()
  const pending = new Map<string, { controller: AbortController; promise: Promise<void> }>()
  const entryByKey = new Map<string, NodeEntry>()
  const ownEntries = new Map<StructureId, NodeEntry[]>()
  const meshToEntry = new WeakMap<Object3D, NodeEntry>()
  const foreignStructures = new Set<StructureId>()
  const replaced = new Set<NodeEntry>()
  const disposedGeometries = new WeakSet<BufferGeometry>()
  let allEntries: NodeEntry[] = []
  let pickables: Mesh[] = []
  let solids: Mesh[] = []
  let contentBox: Box3 | null = null
  let contentRadius = 1

  const systemColors = new Map(index.bundle.systems.map((s) => [s.id as string, s.color]))

  // Presentation state.
  const highlightSets = new Map<HighlightStyle, Set<StructureId>>()
  let hoveredStructure: StructureId | null = null
  let labelOpts: LabelOptions = { ...store.getState().scene.labels, suppressNames: false }
  let quality: QualityLevel = 'medium'
  let reducedMotion = prefersReducedMotion()
  let explodeFactor = 0

  // Rendering.
  let renderer: WebGLRenderer | null = null
  let rendererAntialias = false
  let canvas: HTMLCanvasElement | null = null
  let container: HTMLElement | null = null
  let controls: OrbitControls | null = null
  let overlay: LabelOverlay | null = null
  let resizeObserver: ResizeObserver | null = null
  let windowResizeBound = false
  let contextLost = false
  let rafId = 0
  let frameRequested = false
  let settleTimer: ReturnType<typeof setTimeout> | null = null
  let tween: Tween | null = null
  let cameraInitialized = false
  // Until the user or a caller moves the camera, every newly loaded model reframes the whole
  // content (so the first view shows the full body, not just the first model that arrived).
  let autoFrame = true
  let firstFrameEmitted = false
  let lastOrientation: ScreenOrientation | null = null
  let benchmarkActive = false
  let lastFrameMs = 0
  let lastDrawCalls = 0
  let lastTriangles = 0
  const frameStamps: number[] = []

  // Labels.
  let labelCandidates: LabelCandidate[] = []
  let labelsDirty = true
  const labelText = new Map<StructureId, string>()
  const occlusion = new Map<StructureId, boolean>()
  let occlusionAt = -Infinity

  // Picking.
  const raycaster = new Raycaster()
  raycaster.layers.enable(LAYER_TRANSPARENT)
  const ndc = new Vector2()
  const downs = new Map<number, PointerSample>()
  let multiTouch = false
  let hoverPos: { x: number; y: number } | null = null
  let hoverRaf = 0

  // BVH construction queue (time-sliced so large assets do not block input).
  const bvhQueue: BufferGeometry[] = []
  let bvhTimer: ReturnType<typeof setTimeout> | null = null

  let loader: GLTFLoader | null = null
  const getLoader = () => {
    if (!loader) {
      loader = new GLTFLoader()
      loader.setMeshoptDecoder(MeshoptDecoder)
    }
    return loader
  }

  // ----- events ------------------------------------------------------------
  function emit(e: EngineEvent): void {
    for (const l of [...listeners]) {
      try {
        l(e)
      } catch (err) {
        console.error('[viewer] event listener failed', err)
      }
    }
  }

  // ----- visibility graph (index + assets outside the content bundle) --------
  const graph: VisibilityGraph = {
    ancestorsOf: (id) => index.ancestorsOf(id),
    primarySystemOf: (id) => index.primarySystemOf(id),
    hasModel: (id) => foreignStructures.has(id) || index.hasModel(id),
    isLoaded: (id, s) => foreignStructures.has(id) || index.isLoaded(id, s),
  }

  /** Loaded entries representing a structure (its own nodes and all part-of descendants). */
  function entriesFor(id: StructureId): NodeEntry[] {
    const out = new Set<NodeEntry>()
    for (const ref of index.nodesFor(id)) {
      const e = entryByKey.get(nodeKey(ref.assetId, ref.node))
      if (e) out.add(e)
    }
    for (const e of ownEntries.get(id) ?? []) out.add(e)
    return [...out]
  }

  const currentScene = (): SceneState => store.getState().scene

  // ----- styles --------------------------------------------------------------
  function sideFor(style: NodeStyle): Side {
    return clipOn && !capOn && !style.ghost ? DoubleSide : FrontSide
  }

  function applyEntryStyle(e: NodeEntry, force: boolean): void {
    const s = e.style
    const side = sideFor(s)
    const key = `${styleKey(s)}|${clipOn ? clipKey : '-'}|${side}`
    if (!force && key === e.appliedKey) return
    e.appliedKey = key
    const m = e.material
    let needsUpdate = false
    if (m.transparent !== s.transparent) {
      m.transparent = s.transparent
      needsUpdate = true
    }
    m.opacity = s.opacity
    m.depthWrite = s.depthWrite
    m.emissive.set(s.emissive)
    m.emissiveIntensity = s.emissiveIntensity
    const planes = clipOn ? clipPlanes : null
    if ((m.clippingPlanes?.length ?? 0) !== (planes?.length ?? 0)) needsUpdate = true
    m.clippingPlanes = planes
    if (m.side !== side) {
      m.side = side
      needsUpdate = true
    }
    if (needsUpdate) m.needsUpdate = true
    for (const mesh of e.meshes) {
      mesh.visible = s.visible
      mesh.renderOrder = s.transparent ? 1 : 0
      mesh.layers.disableAll()
      mesh.layers.enable(s.transparent ? LAYER_TRANSPARENT : LAYER_MAIN)
      if (s.solid) mesh.layers.enable(LAYER_STENCIL)
    }
  }

  /** Recompute visibility (optional) and styles of every entry, then apply the changed ones. */
  function refresh(opts: { visibility: boolean; force?: boolean }): void {
    const s = currentScene()
    if (opts.visibility) {
      for (const e of allEntries) e.vis = resolveVisibility(e.structureId, s, graph)
    }
    const selected = new Set<NodeEntry>()
    for (const id of s.selected) for (const e of entriesFor(id)) selected.add(e)
    const highlights = new Map<NodeEntry, HighlightStyle[]>()
    for (const [style, ids] of highlightSets) {
      for (const id of ids) {
        for (const e of entriesFor(id)) {
          const list = highlights.get(e)
          if (list) list.push(style)
          else highlights.set(e, [style])
        }
      }
    }
    const nextPickables: Mesh[] = []
    const nextSolids: Mesh[] = []
    for (const e of allEntries) {
      e.style = computeNodeStyle({
        vis: e.vis,
        replaced: replaced.has(e),
        selected: selected.has(e),
        hovered: hoveredStructure !== null && e.structureId === hoveredStructure,
        highlight: pickHighlight(highlights.get(e) ?? []),
      })
      applyEntryStyle(e, opts.force ?? false)
      if (e.style.selectable) nextPickables.push(...e.meshes)
      if (e.style.solid) nextSolids.push(...e.meshes)
    }
    pickables = nextPickables
    solids = nextSolids
    labelsDirty = true
    requestRender()
  }

  // ----- content bookkeeping -------------------------------------------------
  function rebuildRegistry(): void {
    allEntries = [...assets.values()].flatMap((a) => a.entries)
    entryByKey.clear()
    ownEntries.clear()
    foreignStructures.clear()
    for (const a of assets.values()) {
      for (const e of a.entries) {
        entryByKey.set(e.key, e)
        const list = ownEntries.get(e.structureId)
        if (list) list.push(e)
        else ownEntries.set(e.structureId, [e])
        if (a.foreign) foreignStructures.add(e.structureId)
      }
    }
    // Detail models replace base nodes of the same structures; unregistered detail models are shown alone.
    replaced.clear()
    const exclusive = [...assets.values()].filter((a) => a.asset.lod === 'detail' && !a.asset.registeredToBody)
    if (exclusive.length > 0) {
      const keep = new Set(exclusive.map((a) => a.asset.id))
      for (const e of allEntries) if (!keep.has(e.assetId)) replaced.add(e)
    } else {
      for (const a of assets.values()) {
        if (a.asset.lod !== 'detail' || !a.asset.detailFor) continue
        const base = assets.get(a.asset.detailFor)
        if (!base) continue
        const detail = new Set(a.entries.map((e) => e.structureId))
        const detailAncestors = new Set([...detail].flatMap((id) => index.ancestorsOf(id)))
        for (const e of base.entries) {
          if (detail.has(e.structureId) || detailAncestors.has(e.structureId) || index.ancestorsOf(e.structureId).some((x) => detail.has(x))) {
            replaced.add(e)
          }
        }
      }
    }
    // Content bounds (base positions) for explode centre, framing and clipping cap.
    contentBox = null
    for (const e of allEntries) {
      if (!contentBox) contentBox = e.baseBox.clone()
      else contentBox.union(e.baseBox)
    }
    contentRadius = contentBox ? Math.max(bboxRadius(box3ToBbox(contentBox)), 0.01) : 1
    if (controls) controls.maxDistance = Math.max(10, contentRadius * 12)
    labelText.clear()
    occlusion.clear()
  }

  function syncStoreLoaded(assetId: string, present: boolean): void {
    const st = store.getState()
    const cur = st.scene.loadedAssets
    const has = cur.includes(assetId)
    if (present && !has) st.setLoadedAssets([...cur, assetId])
    else if (!present && has) st.setLoadedAssets(cur.filter((x) => x !== assetId))
  }

  function scheduleBvh(geoms: Iterable<BufferGeometry>): void {
    for (const g of geoms) bvhQueue.push(g)
    if (bvhTimer === null && bvhQueue.length > 0) bvhTimer = setTimeout(processBvh, 0)
  }

  function processBvh(): void {
    bvhTimer = null
    const t0 = performance.now()
    while (bvhQueue.length > 0 && performance.now() - t0 < 12) {
      const g = bvhQueue.shift()!
      if (disposedGeometries.has(g) || g.boundsTree) continue
      try {
        g.boundsTree = new MeshBVH(g, { indirect: !g.index })
      } catch (err) {
        console.warn('[viewer] BVH could not be built; falling back to plain raycast', err)
      }
    }
    if (bvhQueue.length > 0 && phase !== 'disposed') bvhTimer = setTimeout(processBvh, 16)
  }

  function buildLoadedAsset(asset: ModelAsset, gltf: GLTF): LoadedAsset {
    const root = new Group()
    root.name = asset.id
    gltf.scene.updateMatrixWorld(true)

    // Original resources (all replaced by our own materials; unused geometry is disposed).
    const originalGeometries = new Set<BufferGeometry>()
    const originalMaterials = new Set<Material>()
    const byName = new Map<string, Object3D>()
    gltf.scene.traverse((o) => {
      const name = o.userData.name
      if (typeof name === 'string' && !byName.has(name)) byName.set(name, o)
      const mesh = o as Mesh
      if (mesh.isMesh) {
        originalGeometries.add(mesh.geometry)
        for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) originalMaterials.add(m)
      }
    })

    const foreign = !index.getAsset(asset.id)
    const kept = new Set<Mesh>()
    const found: Array<{ node: AssetNode; structureId: StructureId; meshes: Mesh[] }> = []
    const missing: string[] = []
    for (const n of asset.nodes) {
      const obj = byName.get(n.node) ?? gltf.scene.getObjectByName(PropertyBinding.sanitizeNodeName(n.node))
      const meshes = obj ? collectNodeMeshes(obj).filter((m) => !kept.has(m)) : []
      if (meshes.length === 0) {
        missing.push(n.node)
        continue
      }
      for (const m of meshes) kept.add(m)
      found.push({ node: n, structureId: index.structureForNode(asset.id, n.node) ?? n.structureId, meshes })
    }
    if (found.length === 0) {
      for (const m of originalMaterials) disposeMaterial(m)
      for (const g of originalGeometries) g.dispose()
      throw new AssetLoadError('Model dosyasında katalogda listelenen düğümlerin hiçbiri bulunamadı.', false)
    }
    if (missing.length > 0) {
      console.warn(`[viewer] ${asset.id}: ${missing.length} catalogue node(s) missing in GLB`, missing.slice(0, 20))
    }

    // Re-parent kept meshes directly under the asset root, preserving world transforms,
    // so explode offsets can be applied as plain position changes in world space.
    root.updateMatrixWorld(true)
    for (const m of kept) root.attach(m)
    for (const m of kept) for (const c of [...m.children]) if (!kept.has(c as Mesh)) m.remove(c)
    root.updateMatrixWorld(true)

    const geometries = new Set<BufferGeometry>()
    const entries: NodeEntry[] = []
    for (const f of found) {
      const key = nodeKey(asset.id, f.node.node)
      const system = index.primarySystemOf(f.structureId) ?? asset.systems[0]
      const baseHex = (system && systemColors.get(system)) || DEFAULT_BASE_COLOR
      const material = new MeshStandardMaterial({
        color: new Color(jitterColor(baseHex, key)),
        roughness: 0.55,
        metalness: 0,
      })
      material.name = f.node.node
      const baseBox = new Box3()
      for (const mesh of f.meshes) {
        mesh.material = material
        mesh.castShadow = false
        mesh.receiveShadow = false
        mesh.raycast = acceleratedRaycast
        if (!mesh.geometry.getAttribute('normal')) mesh.geometry.computeVertexNormals()
        mesh.geometry.computeBoundingBox()
        geometries.add(mesh.geometry)
        baseBox.union(mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld))
      }
      const c = f.node.centroid
      const centroid = c.every(Number.isFinite) ? new Vector3(c[0], c[1], c[2]) : baseBox.getCenter(new Vector3())
      const entry: NodeEntry = {
        key,
        assetId: asset.id,
        node: f.node.node,
        structureId: f.structureId,
        meshes: f.meshes,
        basePositions: f.meshes.map((m) => m.position.clone()),
        material,
        centroid,
        baseBox,
        size: baseBox.getSize(new Vector3()).length(),
        offset: new Vector3(),
        vis: HIDDEN_VIS,
        style: computeNodeStyle({ vis: HIDDEN_VIS, replaced: false, selected: false, hovered: false, highlight: null }),
        appliedKey: '',
      }
      for (const mesh of f.meshes) meshToEntry.set(mesh, entry)
      entries.push(entry)
    }

    for (const m of originalMaterials) disposeMaterial(m)
    for (const g of originalGeometries) if (!geometries.has(g)) g.dispose()

    return { asset, root, entries, geometries, foreign }
  }

  function disposeLoadedAsset(la: LoadedAsset): void {
    content.remove(la.root)
    for (const e of la.entries) {
      e.material.dispose()
      for (const m of e.meshes) meshToEntry.delete(m)
    }
    for (const g of la.geometries) {
      disposedGeometries.add(g)
      g.boundsTree = undefined
      g.dispose()
    }
  }

  // ----- explode / clip --------------------------------------------------------
  function applyExplode(): void {
    const center = contentBox ? contentBox.getCenter(new Vector3()) : new Vector3()
    const c = v3(center)
    for (const e of allEntries) {
      const off = explodeOffset(v3(e.centroid), c, explodeFactor)
      e.offset.set(off[0], off[1], off[2])
      e.meshes.forEach((m, i) => {
        m.position.copy(e.basePositions[i]!).add(e.offset)
      })
    }
    content.updateMatrixWorld(true)
    occlusion.clear()
    updateCap()
    requestRender()
  }

  function currentContentBox(): Box3 | null {
    let box: Box3 | null = null
    for (const e of allEntries) {
      const b = e.baseBox.clone().translate(e.offset)
      if (!box) box = b
      else box.union(b)
    }
    return box
  }

  function applyClip(clip: ClipState): void {
    clipOn = clip.enabled
    capOn = clip.enabled && clip.showCap
    const eq = clipPlaneFromState(clip)
    clipPlane.normal.set(eq.normal[0], eq.normal[1], eq.normal[2])
    clipPlane.constant = eq.constant
    clipKey = `${clip.plane}|${clip.keep}|${clip.offset}`
    occlusion.clear()
    updateCap()
  }

  function updateCap(): void {
    const box = capOn ? currentContentBox() : null
    if (!box) {
      capMesh.visible = false
      return
    }
    const center = box.getCenter(new Vector3())
    const size = box.getSize(new Vector3()).length() * 2 + 0.01
    const onPlane = center.clone().sub(clipPlane.normal.clone().multiplyScalar(clipPlane.distanceToPoint(center)))
    capMesh.position.copy(onPlane)
    capMesh.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), clipPlane.normal))
    capMesh.scale.set(size, size, 1)
    capMesh.updateMatrixWorld(true)
    capMesh.visible = true
  }

  // ----- camera -------------------------------------------------------------------
  const currentPose = (): OrbitPose & { fov: number } => ({
    position: v3(camera.position),
    target: v3(target),
    fov: camera.fov,
  })

  function applyPose(p: OrbitPose, fov?: number): void {
    camera.position.set(p.position[0], p.position[1], p.position[2])
    target.set(p.target[0], p.target[1], p.target[2])
    camera.up.set(0, 1, 0)
    if (fov !== undefined && fov !== camera.fov) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
    camera.lookAt(target)
    camera.updateMatrixWorld()
    controls?.update()
    onCameraChanged()
  }

  function moveCamera(to: OrbitPose, opts?: { animate?: boolean; fov?: number; auto?: boolean }): void {
    cameraInitialized = true
    if (!opts?.auto) autoFrame = false
    const fov = opts?.fov ?? camera.fov
    const animate = (opts?.animate ?? true) && !reducedMotion && phase === 'mounted' && !benchmarkActive
    if (!animate) {
      tween = null
      applyPose(to, fov)
      return
    }
    tween = { from: currentPose(), to: { ...to, fov }, start: null, duration: TWEEN_MS }
    requestRender()
  }

  /** Advances the camera animation; returns true while it is still running. */
  function stepTween(now: number): boolean {
    if (!tween) return false
    if (tween.start === null) tween.start = now
    const t = clamp((now - tween.start) / tween.duration, 0, 1)
    const e = easeInOutCubic(t)
    const pose = interpolateOrbit(tween.from, tween.to, e)
    const fov = tween.from.fov + (tween.to.fov - tween.from.fov) * e
    const done = t >= 1
    if (done) tween = null
    applyPose(pose, fov)
    return !done
  }

  function onCameraChanged(): void {
    const dist = camera.position.distanceTo(target)
    const { near, far } = nearFarFor(dist, contentRadius)
    if (Math.abs(camera.near - near) > near * 0.05 || Math.abs(camera.far - far) > far * 0.05) {
      camera.near = near
      camera.far = far
      camera.updateProjectionMatrix()
    }
    // Refresh label occlusion once the camera settles.
    if (settleTimer !== null) clearTimeout(settleTimer)
    settleTimer = setTimeout(() => {
      settleTimer = null
      occlusionAt = -Infinity
      requestRender()
    }, OCCLUSION_REFRESH_MS + 30)
    requestRender()
  }

  function frameBox(box: Box3 | null, direction: Vec3 | null, animate: boolean | undefined): void {
    const bbox = box ? box3ToBbox(box) : null
    const center: Vec3 = bbox ? bboxCenter(bbox) : [0, 0, 0]
    const radius = bbox ? Math.max(bboxRadius(bbox), 0.005) : 1
    const dist = fitDistance(radius, camera.fov, camera.aspect || 1)
    let dir = direction
    if (!dir) {
      const d = camera.position.clone().sub(target)
      dir = d.lengthSq() > 0 ? v3(d.normalize()) : [0, 0, 1]
    }
    moveCamera({ target: center, position: [center[0] + dir[0] * dist, center[1] + dir[1] * dist, center[2] + dir[2] * dist] }, { animate })
  }

  function resetCamera(opts?: { animate?: boolean; auto?: boolean }): void {
    const box = currentContentBox()
    const bbox = box ? box3ToBbox(box) : null
    const center: Vec3 = bbox ? bboxCenter(bbox) : [0, 0, 0]
    const radius = bbox ? Math.max(bboxRadius(bbox), 0.005) : 1
    const dist = fitDistance(radius, camera.fov, camera.aspect || 1)
    const place = presetCameraPlacement('anterior', center, dist)
    moveCamera({ target: center, position: place.position }, { animate: opts?.animate, fov: DEFAULT_FOV, auto: opts?.auto })
  }

  function setCameraPreset(preset: CameraPreset, opts?: { animate?: boolean }): void {
    const dist = Math.max(camera.position.distanceTo(target), 1e-3)
    const place = presetCameraPlacement(preset, v3(target), dist)
    moveCamera({ target: v3(target), position: place.position }, opts)
  }

  function focusStructures(ids: StructureId[], opts?: { animate?: boolean }): void {
    const entries = ids.flatMap((id) => entriesFor(id))
    const shown = entries.filter((e) => e.style.visible)
    const use = shown.length > 0 ? shown : entries
    if (use.length === 0) return
    const box = new Box3()
    for (const e of use) box.union(e.baseBox.clone().translate(e.offset))
    frameBox(box, null, opts?.animate)
  }

  function getCameraState(): CameraState {
    return { position: v3(camera.position), target: v3(target), up: v3(camera.up), fov: camera.fov }
  }

  function setCameraState(state: CameraState, opts?: { animate?: boolean }): void {
    // The orbit axis is fixed to superior (+Y); `state.up` is informational.
    moveCamera({ position: [...state.position], target: [...state.target] }, { animate: opts?.animate, fov: state.fov ?? camera.fov })
  }

  // ----- picking --------------------------------------------------------------------
  function entryOf(o: Object3D): NodeEntry | undefined {
    return meshToEntry.get(o)
  }

  interface Hit {
    entry: NodeEntry
    point: Vector3
  }

  /** Raycast with the current `raycaster` ray against selectable meshes; clipped parts are ignored. */
  function castPick(candidates: Mesh[]): Hit | null {
    if (candidates.length === 0) return null
    const hits: Intersection[] = []
    if (clipOn) {
      // Cut solids expose their inside (cap or back faces): test both sides, keep only the kept half.
      const sides = new Map<Material, Side>()
      for (const m of candidates) {
        const mat = m.material as Material
        if (!sides.has(mat)) sides.set(mat, mat.side)
        mat.side = DoubleSide
      }
      raycaster.firstHitOnly = false
      try {
        raycaster.intersectObjects(candidates, false, hits)
      } finally {
        for (const [mat, side] of sides) mat.side = side
      }
    } else {
      raycaster.firstHitOnly = true
      raycaster.intersectObjects(candidates, false, hits)
    }
    let ghostHit: Hit | null = null
    for (const h of hits) {
      if (clipOn && clipPlane.distanceToPoint(h.point) < -1e-6) continue
      const entry = entryOf(h.object)
      if (!entry || !entry.style.selectable) continue
      let point = h.point
      if (clipOn && h.face) {
        const n = h.face.normal.clone().transformDirection(h.object.matrixWorld)
        if (n.dot(raycaster.ray.direction) > 0) {
          // Back face seen through the cut: the visible surface is the cap on the plane.
          const onPlane = raycaster.ray.intersectPlane(clipPlane, new Vector3())
          if (onPlane) point = onPlane
        }
      }
      if (!entry.style.ghost) return { entry, point }
      if (!ghostHit) ghostHit = { entry, point }
    }
    return ghostHit
  }

  function setRayFromClient(clientX: number, clientY: number): boolean {
    if (!canvas) return false
    const rect = canvas.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return false
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
    camera.updateMatrixWorld()
    raycaster.setFromCamera(ndc, camera)
    raycaster.near = 0
    raycaster.far = Infinity
    return true
  }

  function raycastAt(clientX: number, clientY: number): Hit | null {
    if (!setRayFromClient(clientX, clientY)) return null
    return castPick(pickables)
  }

  function setHovered(id: StructureId | null): void {
    if (id === hoveredStructure) return
    hoveredStructure = id
    if (canvas) canvas.style.cursor = id ? 'pointer' : ''
    refresh({ visibility: false })
    emit({ type: 'hover', structureId: id })
  }

  // ----- DOM event handlers ------------------------------------------------------------
  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    downs.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() })
    if (downs.size > 1) multiTouch = true
  }
  const onPointerUp = (e: PointerEvent) => {
    const d = downs.get(e.pointerId)
    downs.delete(e.pointerId)
    const wasMulti = multiTouch
    if (downs.size === 0) multiTouch = false
    if (!d || wasMulti || benchmarkActive) return
    if (!isClick(d, { x: e.clientX, y: e.clientY, t: performance.now() })) return
    const hit = raycastAt(e.clientX, e.clientY)
    emit({
      type: 'pick',
      structureId: hit ? hit.entry.structureId : null,
      additive: e.shiftKey,
      point: hit ? v3(hit.point) : null,
    })
  }
  const onPointerCancel = (e: PointerEvent) => {
    downs.delete(e.pointerId)
    if (downs.size === 0) multiTouch = false
  }
  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.buttons !== 0 || benchmarkActive) return
    hoverPos = { x: e.clientX, y: e.clientY }
    if (hoverRaf === 0) {
      hoverRaf = requestAnimationFrame(() => {
        hoverRaf = 0
        if (!hoverPos || phase !== 'mounted') return
        const hit = raycastAt(hoverPos.x, hoverPos.y)
        setHovered(hit ? hit.entry.structureId : null)
      })
    }
  }
  const onPointerLeave = () => {
    hoverPos = null
    setHovered(null)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.target !== container && e.target !== canvas) return
    const action = keyAction(e)
    if (!action || !controls) return
    e.preventDefault()
    tween = null
    cameraInitialized = true
    autoFrame = false
    switch (action.type) {
      case 'rotate':
        if (action.azimuth) controls.rotateLeft(action.azimuth)
        if (action.polar) controls.rotateUp(action.polar)
        break
      case 'pan':
        controls.pan(action.dx, action.dy)
        break
      case 'zoom':
        if (action.factor > 1) controls.dollyIn(action.factor)
        else controls.dollyOut(1 / action.factor)
        break
      case 'preset':
        setCameraPreset(action.preset)
        break
      case 'reset':
        resetCamera()
        break
      case 'clear-selection':
        emit({ type: 'pick', structureId: null, additive: false, point: null })
        break
    }
  }

  const onContextLost = (e: Event) => {
    e.preventDefault()
    contextLost = true
    if (rafId) cancelAnimationFrame(rafId)
    rafId = 0
    frameRequested = false
    emit({ type: 'context-lost' })
  }
  const onContextRestored = () => {
    contextLost = false
    if (renderer) setupEnvironment(renderer)
    // Three.js re-initialises its GL state; force every material to be re-applied.
    for (const e of allEntries) e.appliedKey = ''
    refresh({ visibility: false, force: true })
    emit({ type: 'context-restored' })
    requestRender()
  }

  const onControlsStart = () => {
    tween = null
    cameraInitialized = true
    autoFrame = false
  }
  const onControlsChange = () => onCameraChanged()

  function resize(): void {
    if (!container || !renderer) return
    const w = container.clientWidth
    const h = container.clientHeight
    if (w <= 0 || h <= 0) return
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, QUALITY_SETTINGS[quality].maxPixelRatio))
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    requestRender()
  }

  // ----- renderer lifecycle -------------------------------------------------------------
  function createRenderer(antialias: boolean): WebGLRenderer | string {
    const c = document.createElement('canvas')
    let gl: WebGL2RenderingContext | null
    try {
      gl = c.getContext('webgl2', {
        antialias,
        alpha: true,
        stencil: true,
        depth: true,
        premultipliedAlpha: true,
        powerPreference: 'high-performance',
      })
    } catch {
      gl = null
    }
    if (!gl) return UNSUPPORTED_MESSAGE
    try {
      const r = new WebGLRenderer({ canvas: c, context: gl, antialias, alpha: true, stencil: true })
      r.autoClear = false
      r.info.autoReset = false
      r.localClippingEnabled = true
      r.shadowMap.enabled = false
      r.setClearColor(0x000000, 0)
      r.toneMapping = ACESFilmicToneMapping
      r.toneMappingExposure = 1.05
      return r
    } catch (err) {
      return `Grafik bağlamı başlatılamadı: ${err instanceof Error ? err.message : String(err)}`
    }
  }

  function attachCanvas(r: WebGLRenderer, host: HTMLElement, before: Node | null): void {
    const c = r.domElement
    c.style.cssText = 'display:block;width:100%;height:100%;touch-action:none'
    c.setAttribute('aria-hidden', 'true')
    c.dataset.viewerCanvas = ''
    host.insertBefore(c, before)
    c.addEventListener('webglcontextlost', onContextLost, false)
    c.addEventListener('webglcontextrestored', onContextRestored, false)
    c.addEventListener('pointerdown', onPointerDown)
    c.addEventListener('pointerup', onPointerUp)
    c.addEventListener('pointercancel', onPointerCancel)
    c.addEventListener('pointermove', onPointerMove)
    c.addEventListener('pointerleave', onPointerLeave)
    canvas = c
    renderer = r
    rendererAntialias = r.getContextAttributes()?.antialias ?? false
    setupEnvironment(r)
  }

  /** Soft studio reflections from a pre-filtered procedural room (no external files; skipped on low quality). */
  function setupEnvironment(r: WebGLRenderer): void {
    envTexture?.dispose()
    envTexture = null
    scene.environment = null
    // Low quality (weak GPUs): lights only; the image-based reflections cost fill rate.
    if (quality === 'low') return
    try {
      const pmrem = new PMREMGenerator(r)
      const room = new RoomEnvironment()
      envTexture = pmrem.fromScene(room, 0.04).texture
      room.dispose()
      pmrem.dispose()
      scene.environment = envTexture
      scene.environmentIntensity = 0.45
    } catch {
      // Reflections are decorative; the lights alone still light every view.
      envTexture = null
    }
  }

  function detachCanvas(dispose: boolean): void {
    const c = canvas
    const r = renderer
    if (!c || !r) return
    c.removeEventListener('webglcontextlost', onContextLost, false)
    c.removeEventListener('webglcontextrestored', onContextRestored, false)
    c.removeEventListener('pointerdown', onPointerDown)
    c.removeEventListener('pointerup', onPointerUp)
    c.removeEventListener('pointercancel', onPointerCancel)
    c.removeEventListener('pointermove', onPointerMove)
    c.removeEventListener('pointerleave', onPointerLeave)
    if (dispose) {
      envTexture?.dispose()
      envTexture = null
      scene.environment = null
      r.dispose()
      r.forceContextLoss()
      c.remove()
    }
    canvas = null
    renderer = null
  }

  /** Antialiasing is a context attribute: switching it requires a new context. */
  function replaceRenderer(antialias: boolean): void {
    if (!container || !canvas) return
    const next = createRenderer(antialias)
    if (typeof next === 'string') return // keep the current renderer
    const before = canvas.nextSibling
    const host = container
    controls?.disconnect()
    detachCanvas(true)
    attachCanvas(next, host, before)
    controls?.connect(next.domElement)
    for (const e of allEntries) e.appliedKey = ''
    refresh({ visibility: false, force: true })
    resize()
  }

  // ----- rendering -------------------------------------------------------------------------
  function requestRender(): void {
    if (frameRequested || phase !== 'mounted' || contextLost || benchmarkActive) return
    frameRequested = true
    rafId = requestAnimationFrame(frame)
  }

  function frame(now: number): void {
    frameRequested = false
    rafId = 0
    if (phase !== 'mounted' || contextLost || benchmarkActive) return
    const animating = stepTween(now)
    renderFrame(now)
    if (animating) requestRender()
  }

  function renderFrame(now: number): void {
    const r = renderer
    if (!r || contextLost) return
    const t0 = performance.now()
    camera.updateMatrixWorld()
    r.info.reset()
    r.clear(true, true, true)
    if (capOn && capMesh.visible && solids.length > 0) {
      // 1) opaque anatomy, 2) stencil parity of cut solids, 3) flat cap where the stencil is set,
      // 4) transparent anatomy last so ghosts in front of the cut still blend over the cap.
      camera.layers.set(LAYER_MAIN)
      r.render(scene, camera)
      camera.layers.set(LAYER_STENCIL)
      scene.overrideMaterial = stencilBack
      r.render(scene, camera)
      scene.overrideMaterial = stencilFront
      r.render(scene, camera)
      scene.overrideMaterial = null
      camera.layers.set(LAYER_CAP)
      r.render(scene, camera)
      camera.layers.set(LAYER_TRANSPARENT)
      r.render(scene, camera)
    } else {
      camera.layers.set(LAYER_MAIN)
      camera.layers.enable(LAYER_TRANSPARENT)
      r.render(scene, camera)
    }
    camera.layers.set(LAYER_MAIN)
    lastDrawCalls = r.info.render.calls
    lastTriangles = r.info.render.triangles
    lastFrameMs = performance.now() - t0
    frameStamps.push(now)
    while (frameStamps.length > 0 && now - frameStamps[0]! > 1000) frameStamps.shift()

    updateLabels(now)
    emitOrientation()
    if (!firstFrameEmitted && allEntries.some((e) => e.style.visible)) {
      firstFrameEmitted = true
      // Milliseconds since navigation start (performance time origin).
      emit({ type: 'first-frame', ms: performance.now() })
    }
  }

  function emitOrientation(): void {
    const el = camera.matrixWorld.elements
    const o = screenOrientation({
      right: [el[0]!, el[1]!, el[2]!],
      up: [el[4]!, el[5]!, el[6]!],
      back: [el[8]!, el[9]!, el[10]!],
    })
    if (sameOrientation(lastOrientation, o)) return
    lastOrientation = o
    emit({ type: 'orientation', orientation: o })
  }

  // ----- labels -----------------------------------------------------------------------------
  function largestMesh(e: NodeEntry): Mesh {
    let best = e.meshes[0]!
    for (const m of e.meshes) if (m.geometry.getAttribute('position').count > best.geometry.getAttribute('position').count) best = m
    return best
  }

  /**
   * Label / projection anchor: the vertex nearest to the node centroid (on the surface, unlike
   * a concave structure's centroid), nudged slightly into the solid so that it projects inside
   * the silhouette (a box corner would sit exactly on the outline and miss picking).
   */
  function nearestVertexAnchor(e: NodeEntry, keep?: (world: Vector3) => boolean): Anchor | null {
    const mesh = largestMesh(e)
    mesh.updateMatrixWorld()
    const localCentroid = mesh.worldToLocal(e.centroid.clone().add(e.offset))
    const geom = mesh.geometry
    const pos = geom.getAttribute('position')
    const v = new Vector3()
    const w = new Vector3()
    let best = -1
    let bestD = Infinity
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      if (keep) {
        w.copy(v).applyMatrix4(mesh.matrixWorld)
        if (!keep(w)) continue
      }
      const d = v.distanceToSquared(localCentroid)
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    if (best < 0) return null
    const vertex = new Vector3().fromBufferAttribute(pos, best)
    const toCentroid = localCentroid.clone().sub(vertex)
    const dist = toCentroid.length()
    const normalAttr = geom.getAttribute('normal')
    let local = vertex.clone()
    if (dist > 1e-9) {
      const n = normalAttr ? new Vector3().fromBufferAttribute(normalAttr, best).normalize() : null
      if (!n || toCentroid.dot(n) < 0) {
        // Centroid lies inward of the surface here: step a little toward it.
        local = vertex.clone().addScaledVector(toCentroid, 0.1)
      } else {
        // Centroid outside the material (concave or hollow shape): step against the normal.
        if (!geom.boundingBox) geom.computeBoundingBox()
        const localSize = geom.boundingBox!.getSize(new Vector3()).length()
        local = vertex.clone().addScaledVector(n, -Math.min(0.1 * dist, 0.01 * localSize))
      }
      if (keep && !keep(w.copy(local).applyMatrix4(mesh.matrixWorld))) local = vertex
    }
    return { mesh, local }
  }

  function entryAnchorWorld(e: NodeEntry): Vector3 | null {
    if (e.anchor === undefined) e.anchor = nearestVertexAnchor(e)
    let a = e.anchor
    if (!a) return null
    let world = a.local.clone().applyMatrix4(a.mesh.matrixWorld)
    if (clipOn && clipPlane.distanceToPoint(world) < 0) {
      const key = `${clipKey}|${explodeFactor}`
      if (e.clipAnchor?.key !== key) {
        e.clipAnchor = { key, anchor: nearestVertexAnchor(e, (p) => clipPlane.distanceToPoint(p) >= 0) }
      }
      a = e.clipAnchor.anchor
      if (!a) return null
      world = a.local.clone().applyMatrix4(a.mesh.matrixWorld)
    }
    return world
  }

  function structureAnchor(id: StructureId): { world: Vector3; entries: NodeEntry[] } | null {
    const entries = entriesFor(id).filter((e) => e.style.visible)
    if (entries.length === 0) return null
    let best = entries[0]!
    for (const e of entries) if (e.size > best.size) best = e
    const world = entryAnchorWorld(best)
    return world ? { world, entries } : null
  }

  /** Projects to canvas CSS pixels; null if behind the camera or outside the viewport. */
  function projectToCanvas(world: Vector3): { x: number; y: number } | null {
    if (!canvas) return null
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (w <= 0 || h <= 0) return null
    const p = world.clone().project(camera)
    if (p.z < -1 || p.z > 1 || p.x < -1 || p.x > 1 || p.y < -1 || p.y > 1) return null
    return { x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h }
  }

  function isOccluded(own: NodeEntry[], world: Vector3): boolean {
    const origin = camera.position
    const dir = world.clone().sub(origin)
    const dist = dir.length()
    if (dist <= 0) return false
    raycaster.set(origin, dir.divideScalar(dist))
    raycaster.near = 0
    raycaster.far = Math.max(0, dist - (dist * 0.002 + 1e-4))
    raycaster.firstHitOnly = true
    const hits = raycaster.intersectObjects(solids, false)
    raycaster.far = Infinity
    const mine = new Set(own)
    for (const h of hits) {
      if (clipOn && clipPlane.distanceToPoint(h.point) < 0) continue
      const e = entryOf(h.object)
      if (!e || mine.has(e)) continue
      return true
    }
    return false
  }

  function textFor(id: StructureId): string {
    let t = labelText.get(id)
    if (t === undefined) {
      t = deps.labelFor(id)
      labelText.set(id, t)
    }
    return t
  }

  function updateLabels(now: number): void {
    if (!overlay || !canvas) return
    if (!labelOpts.enabled || labelOpts.suppressNames) {
      overlay.clear()
      return
    }
    const s = currentScene()
    if (labelsDirty) {
      labelsDirty = false
      const visible = new Map<StructureId, number>()
      for (const e of allEntries) {
        if (!e.style.visible || e.style.ghost) continue
        visible.set(e.structureId, Math.max(visible.get(e.structureId) ?? 0, e.size))
      }
      const emphasized = [...(highlightSets.get('relation') ?? []), ...(highlightSets.get('lesson') ?? [])]
      // Quiz targets (and the parts that represent them) never get automatic name labels.
      const exclude = new Set<StructureId>()
      for (const id of highlightSets.get('quiz_target') ?? []) {
        exclude.add(id)
        for (const e of entriesFor(id)) exclude.add(e.structureId)
      }
      labelCandidates = chooseLabelCandidates({
        options: labelOpts,
        selected: s.selected,
        emphasized,
        visible: [...visible].map(([id, size]) => ({ id, size })),
        exclude,
      })
      occlusionAt = -Infinity
    }
    const refreshOcclusion = now - occlusionAt > OCCLUSION_REFRESH_MS
    if (refreshOcclusion) {
      occlusionAt = now
      occlusion.clear()
    }
    const boxes: LabelBox[] = []
    for (const c of labelCandidates) {
      const a = structureAnchor(c.id)
      if (!a) continue
      const px = projectToCanvas(a.world)
      if (!px) continue
      if (c.kind === 'context') {
        let occ = occlusion.get(c.id)
        if (occ === undefined) {
          occ = isOccluded(a.entries, a.world)
          occlusion.set(c.id, occ)
        }
        if (occ) continue
      }
      const size = overlay.measure(c.id, textFor(c.id), c.kind)
      boxes.push({ id: c.id, kind: c.kind, x: px.x, y: px.y, w: size.w, h: size.h })
    }
    const placed = layoutLabels(boxes, { width: canvas.clientWidth, height: canvas.clientHeight }, LABEL_DENSITY_COUNT[labelOpts.density])
    overlay.render(placed)
  }

  // ----- store subscription -------------------------------------------------------------------
  const sameClip = (a: ClipState, b: ClipState) =>
    a.enabled === b.enabled && a.plane === b.plane && a.offset === b.offset && a.keep === b.keep && a.showCap === b.showCap
  const sameCamera = (a: CameraState | undefined, b: CameraState | undefined) => JSON.stringify(a) === JSON.stringify(b)

  function onSceneChange(next: SceneState, prev: SceneState): void {
    if (!sameClip(next.clip, prev.clip)) applyClip(next.clip)
    if (next.explode !== explodeFactor) {
      explodeFactor = next.explode
      applyExplode()
    }
    if (next.labels.enabled !== prev.labels.enabled || next.labels.density !== prev.labels.density) {
      labelOpts = { ...labelOpts, enabled: next.labels.enabled, density: next.labels.density }
    }
    if (next.camera && !sameCamera(next.camera, prev.camera)) setCameraState(next.camera, { animate: true })
    refresh({ visibility: true })
  }

  const unsubscribe = store.subscribe((state, prev) => {
    if (phase === 'disposed' || state.scene === prev.scene) return
    onSceneChange(state.scene, prev.scene)
  })

  // Initial scene state.
  {
    const s = currentScene()
    applyClip(s.clip)
    explodeFactor = s.explode
    if (s.camera) setCameraState(s.camera, { animate: false })
  }

  // ----- loading ------------------------------------------------------------------------------
  async function doLoad(asset: ModelAsset, controller: AbortController): Promise<void> {
    const t0 = performance.now()
    const url = deps.assetUrl(asset)
    const total0 = asset.bytes > 0 ? asset.bytes : null
    emit({ type: 'asset-loading', progress: { assetId: asset.id, loaded: 0, total: total0 } })
    let lastEmit = 0
    try {
      const buffer = await fetchAssetBuffer(url, {
        signal: controller.signal,
        expectedBytes: asset.bytes,
        onProgress: (loaded, total) => {
          const now = performance.now()
          if (now - lastEmit < 100 && !(total !== null && loaded >= total)) return
          lastEmit = now
          emit({ type: 'asset-loading', progress: { assetId: asset.id, loaded, total } })
        },
      })
      if (asset.sha256) await verifySha256(buffer, asset.sha256)
      if (controller.signal.aborted || isDisposed()) throw abortError()
      let gltf: GLTF
      try {
        gltf = await getLoader().parseAsync(buffer, resourcePathOf(url))
      } catch (err) {
        throw new AssetLoadError(`Model dosyası çözümlenemedi: ${err instanceof Error ? err.message : String(err)}`, false)
      }
      if (controller.signal.aborted || isDisposed()) {
        gltf.scene.traverse((o) => {
          const m = o as Mesh
          if (m.isMesh) {
            m.geometry.dispose()
            for (const mat of Array.isArray(m.material) ? m.material : [m.material]) disposeMaterial(mat)
          }
        })
        throw abortError()
      }
      const loaded = buildLoadedAsset(asset, gltf)
      assets.set(asset.id, loaded)
      content.add(loaded.root)
      rebuildRegistry()
      applyExplode()
      syncStoreLoaded(asset.id, true)
      refresh({ visibility: true })
      scheduleBvh(loaded.geometries)
      if (!cameraInitialized || autoFrame) resetCamera({ animate: false, auto: true })
      requestRender()
      emit({ type: 'asset-loaded', assetId: asset.id, ms: performance.now() - t0 })
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) throw abortError()
      const { message, retryable } = describeLoadError(err)
      emit({ type: 'asset-error', assetId: asset.id, error: message, retryable })
      throw err instanceof AssetLoadError ? err : new AssetLoadError(message, retryable)
    }
  }

  function loadAsset(asset: ModelAsset): Promise<void> {
    if (phase === 'disposed') return Promise.reject(new Error('Görüntüleyici kapatıldı.'))
    if (phase === 'unsupported') return Promise.reject(new Error(UNSUPPORTED_MESSAGE))
    if (assets.has(asset.id)) return Promise.resolve()
    const existing = pending.get(asset.id)
    if (existing) return existing.promise
    const controller = new AbortController()
    const promise = doLoad(asset, controller).finally(() => {
      if (pending.get(asset.id)?.controller === controller) pending.delete(asset.id)
    })
    pending.set(asset.id, { controller, promise })
    return promise
  }

  function unloadAsset(assetId: string): void {
    const p = pending.get(assetId)
    if (p) {
      p.controller.abort()
      pending.delete(assetId)
    }
    const la = assets.get(assetId)
    if (!la) return
    assets.delete(assetId)
    const hoveredGone = hoveredStructure !== null && la.entries.some((e) => e.structureId === hoveredStructure)
    disposeLoadedAsset(la)
    rebuildRegistry()
    applyExplode()
    syncStoreLoaded(assetId, false)
    if (hoveredGone) setHovered(null)
    refresh({ visibility: true })
  }

  // ----- benchmark --------------------------------------------------------------------------------
  function runOrbitBenchmark(durationMs: number): Promise<BenchmarkResult> {
    if (phase !== 'mounted' || !renderer) return Promise.reject(new Error('Görüntüleyici hazır değil.'))
    if (benchmarkActive) return Promise.reject(new Error('Ölçüm zaten çalışıyor.'))
    const duration = Math.max(100, durationMs)
    const saved = currentPose()
    const savedFov = camera.fov
    tween = null
    benchmarkActive = true
    if (rafId) cancelAnimationFrame(rafId)
    rafId = 0
    frameRequested = false
    if (controls) controls.enabled = false
    const center = target.clone()
    const offset = camera.position.clone().sub(center)
    const axis = new Vector3(0, 1, 0)
    const intervals: number[] = []
    let frames = 0
    let start: number | null = null
    let last: number | null = null

    return new Promise<BenchmarkResult>((resolve) => {
      let finished = false
      const finish = () => {
        if (finished) return
        finished = true
        clearTimeout(safety)
        if (rafId) cancelAnimationFrame(rafId)
        rafId = 0
        benchmarkActive = false
        if (controls) controls.enabled = true
        if (phase !== 'disposed') applyPose(saved, savedFov)
        const summary = summarizeFrameTimes(intervals)
        resolve({
          durationMs: start !== null && last !== null ? last - start : 0,
          frames,
          fps: summary.fps,
          frameMsP50: summary.p50,
          frameMsP95: summary.p95,
          frameMsMax: summary.max,
          drawCalls: lastDrawCalls,
          triangles: lastTriangles,
          jsHeapBytes: heapBytes(),
        })
        requestRender()
      }
      // Background tabs pause rAF; never hang forever.
      const safety = setTimeout(finish, duration + 5000)
      const step = (now: number) => {
        rafId = 0
        if (phase !== 'mounted') return finish()
        if (start === null) start = now
        const t = Math.min(1, (now - start) / duration)
        const p = offset.clone().applyAxisAngle(axis, t * Math.PI * 2).add(center)
        camera.position.copy(p)
        camera.lookAt(center)
        camera.updateMatrixWorld()
        if (!contextLost) {
          renderFrame(now)
          frames++
          if (last !== null) intervals.push(now - last)
          last = now
        }
        if (now - start >= duration) return finish()
        rafId = requestAnimationFrame(step)
      }
      rafId = requestAnimationFrame(step)
    })
  }

  // ----- public API ---------------------------------------------------------------------------------
  const engine: ViewerEngineWithDebug = {
    mount(el: HTMLElement): void {
      if (phase === 'disposed') throw new Error('Görüntüleyici kapatıldı.')
      if (container === el) return
      if (phase === 'unsupported') return
      if (container && canvas) {
        // Move to a new container without recreating GPU resources.
        container.removeEventListener('keydown', onKeyDown)
        resizeObserver?.disconnect()
        el.appendChild(canvas)
        if (overlay) el.appendChild(overlay.root)
        container = el
      } else {
        const r = createRenderer(QUALITY_SETTINGS[quality].antialias)
        if (typeof r === 'string') {
          phase = 'unsupported'
          emit({ type: 'unsupported', reason: r })
          return
        }
        container = el
        attachCanvas(r, el, null)
        overlay = new LabelOverlay(el)
        controls = new OrbitControls(camera, r.domElement)
        controls.target = target
        controls.enableDamping = false
        controls.screenSpacePanning = true
        controls.minDistance = 0.003
        controls.maxDistance = Math.max(10, contentRadius * 12)
        controls.rotateSpeed = 0.8
        controls.addEventListener('start', onControlsStart)
        controls.addEventListener('change', onControlsChange)
        controls.update()
      }
      try {
        if (getComputedStyle(el).position === 'static') el.style.position = 'relative'
      } catch {
        /* ignore */
      }
      el.addEventListener('keydown', onKeyDown)
      if (typeof ResizeObserver === 'function') {
        resizeObserver = new ResizeObserver(() => resize())
        resizeObserver.observe(el)
      } else if (!windowResizeBound) {
        globalThis.addEventListener('resize', resize)
        windowResizeBound = true
      }
      phase = 'mounted'
      for (const e of allEntries) e.appliedKey = ''
      refresh({ visibility: true, force: true })
      resize()
      requestRender()
    },

    dispose(): void {
      if (phase === 'disposed') return
      phase = 'disposed'
      unsubscribe()
      if (rafId) cancelAnimationFrame(rafId)
      if (hoverRaf) cancelAnimationFrame(hoverRaf)
      if (settleTimer !== null) clearTimeout(settleTimer)
      if (bvhTimer !== null) clearTimeout(bvhTimer)
      bvhQueue.length = 0
      for (const p of pending.values()) p.controller.abort()
      pending.clear()
      for (const la of assets.values()) disposeLoadedAsset(la)
      // Nothing is rendered any more: keep the store truthful (only this engine's own ids).
      for (const id of [...assets.keys()]) syncStoreLoaded(id, false)
      assets.clear()
      rebuildRegistry()
      capGeometry.dispose()
      capMaterial.dispose()
      stencilBack.dispose()
      stencilFront.dispose()
      if (controls) {
        controls.removeEventListener('start', onControlsStart)
        controls.removeEventListener('change', onControlsChange)
        controls.dispose()
        controls = null
      }
      resizeObserver?.disconnect()
      resizeObserver = null
      if (windowResizeBound) globalThis.removeEventListener('resize', resize)
      windowResizeBound = false
      container?.removeEventListener('keydown', onKeyDown)
      overlay?.dispose()
      overlay = null
      detachCanvas(true)
      container = null
      listeners.clear()
    },

    loadAsset,
    unloadAsset,
    isAssetLoaded: (id) => assets.has(id),

    setCameraPreset,
    resetCamera,
    focusStructures,
    getCameraState,
    setCameraState,

    setHighlight(ids: StructureId[], style: HighlightStyle | null): void {
      if (style === null) {
        if (ids.length === 0) highlightSets.clear()
        else for (const set of highlightSets.values()) for (const id of ids) set.delete(id)
      } else if (ids.length === 0) {
        highlightSets.delete(style)
      } else {
        highlightSets.set(style, new Set(ids))
      }
      refresh({ visibility: false })
    },

    setLabelOptions(opts: LabelOptions): void {
      labelOpts = { ...opts }
      labelsDirty = true
      requestRender()
    },

    setQuality(level: QualityLevel): void {
      const envChanged = (quality === 'low') !== (level === 'low')
      quality = level
      if (!renderer) return
      if (QUALITY_SETTINGS[level].antialias !== rendererAntialias) replaceRenderer(QUALITY_SETTINGS[level].antialias)
      else {
        if (envChanged) setupEnvironment(renderer)
        resize()
      }
    },

    setReducedMotion(reduced: boolean): void {
      reducedMotion = reduced
      if (reduced && tween) {
        const to = tween.to
        tween = null
        applyPose(to, to.fov)
      }
    },

    getStats(): EngineStats {
      const now = performance.now()
      const recent = frameStamps.filter((t) => now - t <= 1000)
      return {
        fps: recent.length,
        frameMs: lastFrameMs,
        drawCalls: lastDrawCalls,
        triangles: lastTriangles,
        geometries: renderer?.info.memory.geometries ?? 0,
        textures: renderer?.info.memory.textures ?? 0,
        loadedAssets: assets.size,
        jsHeapBytes: heapBytes(),
      }
    },

    on(listener: (e: EngineEvent) => void): () => void {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    pickAt(clientX: number, clientY: number): StructureId | null {
      const hit = raycastAt(clientX, clientY)
      return hit ? hit.entry.structureId : null
    },

    projectStructure(id: StructureId): { x: number; y: number } | null {
      camera.updateMatrixWorld()
      const a = structureAnchor(id)
      return a ? projectToCanvas(a.world) : null
    },

    runOrbitBenchmark,

    debugNodes(): EngineDebugNode[] {
      return allEntries.map((e) => ({
        assetId: e.assetId,
        node: e.node,
        structureId: e.structureId,
        visible: e.meshes.every((m) => m.visible),
        opacity: e.material.opacity,
        transparent: e.material.transparent,
        selectable: e.style.selectable,
        ghost: e.style.ghost,
        emissive: `#${e.material.emissive.getHexString()}`,
        emissiveIntensity: e.material.emissiveIntensity,
        clipped: (e.material.clippingPlanes?.length ?? 0) > 0,
        offset: v3(e.offset),
      }))
    },
  }

  return engine
}
