import { describe, expect, it } from 'vitest'
import { CAMERA_PRESET_DIRECTIONS } from '../core/frame.ts'
import { CAMERA_PRESETS, type CameraPreset, type Vec3 } from '../core/schema.ts'
import {
  bboxCenter,
  bboxFromTuple,
  bboxRadius,
  bboxUnion,
  clipPlaneFromState,
  dot,
  easeInOutCubic,
  explodeOffset,
  fitDistance,
  interpolateOrbit,
  isClick,
  isKept,
  length,
  lookAtBasis,
  nearFarFor,
  nearestAnatomicalDirection,
  normalize,
  percentile,
  presetCameraPlacement,
  projectOntoPlane,
  screenOrientation,
  slerpUnit,
  sub,
  summarizeFrameTimes,
} from './math.ts'

const close = (a: Vec3, b: Vec3, eps = 1e-6) => {
  for (let i = 0; i < 3; i++) expect(Math.abs(a[i]! - b[i]!)).toBeLessThan(eps)
}

describe('bounding boxes', () => {
  it('unions boxes and derives centre / radius', () => {
    const u = bboxUnion([bboxFromTuple([0, 0, 0, 1, 2, 1]), bboxFromTuple([-1, 1, 0, 0, 3, 2])])!
    expect(u).toEqual({ min: [-1, 0, 0], max: [1, 3, 2] })
    expect(bboxCenter(u)).toEqual([0, 1.5, 1])
    expect(bboxRadius(u)).toBeCloseTo(Math.hypot(2, 3, 2) / 2)
    expect(bboxUnion([])).toBeNull()
  })
})

describe('fitDistance', () => {
  it('frames a sphere in the vertical FOV for wide viewports', () => {
    const d = fitDistance(1, 60, 2, 1)
    // sin(30°) = 0.5 -> distance 2
    expect(d).toBeCloseTo(2)
  })

  it('uses the narrower horizontal FOV on portrait viewports', () => {
    const wide = fitDistance(1, 40, 1.5, 1)
    const tall = fitDistance(1, 40, 0.5, 1)
    expect(tall).toBeGreaterThan(wide)
    const hfov = 2 * Math.atan(Math.tan((40 * Math.PI) / 360) * 0.5)
    expect(tall).toBeCloseTo(1 / Math.sin(hfov / 2))
  })

  it('scales linearly with radius and margin', () => {
    expect(fitDistance(2, 35, 1, 1.2)).toBeCloseTo(fitDistance(1, 35, 1, 1) * 2.4)
  })
})

describe('camera presets', () => {
  const target: Vec3 = [0.1, 0.9, -0.05]

  it.each(CAMERA_PRESETS.map((p) => [p]))('%s view looks along the preset direction with the preset up', (preset: CameraPreset) => {
    const { position } = presetCameraPlacement(preset, target, 2)
    expect(length(sub(position, target))).toBeCloseTo(2)
    const basis = lookAtBasis(position, target)
    const { dir, up } = CAMERA_PRESET_DIRECTIONS[preset]
    expect(dot(basis.back, dir)).toBeGreaterThan(0.999)
    expect(dot(basis.up, up)).toBeGreaterThan(0.99)
  })

  it('anterior view: subject right appears on the viewer left', () => {
    const { position } = presetCameraPlacement('anterior', [0, 0, 0], 3)
    const o = screenOrientation(lookAtBasis(position, [0, 0, 0]))
    expect(o).toEqual({ screenRight: 'left', screenUp: 'superior', nearestPreset: 'anterior' })
  })

  it('posterior view: subject right appears on the viewer right', () => {
    const { position } = presetCameraPlacement('posterior', [0, 0, 0], 3)
    const o = screenOrientation(lookAtBasis(position, [0, 0, 0]))
    expect(o).toEqual({ screenRight: 'right', screenUp: 'superior', nearestPreset: 'posterior' })
  })

  it('lateral views show anterior toward the side the camera faces', () => {
    const right = screenOrientation(lookAtBasis(presetCameraPlacement('right', [0, 0, 0], 3).position, [0, 0, 0]))
    // Camera on the subject's right (-X) looking toward +X: anterior (+Z) is on screen right.
    expect(right).toEqual({ screenRight: 'anterior', screenUp: 'superior', nearestPreset: 'right' })
    const left = screenOrientation(lookAtBasis(presetCameraPlacement('left', [0, 0, 0], 3).position, [0, 0, 0]))
    expect(left).toEqual({ screenRight: 'posterior', screenUp: 'superior', nearestPreset: 'left' })
  })

  it('superior view has anterior up; inferior view has posterior up', () => {
    const sup = screenOrientation(lookAtBasis(presetCameraPlacement('superior', [0, 0, 0], 3).position, [0, 0, 0]))
    expect(sup).toEqual({ screenRight: 'right', screenUp: 'anterior', nearestPreset: 'superior' })
    const inf = screenOrientation(lookAtBasis(presetCameraPlacement('inferior', [0, 0, 0], 3).position, [0, 0, 0]))
    expect(inf).toEqual({ screenRight: 'right', screenUp: 'posterior', nearestPreset: 'inferior' })
  })
})

describe('screen orientation', () => {
  it('never reports the same axis for right and up', () => {
    const basis = { right: normalize([1, 1, 0]), up: normalize([-1, 1, 0]), back: [0, 0, 1] as Vec3 }
    const o = screenOrientation(basis)
    expect(o.screenRight).not.toBe(o.screenUp)
  })

  it('maps world axes to anatomical names', () => {
    expect(nearestAnatomicalDirection([0.9, 0.1, 0])).toBe('left')
    expect(nearestAnatomicalDirection([-0.9, 0.1, 0])).toBe('right')
    expect(nearestAnatomicalDirection([0, 0, -1])).toBe('posterior')
    expect(nearestAnatomicalDirection([0.8, 0.6, 0], 'left')).toBe('superior')
  })
})

describe('clip planes', () => {
  it('sagittal/coronal/axial normals follow the anat-gltf-v1 axes', () => {
    expect(clipPlaneFromState({ plane: 'sagittal', offset: 0, keep: 'positive' }).normal).toEqual([1, 0, 0])
    expect(clipPlaneFromState({ plane: 'coronal', offset: 0, keep: 'positive' }).normal).toEqual([0, 0, 1])
    expect(clipPlaneFromState({ plane: 'axial', offset: 0, keep: 'positive' }).normal).toEqual([0, 1, 0])
  })

  it('keeps the requested half at the given offset', () => {
    const pos = clipPlaneFromState({ plane: 'axial', offset: 0.5, keep: 'positive' })
    expect(isKept(pos, [0, 0.6, 0])).toBe(true)
    expect(isKept(pos, [0, 0.4, 0])).toBe(false)
    const neg = clipPlaneFromState({ plane: 'axial', offset: 0.5, keep: 'negative' })
    expect(isKept(neg, [0, 0.6, 0])).toBe(false)
    expect(isKept(neg, [0, 0.4, 0])).toBe(true)
    // Sagittal positive keeps the subject's LEFT half (+X).
    const sag = clipPlaneFromState({ plane: 'sagittal', offset: 0, keep: 'positive' })
    expect(isKept(sag, [0.1, 0, 0])).toBe(true)
    expect(isKept(sag, [-0.1, 0, 0])).toBe(false)
  })

  it('projects points onto the plane', () => {
    const p = clipPlaneFromState({ plane: 'coronal', offset: -0.2, keep: 'negative' })
    close(projectOntoPlane(p, [1, 2, 3]), [1, 2, -0.2])
  })
})

describe('explode offsets', () => {
  it('is zero at factor 0 and proportional to the distance from the centre', () => {
    expect(explodeOffset([1, 2, 3], [0, 1, 0], 0)).toEqual([0, 0, 0])
    close(explodeOffset([1, 2, 3], [0, 1, 0], 0.5), [0.5, 0.5, 1.5])
    close(explodeOffset([1, 2, 3], [0, 1, 0], 1), [1, 1, 3])
  })

  it('clamps the factor to 0..1', () => {
    close(explodeOffset([2, 0, 0], [0, 0, 0], 5), [2, 0, 0])
    close(explodeOffset([2, 0, 0], [0, 0, 0], -1), [0, 0, 0])
  })
})

describe('camera animation', () => {
  it('eases from 0 to 1', () => {
    expect(easeInOutCubic(0)).toBe(0)
    expect(easeInOutCubic(1)).toBe(1)
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5)
  })

  it('slerps unit vectors and handles antipodes around the preferred axis', () => {
    close(slerpUnit([1, 0, 0], [0, 1, 0], 0.5), normalize([1, 1, 0]))
    const mid = slerpUnit([0, 0, 1], [0, 0, -1], 0.5)
    expect(Math.abs(mid[0])).toBeCloseTo(1) // orbits around +Y, through a lateral view
    expect(mid[1]).toBeCloseTo(0)
  })

  it('orbits without passing through the target', () => {
    const from = { position: [0, 0, 2] as Vec3, target: [0, 0, 0] as Vec3 }
    const to = { position: [0, 0, -2] as Vec3, target: [0, 0, 0] as Vec3 }
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const p = interpolateOrbit(from, to, t)
      expect(length(sub(p.position, p.target))).toBeCloseTo(2)
    }
    close(interpolateOrbit(from, to, 1).position, [0, 0, -2])
  })

  it('interpolates distance geometrically and target linearly', () => {
    const p = interpolateOrbit({ position: [0, 0, 4], target: [0, 0, 0] }, { position: [1, 0, 1], target: [1, 0, 0] }, 0.5)
    close(p.target, [0.5, 0, 0])
    expect(length(sub(p.position, p.target))).toBeCloseTo(2)
  })

  it('chooses near/far planes proportional to distance', () => {
    const close1 = nearFarFor(0.05, 1)
    const far1 = nearFarFor(3, 1)
    expect(close1.near).toBeLessThan(far1.near)
    expect(close1.near).toBeLessThan(0.05)
    expect(far1.far).toBeGreaterThan(3 + 1)
  })
})

describe('gestures and statistics', () => {
  it('distinguishes clicks from drags', () => {
    expect(isClick({ x: 0, y: 0, t: 0 }, { x: 3, y: 2, t: 120 })).toBe(true)
    expect(isClick({ x: 0, y: 0, t: 0 }, { x: 30, y: 0, t: 120 })).toBe(false)
    expect(isClick({ x: 0, y: 0, t: 0 }, { x: 0, y: 0, t: 2000 })).toBe(false)
  })

  it('computes percentiles with interpolation', () => {
    expect(percentile([], 50)).toBe(0)
    expect(percentile([5, 1, 3], 50)).toBe(3)
    expect(percentile([1, 2, 3, 4], 50)).toBeCloseTo(2.5)
    expect(percentile([1, 2, 3, 4, 100], 100)).toBe(100)
  })

  it('summarises frame intervals', () => {
    const s = summarizeFrameTimes([16, 16, 17, 33])
    expect(s.frames).toBe(5)
    expect(s.fps).toBeCloseTo((4 * 1000) / 82)
    expect(s.p50).toBeCloseTo(16.5)
    expect(s.max).toBe(33)
    expect(summarizeFrameTimes([]).fps).toBe(0)
  })
})
