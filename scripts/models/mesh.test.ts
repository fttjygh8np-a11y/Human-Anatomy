import { describe, expect, it } from 'vitest'
import { sphereObj } from './fixtures/synthetic.ts'
import { allocateTriangleBudget, meshStats, prepareMesh, simplifyMesh } from './lib/mesh.ts'
import { parseObj } from './lib/obj.ts'

const header = { elementId: 'FJ9999', fmaId: '9999999', name: 'test sphere', style: 'bare' as const }

describe('prepareMesh', () => {
  it('converts BodyParts3D LPS millimetres to the app frame in metres: (x, y, z) -> (x, z, -y) / 1000', () => {
    const obj = parseObj('v 10 20 30\nv 11 20 30\nv 10 21 30\nf 1 2 3\n')
    const { mesh } = prepareMesh(obj, { weldToleranceM: 0 })
    expect(mesh.positions[0]).toBeCloseTo(0.01, 7)
    expect(mesh.positions[1]).toBeCloseTo(0.03, 7)
    expect(mesh.positions[2]).toBeCloseTo(-0.02, 7)
  })

  it('welds duplicated seam/pole vertices and drops the resulting degenerate triangles', () => {
    const obj = parseObj(sphereObj(header, [0, 0, 0], 10, 8, 12))
    const r = prepareMesh(obj, { weldToleranceM: 0 })
    // (rings + 1) × (segments + 1) source vertices; welded: 2 poles + (rings − 1) × segments.
    expect(r.sourceVertices).toBe(9 * 13)
    expect(r.weldedVertices).toBe(2 + 7 * 12)
    expect(r.sourceTriangles).toBe(2 * 8 * 12)
    expect(r.degenerateTrianglesRemoved).toBe(2 * 12)
    expect(r.mesh.indices.length / 3).toBe(2 * 8 * 12 - 2 * 12)
    expect(r.windingFlipped).toBe(false)
  })

  it('reverses the winding when it disagrees with the source normals', () => {
    // Triangle in the LPS x/z plane with normal +Y (posterior) in the file, but wound so that its
    // geometric normal points anterior.
    const obj = parseObj('v 0 0 0\nv 0 0 1\nv 1 0 0\nvn 0 1 0\nf 1//1 3//1 2//1\n')
    const flippedCheck = prepareMesh(obj, { weldToleranceM: 0 })
    const obj2 = parseObj('v 0 0 0\nv 0 0 1\nv 1 0 0\nvn 0 1 0\nf 1//1 2//1 3//1\n')
    const keptCheck = prepareMesh(obj2, { weldToleranceM: 0 })
    expect(flippedCheck.windingFlipped !== keptCheck.windingFlipped).toBe(true)
    // After preparation both agree with the source normal: posterior = app -Z.
    for (const r of [flippedCheck, keptCheck]) expect(r.mesh.normals[2]).toBeLessThan(-0.99)
  })
})

describe('meshStats', () => {
  it('computes bbox and an area-weighted centroid', () => {
    const obj = parseObj(sphereObj(header, [100, -50, 1000], 20, 16, 24))
    const { mesh } = prepareMesh(obj, { weldToleranceM: 0 })
    const s = meshStats(mesh.positions, mesh.indices)
    expect(s.centroid[0]).toBeCloseTo(0.1, 3)
    expect(s.centroid[1]).toBeCloseTo(1.0, 3)
    expect(s.centroid[2]).toBeCloseTo(0.05, 3)
    expect(s.bbox[3] - s.bbox[0]).toBeCloseTo(0.04, 3)
  })
})

describe('simplifyMesh', () => {
  it('reduces a dense mesh toward the target while keeping its extent', async () => {
    const obj = parseObj(sphereObj(header, [0, 0, 0], 50, 40, 80))
    const { mesh } = prepareMesh(obj, { weldToleranceM: 0 })
    const before = meshStats(mesh.positions, mesh.indices)
    const { mesh: out } = await simplifyMesh(mesh, 800, 0.05)
    const after = meshStats(out.positions, out.indices)
    expect(after.triangles).toBeLessThanOrEqual(800)
    expect(after.triangles).toBeGreaterThan(100)
    expect(after.bbox[3] - after.bbox[0]).toBeGreaterThan(0.95 * (before.bbox[3] - before.bbox[0]))
    expect(out.normals.length).toBe(out.positions.length)
  })

  it('returns the input unchanged when the target is not below the triangle count', async () => {
    const obj = parseObj(sphereObj(header, [0, 0, 0], 5, 4, 6))
    const { mesh } = prepareMesh(obj, { weldToleranceM: 0 })
    const r = await simplifyMesh(mesh, 10_000, 0.01)
    expect(r.mesh).toBe(mesh)
  })
})

describe('allocateTriangleBudget', () => {
  it('keeps everything when the chunk is under budget', () => {
    const m = allocateTriangleBudget([{ id: 'a', triangles: 100, protected: false }], 1000, 50)
    expect(m.get('a')).toBe(100)
  })

  it('never simplifies protected elements and keeps a floor for small ones', () => {
    const m = allocateTriangleBudget(
      [
        { id: 'big', triangles: 100_000, protected: false },
        { id: 'small', triangles: 150, protected: false },
        { id: 'tiny', triangles: 40, protected: false },
        { id: 'ossicle', triangles: 5_000, protected: true },
      ],
      10_000,
      200,
    )
    expect(m.get('ossicle')).toBe(5_000)
    expect(m.get('small')).toBe(150)
    expect(m.get('tiny')).toBe(40)
    expect(m.get('big')).toBe(10_000 - 5_000 - 150 - 40)
  })

  it('shares the remaining budget proportionally', () => {
    const m = allocateTriangleBudget(
      [
        { id: 'a', triangles: 30_000, protected: false },
        { id: 'b', triangles: 10_000, protected: false },
      ],
      4_000,
      100,
    )
    expect(m.get('a')).toBe(3_000)
    expect(m.get('b')).toBe(1_000)
  })

  it('keeps floors even when protected elements exhaust the budget', () => {
    const m = allocateTriangleBudget(
      [
        { id: 'p', triangles: 5_000, protected: true },
        { id: 'a', triangles: 10_000, protected: false },
      ],
      1_000,
      200,
    )
    expect(m.get('p')).toBe(5_000)
    expect(m.get('a')).toBe(200)
  })
})
