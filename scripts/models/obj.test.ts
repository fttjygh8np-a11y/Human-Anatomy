import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseObj } from './lib/obj.ts'

const FIXTURES = join(import.meta.dirname, 'fixtures', 'bp3d', 'isa_BP3D_4.0_obj_99')

describe('parseObj — header', () => {
  it('reads bare-line headers (FJ id, FMA id, name, license)', () => {
    const obj = parseObj(readFileSync(join(FIXTURES, 'FJ9001.obj'), 'utf8'), { fileName: 'FJ9001.obj' })
    expect(obj.header.elementId).toBe('FJ9001')
    expect(obj.header.fmaId).toBe('9900001')
    expect(obj.header.name).toBe('left humerus')
    expect(obj.header.nameSource).toBe('header-line')
    expect(obj.header.license).toMatch(/Share Alike 2\.1 Japan/)
  })

  it('reads key: value headers and ignores the Japanese name', () => {
    const obj = parseObj(readFileSync(join(FIXTURES, 'FJ9002.obj'), 'utf8'))
    expect(obj.header).toMatchObject({ elementId: 'FJ9002', fmaId: '9900002', name: 'right humerus', nameSource: 'header-key' })
  })

  it('falls back to the file name for the element id and reports a missing FMA id', () => {
    const obj = parseObj('# some structure\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n', { fileName: 'FJ1234.obj' })
    expect(obj.header.elementId).toBe('FJ1234')
    expect(obj.header.fmaId).toBeNull()
    expect(obj.header.name).toBe('some structure')
  })

  it('accepts "FMA:1234" and "FMA ID: 1234" forms', () => {
    expect(parseObj('# FMA:1234\n# x\n').header.fmaId).toBe('1234')
    expect(parseObj('# FMA ID: 5678\n').header.fmaId).toBe('5678')
  })
})

describe('parseObj — geometry', () => {
  it('parses v and f a//a b//b c//c with per-vertex normals', () => {
    const obj = parseObj(readFileSync(join(FIXTURES, 'FJ9005.obj'), 'utf8'))
    expect(obj.stats.vertexCount).toBe(4)
    expect(obj.stats.normalCount).toBe(4)
    expect(obj.stats.triangleCount).toBe(4)
    expect(Array.from(obj.positions.slice(0, 3))).toEqual([10, 20, 30])
    expect(obj.cornerNormals).not.toBeNull()
    // f 1//1 2//2 3//3 -> 0-based
    expect(Array.from(obj.triangles.slice(0, 3))).toEqual([0, 1, 2])
    expect(Array.from(obj.cornerNormals!.slice(0, 3))).toEqual([0, 1, 2])
  })

  it('handles quads, v, v/t, v//n, v/t/n and negative indices', () => {
    const obj = parseObj(readFileSync(join(FIXTURES, 'FJ9009.obj'), 'utf8'))
    expect(obj.stats.faceCount).toBe(6)
    expect(obj.stats.polygonCount).toBe(6)
    expect(obj.stats.triangleCount).toBe(12)
    expect(obj.stats.skippedFaces).toBe(0)
    // Second face: f -4/1/-5 -3/2/-5 -2/3/-5 -1/4/-5 -> vertices 5,6,7,8 (0-based 4..7), normal 2 (0-based 1)
    expect(Array.from(obj.triangles.slice(6, 12))).toEqual([4, 5, 6, 4, 6, 7])
    expect(Array.from(obj.cornerNormals!.slice(6, 9))).toEqual([1, 1, 1])
    // f 1/1 5/2 8/3 4/4 has no normal references
    expect(Array.from(obj.cornerNormals!.slice(24, 27))).toEqual([-1, -1, -1])
  })

  it('fan-triangulates polygons', () => {
    const obj = parseObj('v 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nv -1 0.5 0\nf 1 2 3 4 5\n')
    expect(Array.from(obj.triangles)).toEqual([0, 1, 2, 0, 2, 3, 0, 3, 4])
  })

  it('skips faces with out-of-range indices and records a warning', () => {
    const obj = parseObj('v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 9\nf 1 2 3\n')
    expect(obj.stats.skippedFaces).toBe(1)
    expect(obj.stats.triangleCount).toBe(1)
    expect(obj.stats.warnings.length).toBe(1)
  })

  it('supports CRLF line endings and line continuations', () => {
    const obj = parseObj('v 0 0 0\r\nv 1 0 0\r\nv 0 1 0\r\nf 1 \\\r\n 2 3\r\n')
    expect(obj.stats.triangleCount).toBe(1)
  })

  it('returns null normals when the file has none', () => {
    const obj = parseObj('v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n')
    expect(obj.normals).toBeNull()
    expect(obj.cornerNormals).toBeNull()
  })
})
