/**
 * Pure math for the 3D viewer (no Three.js, no DOM) so it can be unit-tested in Node.
 *
 * All vectors are expressed in the app frame `anat-gltf-v1` (see src/core/frame.ts):
 * +X = subject's LEFT, +Y = SUPERIOR, +Z = ANTERIOR, metres.
 */
import { CAMERA_PRESET_DIRECTIONS, FRAME } from '../core/frame.ts'
import type { CameraPreset, ClipState, Vec3 } from '../core/schema.ts'
import type { ScreenOrientation } from './types.ts'

// ---------------------------------------------------------------------------
// Vector helpers
// ---------------------------------------------------------------------------

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s]
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
export const length = (a: Vec3): number => Math.hypot(a[0], a[1], a[2])
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
export const lerpVec = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

export function normalize(a: Vec3): Vec3 {
  const l = length(a)
  return l > 0 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0]
}

/** Orbit "up" axis used by the camera controls: the subject's superior direction. */
export const WORLD_UP: Vec3 = FRAME.superior

// ---------------------------------------------------------------------------
// Bounding boxes
// ---------------------------------------------------------------------------

export interface Bbox {
  min: Vec3
  max: Vec3
}

/** Asset JSON bbox tuple `[minX, minY, minZ, maxX, maxY, maxZ]`. */
export function bboxFromTuple(b: readonly [number, number, number, number, number, number]): Bbox {
  return { min: [b[0], b[1], b[2]], max: [b[3], b[4], b[5]] }
}

export function bboxUnion(boxes: Iterable<Bbox>): Bbox | null {
  let out: Bbox | null = null
  for (const b of boxes) {
    if (!out) out = { min: [...b.min], max: [...b.max] }
    else {
      for (let i = 0; i < 3; i++) {
        out.min[i] = Math.min(out.min[i]!, b.min[i]!)
        out.max[i] = Math.max(out.max[i]!, b.max[i]!)
      }
    }
  }
  return out
}

export const bboxCenter = (b: Bbox): Vec3 => scale(add(b.min, b.max), 0.5)
export const bboxSize = (b: Bbox): Vec3 => sub(b.max, b.min)
/** Radius of the sphere circumscribing the box (half its diagonal). */
export const bboxRadius = (b: Bbox): number => length(bboxSize(b)) / 2

// ---------------------------------------------------------------------------
// Camera placement
// ---------------------------------------------------------------------------

/**
 * Distance from a sphere's centre at which a perspective camera fully frames it,
 * considering both the vertical and the horizontal field of view.
 */
export function fitDistance(radius: number, fovYDeg: number, aspect: number, margin = 1.15): number {
  const r = Math.max(radius, 1e-6)
  const vfov = (fovYDeg * Math.PI) / 180
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * Math.max(aspect, 1e-6))
  const half = Math.min(vfov, hfov) / 2
  return (r * margin) / Math.sin(half)
}

/** Tiny offset that keeps polar views away from the orbit pole (radians, approx.). */
export const POLE_NUDGE = 1e-3

/**
 * Camera position for a standard anatomical view. The camera up vector is always
 * WORLD_UP (the orbit axis); for the superior/inferior views the position is nudged
 * off the pole so that `lookAt` produces the preset's screen-up direction
 * (superior view: anterior at the top; inferior view: posterior at the top).
 */
export function presetCameraPlacement(preset: CameraPreset, target: Vec3, distance: number): { position: Vec3; up: Vec3 } {
  const { dir, up } = CAMERA_PRESET_DIRECTIONS[preset]
  let d: Vec3 = dir
  const s = dot(dir, WORLD_UP)
  if (Math.abs(s) > 0.999) {
    // For a camera above (s=+1) or below (s=-1) the target, lookAt with WORLD_UP makes the
    // screen-up equal to -s * (horizontal offset direction); choose the offset accordingly.
    d = normalize(add(dir, scale(up, -s * POLE_NUDGE)))
  }
  return { position: add(target, scale(d, distance)), up: [...WORLD_UP] }
}

export interface CameraBasis {
  /** Screen-right direction in world space. */
  right: Vec3
  /** Screen-up direction in world space. */
  up: Vec3
  /** From target toward camera (opposite of the viewing direction). */
  back: Vec3
}

/** Same construction as Three.js `Object3D.lookAt` for cameras. */
export function lookAtBasis(position: Vec3, target: Vec3, worldUp: Vec3 = WORLD_UP): CameraBasis {
  const back = normalize(sub(position, target))
  let right = normalize(cross(worldUp, back))
  if (length(right) === 0) right = normalize(cross(worldUp, add(back, [0, 0, 1e-4])))
  const up = cross(back, right)
  return { right, up, back }
}

// ---------------------------------------------------------------------------
// Screen orientation (for L/R markers)
// ---------------------------------------------------------------------------

type AnatomicalDirection = ScreenOrientation['screenRight']

export const ANATOMICAL_AXES: ReadonlyArray<{ name: AnatomicalDirection; dir: Vec3 }> = [
  { name: 'left', dir: FRAME.left },
  { name: 'right', dir: FRAME.right },
  { name: 'superior', dir: FRAME.superior },
  { name: 'inferior', dir: FRAME.inferior },
  { name: 'anterior', dir: FRAME.anterior },
  { name: 'posterior', dir: FRAME.posterior },
]

const OPPOSITE: Record<AnatomicalDirection, AnatomicalDirection> = {
  left: 'right',
  right: 'left',
  superior: 'inferior',
  inferior: 'superior',
  anterior: 'posterior',
  posterior: 'anterior',
}

export const oppositeDirection = (d: AnatomicalDirection): AnatomicalDirection => OPPOSITE[d]

/** Anatomical direction closest to a world-space vector (optionally excluding an axis and its opposite). */
export function nearestAnatomicalDirection(v: Vec3, exclude?: AnatomicalDirection): AnatomicalDirection {
  let best: AnatomicalDirection = 'superior'
  let bestDot = -Infinity
  for (const a of ANATOMICAL_AXES) {
    if (exclude && (a.name === exclude || a.name === OPPOSITE[exclude])) continue
    const d = dot(v, a.dir)
    if (d > bestDot + 1e-9) {
      bestDot = d
      best = a.name
    }
  }
  return best
}

export function nearestPreset(back: Vec3): CameraPreset {
  let best: CameraPreset = 'anterior'
  let bestDot = -Infinity
  for (const [preset, { dir }] of Object.entries(CAMERA_PRESET_DIRECTIONS) as [CameraPreset, { dir: Vec3 }][]) {
    const d = dot(back, dir)
    if (d > bestDot + 1e-9) {
      bestDot = d
      best = preset
    }
  }
  return best
}

/**
 * Which anatomical direction points to screen right / screen up. In the anterior view the
 * camera faces the subject, so screen right shows the subject's LEFT (+X).
 */
export function screenOrientation(basis: CameraBasis): ScreenOrientation {
  const screenRight = nearestAnatomicalDirection(basis.right)
  const screenUp = nearestAnatomicalDirection(basis.up, screenRight)
  return { screenRight, screenUp, nearestPreset: nearestPreset(basis.back) }
}

export const sameOrientation = (a: ScreenOrientation | null, b: ScreenOrientation): boolean =>
  !!a && a.screenRight === b.screenRight && a.screenUp === b.screenUp && a.nearestPreset === b.nearestPreset

// ---------------------------------------------------------------------------
// Clipping
// ---------------------------------------------------------------------------

/** Plane normals in the canonical frame: sagittal ⟂ X (left–right), coronal ⟂ Z, axial ⟂ Y. */
export const CLIP_NORMALS: Record<ClipState['plane'], Vec3> = {
  sagittal: [1, 0, 0],
  coronal: [0, 0, 1],
  axial: [0, 1, 0],
}

export interface PlaneEq {
  /** Unit normal pointing into the KEPT half-space. */
  normal: Vec3
  /** Three.js convention: points p with dot(normal, p) + constant >= 0 are kept. */
  constant: number
}

/**
 * Clip plane for a ClipState. The cut lies at `offset` metres along the plane's axis;
 * keep='positive' keeps the +axis side (sagittal: subject's left, coronal: anterior,
 * axial: superior).
 */
export function clipPlaneFromState(clip: Pick<ClipState, 'plane' | 'offset' | 'keep'>): PlaneEq {
  const n = CLIP_NORMALS[clip.plane]
  return clip.keep === 'positive'
    ? { normal: [...n], constant: -clip.offset }
    : { normal: scale(n, -1), constant: clip.offset }
}

export const signedDistance = (plane: PlaneEq, p: Vec3): number => dot(plane.normal, p) + plane.constant
export const isKept = (plane: PlaneEq, p: Vec3, epsilon = 1e-9): boolean => signedDistance(plane, p) >= -epsilon

/** Point on the plane closest to `p`. */
export const projectOntoPlane = (plane: PlaneEq, p: Vec3): Vec3 => sub(p, scale(plane.normal, signedDistance(plane, p)))

// ---------------------------------------------------------------------------
// Exploded view
// ---------------------------------------------------------------------------

/**
 * Exploded-view translation of a node: moves it away from the centre of the loaded content
 * along (nodeCentroid - center), proportionally to `factor` (0 = true anatomical position).
 */
export function explodeOffset(nodeCentroid: Vec3, center: Vec3, factor: number): Vec3 {
  const f = clamp(factor, 0, 1)
  return f === 0 ? [0, 0, 0] : scale(sub(nodeCentroid, center), f)
}

// ---------------------------------------------------------------------------
// Camera animation
// ---------------------------------------------------------------------------

export const easeInOutCubic = (t: number): number => {
  const x = clamp(t, 0, 1)
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

/** Rotate v about unit axis k by angle (Rodrigues). */
export function rotateAbout(v: Vec3, k: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return add(add(scale(v, c), scale(cross(k, v), s)), scale(k, dot(k, v) * (1 - c)))
}

/**
 * Spherical interpolation between unit vectors. For (anti)parallel inputs the rotation axis
 * falls back to the component of `preferredAxis` perpendicular to `a` (so an anterior →
 * posterior transition orbits around the body's long axis instead of through it).
 */
export function slerpUnit(a: Vec3, b: Vec3, t: number, preferredAxis: Vec3 = WORLD_UP): Vec3 {
  const cosOmega = clamp(dot(a, b), -1, 1)
  const omega = Math.acos(cosOmega)
  if (omega < 1e-9) return [...a]
  let axis = cross(a, b)
  if (length(axis) < 1e-6) {
    axis = sub(preferredAxis, scale(a, dot(preferredAxis, a)))
    if (length(axis) < 1e-6) {
      const alt: Vec3 = Math.abs(a[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1]
      axis = sub(alt, scale(a, dot(alt, a)))
    }
  }
  return normalize(rotateAbout(a, normalize(axis), omega * t))
}

export interface OrbitPose {
  position: Vec3
  target: Vec3
}

/**
 * Interpolates a camera orbiting a (moving) target: target linearly, view direction on the
 * sphere, distance geometrically (so large zoom changes feel uniform).
 */
export function interpolateOrbit(from: OrbitPose, to: OrbitPose, t: number): OrbitPose {
  const target = lerpVec(from.target, to.target, t)
  const o0 = sub(from.position, from.target)
  const o1 = sub(to.position, to.target)
  const d0 = length(o0)
  const d1 = length(o1)
  const dir = d0 > 0 && d1 > 0 ? slerpUnit(normalize(o0), normalize(o1), t) : normalize(d1 > 0 ? o1 : o0)
  const dist = d0 > 0 && d1 > 0 ? d0 * Math.pow(d1 / d0, t) : lerp(d0, d1, t)
  return { target, position: add(target, scale(dir, dist)) }
}

/**
 * Near/far planes that keep depth precision reasonable from whole-body views down to
 * close-ups of millimetre-scale structures.
 */
export function nearFarFor(distanceToTarget: number, contentRadius: number): { near: number; far: number } {
  const near = clamp(distanceToTarget / 200, 1e-4, 0.5)
  const far = Math.max(distanceToTarget + contentRadius * 4, near * 1000, 10)
  return { near, far }
}

// ---------------------------------------------------------------------------
// Pointer gestures
// ---------------------------------------------------------------------------

export interface PointerSample {
  x: number
  y: number
  t: number
}

/** A press/release pair counts as a click (not an orbit/pan drag) if it barely moved and was short. */
export function isClick(down: PointerSample, up: PointerSample, maxMovePx = 6, maxMs = 700): boolean {
  return Math.hypot(up.x - down.x, up.y - down.y) <= maxMovePx && up.t - down.t <= maxMs
}

// ---------------------------------------------------------------------------
// Frame statistics
// ---------------------------------------------------------------------------

/** Linear-interpolated percentile (p in 0..100) of an unsorted sample. */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const rank = (clamp(p, 0, 100) / 100) * (sorted.length - 1)
  const lo = Math.floor(rank)
  const hi = Math.ceil(rank)
  return lerp(sorted[lo]!, sorted[hi]!, rank - lo)
}

export interface FrameSummary {
  frames: number
  fps: number
  p50: number
  p95: number
  max: number
}

/**
 * Summarises frame-to-frame intervals (ms). `frames` counts rendered frames, i.e. one more
 * than the number of intervals.
 */
export function summarizeFrameTimes(intervals: readonly number[]): FrameSummary {
  if (intervals.length === 0) return { frames: intervals.length, fps: 0, p50: 0, p95: 0, max: 0 }
  const total = intervals.reduce((s, x) => s + x, 0)
  return {
    frames: intervals.length + 1,
    fps: total > 0 ? (intervals.length * 1000) / total : 0,
    p50: percentile(intervals, 50),
    p95: percentile(intervals, 95),
    max: Math.max(...intervals),
  }
}
