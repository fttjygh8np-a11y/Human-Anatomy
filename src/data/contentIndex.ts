/**
 * Indexed, read-only view of the content bundle (see ContentIndex in ./types.ts).
 * All lookups are precomputed once; methods are O(1) or O(result size).
 */
import type { RelationType, SceneState, Structure, StructureId, SystemId } from '../core/schema.ts'
import type { ContentBundle, ContentIndex, NodeRef, RelationView } from './types.ts'

export function createContentIndex(bundle: ContentBundle): ContentIndex {
  const structures = new Map(bundle.structures.map((s) => [s.id, s]))
  const sources = new Map(bundle.sources.map((s) => [s.id, s]))
  const assets = new Map(bundle.assets.map((a) => [a.id, a]))

  // Hierarchical parents: part-of parents plus the generic concept of a sided instance
  // ("Right humerus" sits under "Humerus"), so selecting/hiding the generic covers both sides.
  const parentsOf = (s: Structure): StructureId[] =>
    s.genericId && !s.parentIds.includes(s.genericId) ? [...s.parentIds, s.genericId] : s.parentIds

  const children = new Map<StructureId, Structure[]>()
  for (const s of bundle.structures) {
    for (const p of parentsOf(s)) {
      if (!structures.has(p)) continue
      const list = children.get(p)
      if (list) list.push(s)
      else children.set(p, [s])
    }
  }

  // Own model nodes per structure, and the reverse node -> structure map.
  const ownNodes = new Map<StructureId, NodeRef[]>()
  const nodeToStructure = new Map<string, StructureId>()
  for (const a of bundle.assets) {
    for (const n of a.nodes) {
      const ref = { assetId: a.id, node: n.node }
      const list = ownNodes.get(n.structureId)
      if (list) list.push(ref)
      else ownNodes.set(n.structureId, [ref])
      nodeToStructure.set(`${a.id}\u0000${n.node}`, n.structureId)
    }
  }

  const ancestorsCache = new Map<StructureId, StructureId[]>()
  const ancestorsOf = (id: StructureId): StructureId[] => {
    const cached = ancestorsCache.get(id)
    if (cached) return cached
    // Breadth-first over (possibly multiple) parents, nearest first, cycle-safe.
    const out: StructureId[] = []
    const seen = new Set<StructureId>([id])
    const self = structures.get(id)
    let frontier = self ? parentsOf(self) : []
    while (frontier.length > 0) {
      const next: StructureId[] = []
      for (const p of frontier) {
        if (seen.has(p) || !structures.has(p)) continue
        seen.add(p)
        out.push(p)
        const ps = structures.get(p)
        if (ps) next.push(...parentsOf(ps))
      }
      frontier = next
    }
    ancestorsCache.set(id, out)
    return out
  }

  const nodesCache = new Map<StructureId, NodeRef[]>()
  const nodesFor = (id: StructureId): NodeRef[] => {
    const cached = nodesCache.get(id)
    if (cached) return cached
    const out: NodeRef[] = []
    const seen = new Set<StructureId>()
    const stack = [id]
    while (stack.length > 0) {
      const cur = stack.pop()!
      if (seen.has(cur)) continue
      seen.add(cur)
      out.push(...(ownNodes.get(cur) ?? []))
      for (const c of children.get(cur) ?? []) stack.push(c.id)
    }
    nodesCache.set(id, out)
    return out
  }

  const relationsBy = new Map<StructureId, RelationView[]>()
  const addRel = (id: StructureId, v: RelationView) => {
    const list = relationsBy.get(id)
    if (list) list.push(v)
    else relationsBy.set(id, [v])
  }
  for (const r of bundle.relations) {
    addRel(r.from, { relation: r, otherId: r.to, direction: 'forward' })
    if (r.to !== r.from) addRel(r.to, { relation: r, otherId: r.from, direction: 'inverse' })
  }

  const regionDescendants = (regionId: string): Set<string> => {
    const out = new Set([regionId])
    let grew = true
    while (grew) {
      grew = false
      for (const r of bundle.regions) {
        if (r.parentId && out.has(r.parentId) && !out.has(r.id)) {
          out.add(r.id)
          grew = true
        }
      }
    }
    return out
  }

  const byName = (a: Structure, b: Structure) => a.names.en.value.localeCompare(b.names.en.value)

  return {
    bundle,
    getStructure: (id) => structures.get(id),
    getSource: (id) => sources.get(id),
    getAsset: (id) => assets.get(id),
    childrenOf: (id) => [...(children.get(id) ?? [])].sort(byName),
    systemRoots: (system: SystemId) =>
      bundle.structures
        .filter((s) => s.systems[0] === system)
        .filter((s) => !parentsOf(s).some((p) => structures.get(p)?.systems[0] === system))
        .sort(byName),
    structuresInRegion: (regionId) => {
      const set = regionDescendants(regionId)
      return bundle.structures.filter((s) => s.regions.some((r) => set.has(r)))
    },
    relationsOf: (id, types?: readonly RelationType[]) => {
      const all = relationsBy.get(id) ?? []
      return types ? all.filter((v) => types.includes(v.relation.type)) : all
    },
    nodesFor,
    structureForNode: (assetId, node) => nodeToStructure.get(`${assetId}\u0000${node}`),
    assetsFor: (id) => [...new Set(nodesFor(id).map((n) => n.assetId))],
    displayName: (id, lang = 'tr') => {
      const s = structures.get(id)
      if (!s) return id
      // Turkish anatomy teaching uses Latin terms, so a missing Turkish name falls back to Latin.
      return s.names[lang]?.value ?? s.names.tr?.value ?? s.names.la?.value ?? s.names.en.value
    },
    reviewsFor: (targetId) => bundle.reviews.filter((r) => r.target.id === targetId),

    // VisibilityGraph
    ancestorsOf,
    primarySystemOf: (id) => structures.get(id)?.systems[0],
    hasModel: (id) => nodesFor(id).length > 0,
    isLoaded: (id, scene: SceneState) => {
      if (scene.loadedAssets.length === 0) return false
      const loaded = new Set(scene.loadedAssets)
      return nodesFor(id).some((n) => loaded.has(n.assetId))
    },
  }
}
