/**
 * Anatomical coordinate frame utilities.
 *
 * App frame `anat-gltf-v1` (same as glTF 2.0): +X = subject's LEFT, +Y = SUPERIOR,
 * +Z = ANTERIOR, right-handed, metres, body in anatomical position.
 *
 * BodyParts3D source frame (measured from OBJ bounds, see docs/model-katalogu.md):
 * LPS millimetres: +X = subject's LEFT, +Y = POSTERIOR, +Z = SUPERIOR.
 * Conversion is the proper rotation (x, y, z) -> (x, z, -y) followed by mm -> m.
 */
import type { CameraPreset, Laterality, Vec3 } from './schema.ts'

export const FRAME = {
  id: 'anat-gltf-v1',
  left: [1, 0, 0] as Vec3,
  right: [-1, 0, 0] as Vec3,
  superior: [0, 1, 0] as Vec3,
  inferior: [0, -1, 0] as Vec3,
  anterior: [0, 0, 1] as Vec3,
  posterior: [0, 0, -1] as Vec3,
} as const

export function bp3dToApp([x, y, z]: Vec3): Vec3 {
  return [x / 1000, z / 1000, -y / 1000]
}

/**
 * Camera direction (from target toward camera) and up vector for each standard view.
 * "right" = viewing the subject's right side (camera placed on the subject's right, -X).
 */
export const CAMERA_PRESET_DIRECTIONS: Record<CameraPreset, { dir: Vec3; up: Vec3 }> = {
  anterior: { dir: FRAME.anterior, up: FRAME.superior },
  posterior: { dir: FRAME.posterior, up: FRAME.superior },
  right: { dir: FRAME.right, up: FRAME.superior },
  left: { dir: FRAME.left, up: FRAME.superior },
  superior: { dir: FRAME.superior, up: FRAME.anterior },
  inferior: { dir: FRAME.inferior, up: FRAME.posterior },
}

/** Expected sign of the X coordinate of a sided structure's centroid (relative to the midline). */
export function expectedXSign(laterality: Laterality): 1 | -1 | 0 | null {
  if (laterality === 'left') return 1
  if (laterality === 'right') return -1
  if (laterality === 'midline') return 0
  return null
}

/** Detect laterality from an English FMA-style name ("Right humerus", "left fifth rib"). */
export function lateralityFromEnglishName(name: string): 'right' | 'left' | null {
  const n = name.toLowerCase()
  if (/^right\b|\bright (?!and\b)/.test(n) && !/\bleft\b/.test(n)) return 'right'
  if (/^left\b|\bleft (?!and\b)/.test(n) && !/\bright\b/.test(n)) return 'left'
  return null
}
