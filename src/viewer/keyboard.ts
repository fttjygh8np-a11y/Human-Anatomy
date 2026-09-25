/**
 * Keyboard bindings of the 3D canvas region (pure mapping; the engine performs the actions).
 */
import type { CameraPreset } from '../core/schema.ts'

export type KeyAction =
  | { type: 'rotate'; azimuth: number; polar: number }
  | { type: 'pan'; dx: number; dy: number }
  | { type: 'zoom'; factor: number }
  | { type: 'preset'; preset: CameraPreset }
  | { type: 'reset' }
  | { type: 'clear-selection' }

export const KEY_ROTATE_STEP = Math.PI / 24
export const KEY_PAN_PX = 40
export const KEY_ZOOM_FACTOR = 1.2

const PRESET_KEYS: Record<string, CameraPreset> = {
  '1': 'anterior',
  '2': 'posterior',
  '3': 'right',
  '4': 'left',
  '5': 'superior',
  '6': 'inferior',
}

/** Turkish help text for aria-describedby / on-screen help. */
export const KEYBOARD_HELP_TR =
  'Klavye: ok tuşları modeli döndürür; Shift ile ok tuşları görünümü kaydırır; + ve − tuşları yakınlaştırır ve uzaklaştırır; ' +
  '1 önden, 2 arkadan, 3 sağdan, 4 soldan, 5 üstten, 6 alttan görünüme geçer; Home başlangıç görünümüne döner; Esc seçimi kaldırır.'

export interface KeyInput {
  key: string
  shiftKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
}

/**
 * Rotation signs mirror mouse dragging (ArrowLeft behaves like dragging to the left).
 * Returns null for keys the viewer does not handle (they keep their default behaviour).
 */
export function keyAction(e: KeyInput): KeyAction | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null
  switch (e.key) {
    case 'ArrowLeft':
      return e.shiftKey ? { type: 'pan', dx: KEY_PAN_PX, dy: 0 } : { type: 'rotate', azimuth: -KEY_ROTATE_STEP, polar: 0 }
    case 'ArrowRight':
      return e.shiftKey ? { type: 'pan', dx: -KEY_PAN_PX, dy: 0 } : { type: 'rotate', azimuth: KEY_ROTATE_STEP, polar: 0 }
    case 'ArrowUp':
      return e.shiftKey ? { type: 'pan', dx: 0, dy: KEY_PAN_PX } : { type: 'rotate', azimuth: 0, polar: -KEY_ROTATE_STEP }
    case 'ArrowDown':
      return e.shiftKey ? { type: 'pan', dx: 0, dy: -KEY_PAN_PX } : { type: 'rotate', azimuth: 0, polar: KEY_ROTATE_STEP }
    case '+':
    case '=':
      return { type: 'zoom', factor: KEY_ZOOM_FACTOR }
    case '-':
    case '_':
    case '−':
      return { type: 'zoom', factor: 1 / KEY_ZOOM_FACTOR }
    case 'Home':
    case '0':
      return { type: 'reset' }
    case 'Escape':
      return { type: 'clear-selection' }
    default: {
      const preset = PRESET_KEYS[e.key]
      return preset ? { type: 'preset', preset } : null
    }
  }
}
