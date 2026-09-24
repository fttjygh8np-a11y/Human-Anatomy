import { describe, expect, it } from 'vitest'
import { KEY_ROTATE_STEP, keyAction } from './keyboard.ts'

const k = (key: string, mods: Partial<{ shiftKey: boolean; ctrlKey: boolean; metaKey: boolean; altKey: boolean }> = {}) =>
  keyAction({ key, shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, ...mods })

describe('keyAction', () => {
  it('rotates with arrows and pans with shift+arrows', () => {
    expect(k('ArrowLeft')).toEqual({ type: 'rotate', azimuth: -KEY_ROTATE_STEP, polar: 0 })
    expect(k('ArrowDown')).toEqual({ type: 'rotate', azimuth: 0, polar: KEY_ROTATE_STEP })
    expect(k('ArrowUp', { shiftKey: true })).toMatchObject({ type: 'pan', dx: 0 })
  })

  it('zooms, switches presets, resets and clears selection', () => {
    expect(k('+')).toMatchObject({ type: 'zoom' })
    expect((k('-') as { factor: number }).factor).toBeLessThan(1)
    expect(k('1')).toEqual({ type: 'preset', preset: 'anterior' })
    expect(k('3')).toEqual({ type: 'preset', preset: 'right' })
    expect(k('5')).toEqual({ type: 'preset', preset: 'superior' })
    expect(k('Home')).toEqual({ type: 'reset' })
    expect(k('Escape')).toEqual({ type: 'clear-selection' })
  })

  it('leaves browser shortcuts and unrelated keys alone', () => {
    expect(k('ArrowLeft', { ctrlKey: true })).toBeNull()
    expect(k('Tab')).toBeNull()
    expect(k('a')).toBeNull()
  })
})
