# Mimari ve veri modeli

Uygulama sunucusuz, statik bir tek sayfa uygulamasıdır. Anatomik içerik ve 3B modeller derleme
zamanında `content/` ve `vendor/` klasörlerinden üretilir. Tarayıcı bu hazır JSON ve GLB
dosyalarını okur. Kullanıcı verileri yalnızca tarayıcıdaki IndexedDB'de tutulur.

```
vendor/bodyparts3d (OBJ) ──models:build──▶ public/models/bp3d/*.glb + public/data/assets.json
HRA GLB (indirme)        ──models:hra────▶ public/models/hra/*.glb  + public/data/assets-hra.json
content/**/*.json        ──content:build─▶ public/data/{structures,relations,taxonomy,sources,…}.json + manifest.json
                                               │
Tarayıcı: loader ─▶ ContentIndex ─▶ SearchIndex / sceneStore ─▶ ViewerEngine (three.js) + React UI
                                               │
                                          IndexedDB (notlar, ilerleme, görünümler, ayarlar)
```

## Teknoloji

| Katman | Seçim |
|---|---|
| Derleme | Vite (rolldown). `three`, `react` ve diğer bağımlılıklar ayrı parçalara bölünür. 3B görüntüleyici, sınav, ders ve ayarlar panelleri gerektiğinde yüklenir (`src/app/lazy.tsx`). |
| Arayüz | React 19, TypeScript |
| 3B | three.js, GLB (meshopt sıkıştırma) |
| Durum | zustand (vanilla store, React bağımsız) |
| Şema | zod (içerik derleme hattı ve çalışma zamanı aynı şemayı kullanır) |
| Arama | minisearch (Türkçe karakter katlama ile) |
| Kalıcılık | idb (IndexedDB) |
| Test | Vitest (birim), Playwright + axe-core (uçtan uca, erişilebilirlik) |

## Kaynak kod modülleri (`src/`)

| Klasör | Sorumluluk |
|---|---|
| `core/` | `schema.ts`: tüm kayıt türlerinin zod şemaları (tek doğru kaynak). `frame.ts`: anatomik koordinat sistemi ve kamera ön ayarları. |
| `data/` | `loader.ts`: `public/data` paketini indirir, doğrular. `contentIndex.ts`: kimlikle erişim, hiyerarşi (parça-bütün, genel kavram → sağ/sol örnek), görünen ad seçimi (tr → la → en). |
| `search/` | Üç dilde ve eş anlamlılarla arama dizini, Türkçe normalizasyon. |
| `state/` | `sceneStore.ts`: seçim, görünürlük, izolasyon, diseksiyon, kesit, geri al/yinele. `visibility.ts`: etkin görünürlük kuralı (aşağıda). |
| `viewer/` | `engine.ts`: three.js sahnesi, model yükleme, seçim ışını, kesit düzlemi, kamera. `labels.ts`, `labelOverlay.ts`: etiket yerleşimi ve yoğunluğu. `keyboard.ts`: klavye kısayolları. |
| `learning/` | Soru üretici, puanlama, sınav oturumu, rehberli ders adımları (`guidedTour.ts`), soruya uygun sahne hazırlığı. |
| `user/` | IndexedDB şeması (`userDb.ts`), aralıklı tekrar (`srs.ts`), ayarlar. |
| `ui/` | React bileşenleri: ağaç, arama, bilgi kartı, araç çubuğu, sınav, dersler, ayarlar, kayıtlı görünümler. |
| `app/` | Uygulama kabuğu, sekmeler, gecikmeli yüklenen paneller, test kancası (`?perf` veya geliştirme modu). |
| `i18n/` | Türkçe arayüz etiketleri. |

## Koordinat sistemi

`anat-gltf-v1`: +X öznenin **solu**, +Y **üst (superior)**, +Z **ön (anterior)**. Birim metredir
ve beden anatomik pozisyondadır. BodyParts3D (LPS, mm) bu sisteme `(x, y, z) → (x, z, −y)`
dönüşümü ve mm → m çevirisiyle aktarılır. HRA modelleri zaten aynı eksen düzenindedir, ancak başka
bir donöre aittir ve BodyParts3D bedenine hizalanmamıştır. Bu yüzden ayrı bir görünüm olarak
gösterilir (`registeredToBody: false`).

Taraf bilgisi önce addan (left/right) alınır. Adda taraf yoksa model ağırlık merkezinin X değerine
bakılır. `content:validate` ad ile model konumu arasındaki çelişkileri raporlar.

## Veri modeli

Tüm şemalar `src/core/schema.ts` içindedir. Başlıca kayıtlar:

| Kayıt | Açıklama |
|---|---|
| `Structure` | Anatomik yapı: kimlik (`fma:…`, `hra:…` vb.), tür, sistemler, bölgeler, taraf, ayrıntı düzeyi, TR/LA/EN adlar (her biri kaynak ve doğrulama durumuyla), eş anlamlılar, üst yapılar, `genericId` (sağ/sol örneğin genel kavramı), içerik alanları, inceleme durumu. |
| `Relation` | Yapılar arası ilişki (parçası, eklem yapar, kan sağlar, innerve eder, drene eder…), kaynaklı. |
| `Asset` | 3B model dosyası: düğüm → yapı eşleşmesi, sınır kutuları, köken zinciri (provenance), lisans, `representation` (anatomik/şematik), `registeredToBody`. |
| `Source` | Kaynak kaydı ve lisans (`allowsUse`, `allowsModification`, `allowsRedistribution`, `verifiedAt`). |
| `ReviewRecord` | Adı ve rolü belirtilmiş bir incelemecinin, belirli bir boyut (metin, etiket, geometri, ilişki) için verdiği karar. |
| `Lesson`, `Question` | Rehberli dersler ve yazılmış sorular. |
| `ScopeTarget` | Kapsam matrisi hedefi (sistem × bölge × yapı × düzey). |
| `SceneState` | Görünürlük, izolasyon, diseksiyon, kesit ve kamera durumu. Kayıtlı görünümlerde ve hata bildirimlerinde saklanır. |

Her içerik alanının ayrı bir durumu vardır: `present` (kaynaklı değer), `not_applicable`
(uygulanamaz) veya `missing` (henüz eklenmedi). Mevcut değerlerin doğrulama düzeyi ayrıca tutulur:
`unverified`, `source_checked` veya `expert_approved`. Adlar `verified` ya da `unverified`
durumundadır. "Uygulanamaz", "henüz eklenmedi" ve
"doğrulanmadı" arayüzde de farklı gösterilir.

İnceleme durumu metin, etiket, geometri ve ilişki boyutları için ayrı ayrı tutulur. Otomatik
denetimler (`automatedChecks`) bu durumlardan ayrı kaydedilir ve uzman onayı yerine geçmez.

## Görünürlük önceliği

`src/state/visibility.ts` (ilk eşleşen kazanır):

1. Model yok veya yüklenmedi → yok
2. Kendisi veya üst yapısı diseksiyonla kaldırıldı → gizli
3. İzolasyon etkin ve yapı izole kümenin dışında → gizli
4. En özgül açık ayar (kendi, sonra en yakın üst yapı): gizli / hayalet / görünür
5. Birincil sistem kapalı → gizli
6. Sistem saydamlığıyla görünür

Aynı kural görüntüleyici, ağaç rozetleri, arama ("göster" işlemi) ve sınav (sorunun yanıtlanabilir
olup olmadığı) tarafından kullanılır.

## İçerik derleme hattı (`scripts/content/`)

1. **Envanter** (`content:inventory`): BodyParts3D öğe ve ilişki listelerinden
   `content/structures/_inventory/` taslakları üretilir. Sağ/sol çiftlerinin genel kavramları da
   eklenir. Bu dosyalar elle düzenlenmez.
2. **Terimler** (`content:terms`): TA2 (Latince), TDK Güncel Türkçe Sözlük ve Wikidata (Türkçe)
   ad adayları `content/terminology/` altına yazılır. Hepsi "doğrulanmadı" durumundadır.
3. **İlişkiler** (`content:relations`): Wikidata özelliklerinden ilişkiler üretilir
   (`content/relations/wikidata.json`).
4. **Derleme** (`content:build`): tüm `content/**` dosyaları yol sırasıyla okunur. Aynı kimliğe ait
   ek kayıtlar (ör. açıklamalar) envanter taslağıyla birleştirilir. Kayıtlar şemaya göre doğrulanır
   ve bütünlük denetimleri çalıştırılır: kopuk referanslar, taraf/konum çelişkisi, yinelenen adlar,
   lisans kuralları. Hata varsa hiçbir dosya yazılmaz. Başarılı derlemede `public/data/*.json` ve
   içerik sürümü (girdi karmasından) yazılır.
5. **Raporlar**: `report:coverage` (kapsam hedefleri) ve `report:inventory` (tüm envanter).

## Model hattı (`scripts/models/`)

- `fetch-bodyparts3d.ts`: arşivi indirir, sha256 ve boyutları kaydeder.
- `build-models.ts`: OBJ → GLB. Koordinat dönüşümü, sistem/bölge parçalarına bölme, meshopt
  sıkıştırma ve `assets.json` düğüm eşleşmeleri bu adımda yapılır.
- `hra/`: HRA kadın üreme organları. Crosswalk kimliği olmayan veya ad/taraf uyuşmazlığı olan
  düğümler dışlanır (5 düğüm).

## Kullanıcı verisi

IndexedDB depoları: ayarlar, notlar, favoriler, ilerleme (görüntülenme ve doğru yanıt ayrı),
aralıklı tekrar durumu, sınav denemeleri, kayıtlı görünümler, hata bildirimleri. Hiçbir veri
sunucuya gönderilmez. Ayarlar sekmesinden JSON olarak dışa aktarılabilir, içe aktarılabilir ve
silinebilir. Depolama kullanılamıyorsa (gizli pencere) uygulama misafir modunda kayıtsız çalışır.
