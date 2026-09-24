/**
 * Source and license record for BodyParts3D, shared by the model build (GLB metadata, assets.json)
 * and exported for the content pipeline (sources.json).
 *
 * Facts and their status (see docs/model-katalogu.md for the full analysis):
 *  - The archive directory is https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/ (4.0).
 *  - The DBCLS license page stated CC BY 4.0 (dated 2025-02-27) when checked in an earlier session;
 *    the page URL and the check were not repeated here because the host is blocked in this
 *    environment.
 *  - The OBJ file headers state "licensed under CC Attribution-Share Alike 2.1 Japan".
 *  - Because the two statements differ, derived files follow the stricter one (share-alike) and are
 *    released as CC BY-SA 4.0 with the attribution below. This is the project's reading of the
 *    licenses, not legal advice; it has not been reviewed by a lawyer.
 */
import type { Source } from '../../../src/core/schema.ts'

export const BP3D_SOURCE_ID = 'src:bodyparts3d'
export const BP3D_VERSION = '4.0'
export const BP3D_ARCHIVE_URL = 'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/'

/** Attribution required by the license statement found in the OBJ headers. */
export const BP3D_ATTRIBUTION =
  'BodyParts3D, © The Database Center for Life Science, licensed under CC Attribution-Share Alike 2.1 Japan'

/** License declared for files derived by this project (GLB chunks). */
export const DERIVED_LICENSE = {
  id: 'CC-BY-SA-4.0',
  url: 'https://creativecommons.org/licenses/by-sa/4.0/',
  attribution: `${BP3D_ATTRIBUTION}. Değiştirilmiş türev (koordinat dönüşümü, birleştirme, sadeleştirme, sıkıştırma): Anatomi 3B projesi, CC BY-SA 4.0.`,
} as const

export const BP3D_SOURCE: Source = {
  id: BP3D_SOURCE_ID,
  type: 'model_library',
  citation: `BodyParts3D ${BP3D_VERSION}. The Database Center for Life Science (DBCLS). ${BP3D_ARCHIVE_URL}`,
  shortLabel: 'BodyParts3D 4.0',
  url: BP3D_ARCHIVE_URL,
  version: BP3D_VERSION,
  license: {
    id: 'CC-BY-SA-2.1-JP',
    url: 'https://creativecommons.org/licenses/by-sa/2.1/jp/',
    attribution: BP3D_ATTRIBUTION,
    allowsUse: true,
    allowsModification: true,
    allowsRedistribution: true,
    shareAlike: true,
    nonCommercial: false,
    notes:
      'İki farklı lisans beyanı var: (1) DBCLS lisans sayfası CC BY 4.0 diyor (2025-02-27 tarihli; önceki bir oturumda görüldü, ' +
      'sayfa adresi bu kayda eklenmedi ve bu ortamda yeniden doğrulanamadı); (2) OBJ dosya başlıkları "CC Attribution-Share Alike 2.1 Japan" diyor. ' +
      'Daha kısıtlayıcı olan (ShareAlike) esas alındı; türetilmiş GLB dosyaları CC BY-SA 4.0 olarak ve yukarıdaki atıfla dağıtılır. ' +
      'Hukuki inceleme yapılmadı.',
  },
  usedFor: ['geometry', 'structure-ids-fma', 'hierarchy-isa-partof'],
  notes:
    'Yalnızca erkek modeli içerir; kadın üreme organları için ayrı bir kaynak gerekir. Koordinatlar LPS milimetre ' +
    '(+X sol, +Y posterior, +Z superior); uygulama çerçevesine dönüşüm: src/core/frame.ts bp3dToApp.',
}
