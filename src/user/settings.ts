/** Validation of user settings (UserSettings lives in ./types.ts). */
import { z } from 'zod'
import { DEFAULT_SETTINGS, type UserSettings } from './types.ts'

export const userSettingsSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']),
  reducedMotion: z.enum(['system', 'on', 'off']),
  /** Relative text size; generous bounds so any sensible UI range fits. */
  fontScale: z.number().min(0.5).max(3),
  quality: z.enum(['auto', 'low', 'medium', 'high']),
  nameLanguage: z.enum(['tr', 'la', 'en']),
  showSecondaryNames: z.boolean(),
  onlyApprovedQuestions: z.boolean(),
  textMode: z.boolean(),
}) satisfies z.ZodType<UserSettings>

const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as Array<keyof UserSettings>

/** Only the valid, known keys of `raw` (unknown or invalid values are dropped). */
export function pickValidSettings(raw: unknown): Partial<UserSettings> {
  const out: Record<string, unknown> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const key of SETTING_KEYS) {
    const r = userSettingsSchema.shape[key].safeParse((raw as Record<string, unknown>)[key])
    if (r.success) out[key] = r.data
  }
  return out as Partial<UserSettings>
}

/** Stored settings merged over the defaults; never throws. */
export function sanitizeSettings(raw: unknown): UserSettings {
  return { ...DEFAULT_SETTINGS, ...pickValidSettings(raw) }
}
