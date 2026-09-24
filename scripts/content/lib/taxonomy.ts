/**
 * Authored taxonomy format (content/taxonomy/*.json).
 *
 * The compiled contract (`systemRecordSchema` / `regionRecordSchema` in src/core/schema.ts)
 * carries plain trilingual strings. Authors additionally record, per language, whether the
 * term was checked against its terminology source and which source it follows — using the
 * same `nameEntrySchema` as structure names. The build flattens this to the core contract;
 * the verification metadata stays in content/** and in the validation/coverage reports.
 */
import { z } from 'zod'
import {
  nameEntrySchema,
  regionRecordSchema,
  systemRecordSchema,
  type NameEntry,
  type RegionRecord,
  type SystemRecord,
} from '../../../src/core/schema.ts'

export const authoredTaxonNamesSchema = z.object({
  tr: nameEntrySchema,
  la: nameEntrySchema.optional(),
  en: nameEntrySchema,
})
export type AuthoredTaxonNames = z.infer<typeof authoredTaxonNamesSchema>

export const authoredSystemSchema = systemRecordSchema.omit({ name: true }).extend({
  names: authoredTaxonNamesSchema,
  /** Editorial note (e.g. how the app id relates to the TA term). Not shown to students. */
  note: z.string().optional(),
})
export type AuthoredSystem = z.infer<typeof authoredSystemSchema>

export const authoredRegionSchema = regionRecordSchema.omit({ name: true }).extend({
  names: authoredTaxonNamesSchema,
  note: z.string().optional(),
})
export type AuthoredRegion = z.infer<typeof authoredRegionSchema>

function flatten(names: AuthoredTaxonNames): SystemRecord['name'] {
  return names.la ? { tr: names.tr.value, la: names.la.value, en: names.en.value } : { tr: names.tr.value, en: names.en.value }
}

export function toSystemRecord(a: AuthoredSystem): SystemRecord {
  return systemRecordSchema.parse({
    id: a.id,
    name: flatten(a.names),
    color: a.color,
    layerOrder: a.layerOrder,
    ...(a.description !== undefined ? { description: a.description } : {}),
  })
}

export function toRegionRecord(a: AuthoredRegion): RegionRecord {
  return regionRecordSchema.parse({
    id: a.id,
    ...(a.parentId !== undefined ? { parentId: a.parentId } : {}),
    name: flatten(a.names),
    order: a.order,
  })
}

/** All name entries of a taxonomy record, with their language (for source/verification checks). */
export function taxonNameEntries(names: AuthoredTaxonNames): { lang: 'tr' | 'la' | 'en'; entry: NameEntry }[] {
  const out: { lang: 'tr' | 'la' | 'en'; entry: NameEntry }[] = [{ lang: 'tr', entry: names.tr }]
  if (names.la) out.push({ lang: 'la', entry: names.la })
  out.push({ lang: 'en', entry: names.en })
  return out
}
