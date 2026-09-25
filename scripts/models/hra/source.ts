/**
 * Human Reference Atlas (HRA, HuBMAP) 3D Reference Object Library — datasets, license facts and
 * frame conversion used by `npm run models:hra` (see docs/model-katalogu.md, "HRA" section).
 *
 * License (read 2026-09-25; the dated quote is recorded in content/sources/hra.json):
 *  - https://humanatlas.io/3d-reference-library (section "License"): "All HRA 3D reference objects
 *    are released under Attribution 4.0 International (CC BY 4.0)."
 *  - Each dataset's metadata.json repeats the license (`license`: https://creativecommons.org/licenses/by/4.0/);
 *    the fetch step refuses any dataset whose metadata states something else.
 *
 * Coordinate frame: the files are glTF 2.0, whose specification fixes "+Y as up; the front side of a
 * glTF asset faces +Z, the left side of a glTF asset faces +X" and "The units for all linear
 * distances are meters" — the same convention as the app frame anat-gltf-v1. HRA's documentation
 * does not restate axes; the build therefore verifies them on the data (left ovary at larger +X,
 * ovaries above the cervix, uterovesical pouch anterior to the uterosacral ligaments) and stops if
 * a check fails. The single-organ files are exported from the united female body file (HRA SOP
 * "Adding 3D Reference Objects to the Human Reference Atlas", v1.2.0) and share its coordinates,
 * which the build relies on to combine organs from different files.
 */
import type { Vec3 } from '../../../src/core/schema.ts'

export const HRA_SOURCE_ID = 'src:hra'
export const HRA_CDN_BASE = 'https://cdn.humanatlas.io/digital-objects/ref-organ/'
export const HRA_LIBRARY_URL = 'https://humanatlas.io/3d-reference-library'
export const HRA_LICENSE = {
  id: 'CC-BY-4.0',
  url: 'https://creativecommons.org/licenses/by/4.0/',
} as const

/** Attribution for derived files (GLB copyright field). */
export const HRA_ATTRIBUTION =
  'Human Reference Atlas 3D Reference Object Library (HuBMAP; K. Browne, H. Schlehlein ve ark.), CC BY 4.0, https://humanatlas.io/3d-reference-library'
export const DERIVED_ATTRIBUTION = `${HRA_ATTRIBUTION}. Değiştirilmiş türev (düğüm seçimi, birleştirme, sadeleştirme, sıkıştırma): Anatomi 3B projesi, CC BY 4.0.`

export interface HraDataset {
  /** Dataset name in the HRA catalogue (https://lod.humanatlas.io/ref-organ/<name>). */
  name: string
  /** Pinned version (reproducible builds; bump deliberately after checking the crosswalk). */
  version: string
  /** 'full' downloads the GLB; 'ranges' fetches only the JSON chunk and the selected meshes' bytes. */
  glbMode: 'full' | 'ranges'
}

/** Versions of the 11th HRA release (v2.5, June 2026) as listed on the 3D library page on 2026-09-25. */
export const HRA_DATASETS: readonly HraDataset[] = [
  { name: 'uterus-female', version: 'v1.2', glbMode: 'full' },
  { name: 'ovary-female-left', version: 'v1.3', glbMode: 'full' },
  { name: 'ovary-female-right', version: 'v1.3', glbMode: 'full' },
  { name: 'fallopian-tube-female-left', version: 'v1.2', glbMode: 'full' },
  { name: 'fallopian-tube-female-right', version: 'v1.2', glbMode: 'full' },
  // Vagina and the uterine/ovarian ligaments exist only in the united female body file (~375 MB).
  { name: 'united-female', version: 'v1.10', glbMode: 'ranges' },
]

export function datasetBaseUrl(d: Pick<HraDataset, 'name' | 'version'>): string {
  return `${HRA_CDN_BASE}${d.name}/${d.version}/`
}

/** HRA (glTF 2.0, metres) -> app frame anat-gltf-v1 (metres): identical axes, no scaling. */
export function hraToApp([x, y, z]: Vec3): Vec3 {
  return [x, y, z]
}
