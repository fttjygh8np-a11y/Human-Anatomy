# 3B model kataloğu ve BodyParts3D işlem hattı

> **Durum (2026-09-24):** İşlem hattı (`scripts/models/`) yazıldı ve yalnızca **sentetik test
> fikstürleriyle** çalıştırılıp test edildi. Gerçek BodyParts3D verisi bu geliştirme ortamında
> indirilemedi: `dbarchive.biosciencedbc.jp` ağ politikası tarafından engelleniyor (HTTP 403,
> `x-deny-reason: host_not_allowed`). Bu yüzden depoda **henüz gerçek veriden üretilmiş hiçbir GLB,
> öğe sayımı, üçgen sayısı, dosya boyutu veya performans ölçümü yoktur.** Aşağıda gerçek veriye dair
> geçen sayılar önceki bir oturumda arşiv sayfasından okunmuş değerlerdir ve öyle işaretlenmiştir.

## 1. Kaynak

| Alan | Değer | Doğrulama durumu |
| --- | --- | --- |
| Veri kümesi | BodyParts3D, sürüm 4.0 | Önceki oturumda arşiv dizininde görüldü |
| Yayıncı | The Database Center for Life Science (DBCLS), Japonya | — |
| Arşiv dizini | https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/ | Bu ortamda erişilemiyor (403) |
| Kullanılan arşiv | `isa_BP3D_4.0_obj_99.zip` (~136 MB) | Boyut önceki oturumda görüldü; sha256 henüz kaydedilmedi |
| İçerik | 2234 öğe ağı (FJ dosyaları), yalnızca erkek modeli | Sayı önceki oturumda bildirildi; bu depoda sayılmadı |
| İlişki dosyaları | Aynı dizindeki is-a / part-of "element parts" ve "inclusion relation" listeleri (`.txt`) | Dosya adları çalışma anında dizin listesinden bulunur; sütun biçimi doğrulanamadı |
| Kaynak kaydı | `src:bodyparts3d` — `scripts/models/lib/source.ts` (`BP3D_SOURCE`, `sourceSchema` ile doğrulanır) | — |

BodyParts3D ile ilgili bilimsel yayının künyesi (yazarlar, dergi, DOI) bu ortamda doğrulanamadığı
için kaynak kaydına **eklenmedi**; eklenmeden önce birincil kaynaktan kontrol edilmelidir.

## 2. Lisans analizi

İki farklı lisans beyanı vardır:

1. **DBCLS lisans sayfası:** CC BY 4.0 (sayfadaki tarih 2025-02-27). Önceki bir oturumda görüldü.
   Sayfanın tam adresi bu kayda alınmadı ve bu ortamda yeniden açılamadı; bu nedenle kaynak
   kaydındaki `license.verifiedAt` alanı **boş bırakıldı**.
2. **OBJ dosya başlıkları:** "BodyParts3D, (C) The Database Center for Life Science licensed under
   CC Attribution-Share Alike 2.1 Japan". Derleme, her OBJ başlığındaki lisans satırını okur ve
   `build-report.json → licenseStatements` altında dosya sayısıyla raporlar (gerçek veride henüz
   çalıştırılmadı).

**Karar:** Beyanlar çeliştiği için daha kısıtlayıcı olan (Share-Alike) esas alındı.

- Kaynak kaydının lisansı: `CC-BY-SA-2.1-JP` (https://creativecommons.org/licenses/by-sa/2.1/jp/),
  `shareAlike: true`, `nonCommercial: false`; kullanım, değiştirme ve yeniden dağıtım izinli.
- Türetilmiş GLB dosyaları **CC BY-SA 4.0** olarak dağıtılır. Gerekçe: CC BY-SA 2.x lisansları
  uyarlamaların "aynı lisans öğelerine sahip daha sonraki bir sürümle" lisanslanmasına izin verir.
  Bu, projenin lisans metnini okuma biçimidir; 2.1 Japonya metninde bu hükmün aynen bulunduğu bu
  ortamda ayrıca doğrulanamadı ve **hukuki inceleme yapılmadı.** Lisans sayfasındaki CC BY 4.0
  beyanı doğrulanırsa türev lisansı yeniden değerlendirilebilir.
- Zorunlu atıf metni (değiştirilmeden kullanılır):
  `BodyParts3D, © The Database Center for Life Science, licensed under CC Attribution-Share Alike 2.1 Japan`
- Atıf şuralara yazılır: her GLB'nin `asset.copyright` alanı; sahne `extras` alanı (`license`,
  `licenseUrl`, `sourceId`); kaynak kaydı (`src:bodyparts3d`). Uygulamanın kaynaklar/lisanslar
  ekranında da gösterilmelidir (arayüz ekibine öneri).
- Dosyaların internette erişilebilir olması izin olarak kabul edilmedi; izinler yalnızca yukarıdaki
  açık lisans beyanlarına dayanır.

**Açık iş:** Lisans sayfasının adresi, tarihi ve ilgili cümlesi birincil kaynaktan yeniden okunup
`license.verifiedAt` alanına (`url`, `date`, `quote`) yazılmalıdır.

## 3. Koordinat çerçevesi

| | Eksenler | Birim |
| --- | --- | --- |
| Kaynak (BodyParts3D) | LPS: +X deneğin **solu**, +Y **posterior**, +Z **superior** | milimetre |
| Uygulama (`anat-gltf-v1`, glTF ile aynı) | +X deneğin **solu**, +Y **superior**, +Z **anterior**; sağ-elli; anatomik pozisyon | metre |

Dönüşüm (`src/core/frame.ts → bp3dToApp`): **(x, y, z) mm → (x, z, −y) / 1000 m**. Dönme matrisi
`[[1,0,0],[0,0,1],[0,−1,0]]`, determinantı +1: saf dönmedir, ayna yansıması yoktur; deneğin solu
+X'te kalır. **Öteleme yapılmaz**, yani orta hattın x = 0'da olması gerekmez. Normaller aynı
dönmeyle (ölçeklemeden) çevrilir.

**Nasıl belirlendi ve nasıl doğrulanıyor:**

- Kaynak eksenleri önceki bir oturumda OBJ sınırlarından belirlendi (`src/core/frame.ts` başlık
  yorumu). Bu oturumda gerçek veriye erişilemediği için **yeniden ölçülemedi.**
- Her derleme şu otomatik denetimleri yapar ve `build-report.json` dosyasına yazar (gerçek veride
  henüz çalıştırılmadı):
  - `frame-axis-superior`: baş yapılarının (skull, cranium, brain, mandible, maxilla, işitme
    kemikçikleri, eyeball) ağırlık merkezi Y medyanı, alt ekstremite yapılarınınkinden (femur,
    tibia, fibula, patella, ayak kemikleri) büyük olmalı.
  - `frame-axis-anterior`: sternumun Z medyanı torakal vertebralarınkinden büyük olmalı.
  - `laterality-centroid-sign`: adı "left/right" içeren her öğede ağırlık merkezi X'inin, ölçülen
    orta hatta göre işareti (bkz. §7).
  - Karşılaştırma grubu bulunamazsa sonuç `partial` olur; tahmin yapılmaz.
- Birim testi: fikstürdeki LPS (10, 20, 30) mm köşesi GLB'den geri okunur ve (0.010, 0.030, −0.020) m
  konumunda bulunur (nicemleme hatası < 0,1 mm).

## 4. İşlem hattı adımları

1. **İndirme** (`npm run models:fetch`, `scripts/models/fetch-bodyparts3d.ts`): arşiv dizininin HTML
   listesi okunur; `isa_BP3D_<sürüm>_obj_99.zip` ve listedeki tüm `.txt` dosyaları
   `vendor/bodyparts3d/` altına indirilir (git'e girmez). Yarım kalan indirmeler `.part`
   dosyasından HTTP Range ile sürdürülür. Her dosyanın boyutu, sha256'sı, `Last-Modified`/`ETag`
   bilgisi ve zamanı `vendor/bodyparts3d/manifest.json` dosyasına yazılır. Zip, fflate ile akış
   halinde `vendor/bodyparts3d/isa_BP3D_4.0_obj_99/` altına açılır; klasör dışına yazmaya çalışan
   girdiler reddedilir. Sunucuya erişilemezse (ör. 403) nedeni ve elle indirme yolunu anlatan Türkçe
   bir hata verilir.
2. **OBJ ayrıştırma** (`lib/obj.ts`): başlıktan FJ kimliği, FMA kimliği, İngilizce ad ve lisans
   satırı; `v`, `vn`, `f` (`v`, `v/t`, `v//n`, `v/t/n`, negatif indeksler); çokgenler yelpaze
   (fan) yöntemiyle üçgenlenir. Geçersiz yüzler atlanır ve uyarı olarak kaydedilir.
3. **Çerçeve dönüşümü**: `bp3dToApp` (bkz. §3).
4. **Kaynaklama (weld)**: uygulama çerçevesinde aynı konumdaki köşeler birleştirilir (varsayılan
   tolerans 0 = yalnızca birebir aynı konumlar); oluşan dejenere üçgenler atılır.
5. **Sarım yönü ve normaller**: üçgen sarım yönü kaynak normallerle çoğunluk oylamasına göre
   denetlenir, gerekirse ters çevrilir (`windingFlipped` olarak kaydedilir). Normaller alan ağırlıklı
   olarak yeniden hesaplanır.
6. **İstatistikler**: sınır kutusu, alan ağırlıklı yüzey ağırlık merkezi, yüzey alanı.
7. **Sınıflandırma** (`lib/classify.ts`): sistem ve üst bölge → yığın (chunk) anahtarı (bkz. §6).
8. **Denetimler**: orta hat ölçümü, sağ-sol ve eksen denetimleri (bkz. §3 ve §7).
9. **Yığınlara ayırma**: her `sistem/bölge` bir GLB olur (bölge yoksa `sistem/other`).
10. **Temel LOD** (`lib/mesh.ts`): yığının üçgen bütçesi öğelere dağıtılır (bkz. §5) ve her öğe
    meshoptimizer `simplify` ile sadeleştirilir. Sadeleştirme sonrası sınır kutusu köşegeni
    `minBboxRatio` oranının altına düşerse öğe temel LOD'da tam çözünürlükte bırakılır ve
    `lod-bbox-preserved` denetimi `partial` olarak kaydedilir.
11. **Ayrıntılı LOD**: varsayılan olarak tam (kaynaklanmış) kaynak çözünürlüğü. Temel LOD'dan daha
    fazla geometri içermiyorsa (yığında hiç sadeleştirme olmadıysa) ayrıntılı dosya üretilmez.
12. **GLB yazımı** (`lib/glb.ts`): her öğe için bir mesh düğümü; **düğüm adı = FJ kimliği**;
    düğüm `extras`: `structureId`, `elementId`, `fmaId`, `nameEn`, `protectedFromSimplification`.
    Sistem başına bir varsayılan malzeme (görüntüleyici kendi renklerini uygulayabilir).
13. **Nicemleme ve sıkıştırma**: `@gltf-transform/functions` `meshopt()` → `KHR_mesh_quantization`
    (konum 14 bit, normal 10 bit, mesh başına hacim) + `EXT_meshopt_compression`. Nicemleme konumları
    düğüm dönüşümüyle telafi eder; dünya koordinatları değişmez.
14. **Çıktılar**: `public/models/bp3d/*.glb`, `public/data/assets.json`,
    `vendor/bodyparts3d/elements.json`, `vendor/bodyparts3d/build-report.json`. Bu derlemenin
    üretmediği eski `.glb` dosyaları çıktı klasöründen silinir.

## 5. LOD bütçeleri ve korunan yapılar

Varsayılanlar `scripts/models/config.ts` içindedir ve `--config dosya.json` ile derin birleştirmeyle
değiştirilebilir. **Bu değerler ölçülmemiş başlangıç değerleridir**; gereksinimler §11 uyarınca
referans cihazda ölçüm yapıldıktan sonra ayarlanmalıdır.

| Ayar | Varsayılan | Anlamı |
| --- | --- | --- |
| `lod.base.defaultTriangleBudget` | 150 000 | Yığın başına temel LOD üçgen bütçesi |
| `lod.base.chunkBudgets` | `skeletal/head` 250 000, `nervous/head` 250 000, `muscular/head` 200 000 | Yığına özel bütçeler |
| `lod.base.minTrianglesPerElement` | 200 | Korunmayan her öğenin alt sınırı (öğe bundan küçükse kendi sayısı) |
| `lod.base.maxError` | 0.02 | meshoptimizer hata sınırı (öğenin kendi boyutuna göre oransal) |
| `lod.base.minBboxRatio` | 0.9 | Sadeleştirme sonrası sınır kutusu köşegeni alt oranı |
| `lod.detail.maxTrianglesPerElement` | `null` | Ayrıntılı LOD'da tam çözünürlük |
| `quantization` | konum 14, normal 10 bit | `KHR_mesh_quantization` |
| `meshoptLevel` | `high` | `EXT_meshopt_compression` filtreli mod |
| `weldToleranceM` | 0 | Yalnızca birebir aynı köşeler birleşir |

**Bütçe dağıtımı:** korunan öğeler hiç sadeleştirilmez (tek başlarına bütçeyi aşsalar bile); diğer
her öğe en az `min(kendi üçgeni, minTrianglesPerElement)` üçgen tutar; kalan bütçe kaynak üçgen
sayılarıyla orantılı paylaştırılır. Hata sınırı nedeniyle bütçe aşılırsa rapor `budgetMet: false`
yazar.

**Korunan yapılar** (`protectedFromSimplification: true`) — İngilizce ada göre düzenli ifade; ilk
mühendislik listesidir, **anatomi uzmanı incelemesi bekliyor**:

| Desen | Gerekçe |
| --- | --- |
| malleus, incus, stapes, auditory ossicle | İşitme kemikçikleri (çok küçük) |
| cochlea, semicircular canal/duct, vestibule of inner ear | İç kulak yapıları |
| pituitary gland, hypophysis, pineal body/gland | Küçük endokrin bezler |
| parathyroid gland | Küçük endokrin bezler |
| trochlear nerve, abducens nerve | İnce kraniyal sinirler |
| chorda tympani | İnce sinir dalı |
| lens, cornea | Göz iç yapıları |

`protectedFmaIds` ile FMA kimliğine göre de koruma eklenebilir.

## 6. Sınıflandırma (sistem ve bölge)

Her öğe için sistem (`SYSTEM_IDS`) ve üst bölge (`TOP_REGION_IDS`) belirlenir; dayanağı her zaman
kaydedilir (`elements.json → classificationBasis/systemEvidence`, `regionBasis/regionEvidence`).

1. **`hierarchy`** — BodyParts3D ilişki dosyalarındaki bir üst kavram:
   - Sistem: önce part-of, sonra is-a üst kavramları en yakından başlayarak taranır; adı sistem
     düzeyi bir kavramla **birebir** eşleşen ilk üst kavram kullanılır (ör. "skeletal system",
     "bone organ", "skeletal muscle organ", "artery"; tam liste `SYSTEM_ANCHORS`).
   - Bölge: part-of üst kavram adının son " of " sonrası kısmı (taraf sözcüğü atılarak) bir bölge
     adıysa ("skeleton of left upper limb" → `upper_limb`). "head of humerus" veya "renal pelvis"
     bu yüzden bölge sayılmaz.
2. **`heuristic`** — öğenin kendi İngilizce adına anahtar sözcük kuralları (sıralı; ilk eşleşen
   kazanır; ör. damar/sinir kuralları organ kurallarından önce gelir: "renal artery" → dolaşım).
   Bu kurallar mühendislik sezgileridir, anatomik iddia değildir; sonuçlar uzman incelemesi için
   `heuristic` olarak işaretlenir.
3. **`unclassified` / `unassigned`** — hiçbir kural eşleşmezse tahmin yapılmaz. Sistemi
   bulunamayan öğeler GLB'ye konmaz ve raporda "atlanan" olarak listelenir; bölgesi bulunamayanlar
   `sistem/other` yığınına girer ve varlığın `regions` alanı boş kalır.

**İlişki dosyalarının okunması** (`lib/relations.ts`): gerçek sütun biçimi doğrulanamadığı için
okuyucu toleranslıdır. Dosya türü addan (`element_parts`, `inclusion_relation`, `parts_list`;
`isa`/`partof`) anlaşılır; satırlar sekmeyle (yoksa virgül, yoksa çoklu boşlukla) bölünür; FMA ve FJ
kimlikleri desenle tanınır, adlar yanlarındaki metin hücrelerinden alınır. İçerme listelerinde
üst/alt yönü başlıktan ("parent/child") okunur; başlık yoksa öğelerin FMA kimliklerinin (en özgül
kavramlar oldukları için) hangi sütunda çoğunlukla geçtiğine bakılarak çıkarılır; o da mümkün
değilse "üst önce" varsayılır ve rapora `assumed-parent-first` olarak yazılır.

## 7. Sağ-sol denetimi

- Taraf, `src/core/frame.ts → lateralityFromEnglishName` ile İngilizce addan okunur.
- **Orta hat ölçülür:** sağ/sol ad çiftlerinin (ör. "left humerus"/"right humerus") ağırlık
  merkezleri ortalamasının medyanı; çift yoksa tüm öğelerin sınır kutusu merkezi; istenirse
  `midline.xOverrideM` ile sabitlenir. Yöntem `elements.json → midline` alanına yazılır.
- Beklenen işaret `expectedXSign`: sol → +X, sağ → −X. Sonuç:
  - `pass`: işaret doğru;
  - `partial`: ağırlık merkezi orta hattın ±2 mm yakınında, taraf geometriden doğrulanamadı;
  - `fail`: işaret ters.
- **Uyumsuzluklar asla otomatik düzeltilmez**; öğe adı ve geometrisi olduğu gibi kalır, denetim
  `elements.json → checks` ve `build-report.json → laterality.failures` altına yazılır. `--strict`
  ile derleme bu durumda hata koduyla biter.
- Adında taraf olmayan öğeler için "orta hat" veya "tek" gibi bir taraf **tahmin edilmez**.
- Not: Adında taraf geçen her yapı geometrik olarak o yarıda olmayabilir (ör. kalp boşlukları orta
  hatta yakın olabilir); böyle sonuçlar uzman tarafından değerlendirilmelidir.

## 8. Çıktılar ve sözleşmeler

| Dosya | İçerik |
| --- | --- |
| `public/models/bp3d/<sistem>.<bölge>.glb` | Temel LOD (ör. `skeletal.upper_limb.glb`) |
| `public/models/bp3d/<sistem>.<bölge>.detail.glb` | Ayrıntılı LOD (yalnızca temel LOD'dan farklıysa) |
| `public/data/assets.json` | `ModelAsset[]` dizisi, kimliğe göre sıralı; her kayıt `assetSchema` ile doğrulanır |
| `vendor/bodyparts3d/elements.json` | Öğe envanteri (şema: `scripts/models/lib/inventory.ts`), içerik hattı için |
| `vendor/bodyparts3d/build-report.json` | Sayımlar, yığınlar, çerçeve ve sağ-sol denetimleri, atlananlar, lisans beyanları |

- Varlık kimliği `asset:bp3d.<sistem>.<bölge>` (ayrıntılı için `.detail` eki, `detailFor` temel
  varlığı gösterir); `chunk` = `<sistem>/<bölge|other>`; `file` = `models/bp3d/...` (uygulama
  tabanına göre).
- Düğüm kaydı: `node` = FJ kimliği, `structureId` = `fma:<FMA kimliği>`, `elementId`, `triangles`,
  `bbox` ([minX, minY, minZ, maxX, maxY, maxZ], metre), `centroid`, `protectedFromSimplification`.
- `provenance`: kaynak (arşiv adı, sha256, indirme zamanı — manifest varsa), OBJ ayrıştırma, çerçeve
  dönüşümü, kaynaklama, normaller, sadeleştirme (bütçe, hata sınırı, üçgen sayıları) ve
  nicemleme/sıkıştırma adımları; her adımda tarih, araç (sürümüyle) ve parametreler.
- `review.geometry` her zaman `draft` olarak başlar; geometri için hiçbir uzman incelemesi
  yapılmamıştır. Otomatik denetimler uzman incelemesinin yerine geçmez.
- Öğe başına kaynak dosya sha256 değerleri `elements.json → sourceSha256` alanındadır.

## 9. Çalıştırma

```sh
npm run models:fetch                  # indir, sha256 kaydet, aç
npm run models:fetch -- --offline     # elle kopyalanmış zip/txt dosyalarını kaydet ve aç
npm run models:build                  # GLB + assets.json + elements.json + build-report.json
npm run models:build -- --strict      # sağ-sol veya eksen denetimi başarısızsa çıkış kodu 1
npm run models:build -- --config benim-ayarlarim.json --date 2026-01-15
```

Diğer seçenekler: `--input`, `--models-out`, `--data-out`, `--inventory-out`, `--url-prefix`
(`build-models.ts` başlığı); `--base-url`, `--dest`, `--zip-pattern`, `--force-unzip`
(`fetch-bodyparts3d.ts` başlığı).

Sunucuya erişim engelliyse: dosyaları erişimi olan bir makinede arşiv dizininden indirip
`vendor/bodyparts3d/` altına kopyalayın ve `npm run models:fetch -- --offline` çalıştırın.

**Belirleyicilik:** Aynı girdi, aynı yapılandırma ve aynı tarihle çıktılar bayt bayt aynıdır (test
edilir). Tarih `--date` ile ya da `SOURCE_DATE_EPOCH` ortam değişkeniyle sabitlenebilir; verilmezse
UTC bugünün tarihi kullanılır.

**Testler:** `npx vitest run scripts/models` — OBJ ayrıştırıcı, ağ işlemleri (çerçeve, kaynaklama,
sadeleştirme, bütçe), sınıflandırma ve ilişki dosyaları, indirme (yerel HTTP sunucusuyla sürdürme,
403 mesajı, güvenli zip açma) ve sentetik fikstürler üzerinde uçtan uca derleme (`assetSchema`
doğrulaması, çerçeve dönüşümü, sağ-sol denetimleri, LOD, belirleyicilik). Fikstürler
`scripts/models/fixtures/` altındadır; kimlikleri (FJ90xx, FMA99000xx) bilerek gerçek aralıkların
dışında seçilmiştir ve geometrileri kutu/küredir — **BodyParts3D verisi değildir.**

## 10. Bilinen sınırlamalar ve açık işler

- **Gerçek veri işlenmedi.** Gerçek öğe sayısı, sınıflandırma dağılımı, üçgen sayıları, dosya
  boyutları, sağ-sol/eksen denetim sonuçları ve performans henüz yok. Engelin kalkması için
  `dbarchive.biosciencedbc.jp` erişimi veya dosyaların elle sağlanması gerekir; tamamlanma koşulu:
  `npm run models:build -- --strict` gerçek veride hatasız biter ve rapor gözden geçirilir.
- **Yalnızca erkek modeli.** Kadın üreme organları için başka bir kaynak gerekir; aday olarak Human
  Reference Atlas (HRA) 3B referans organları düşünülebilir, ancak **lisansı ve koordinat
  çerçevesiyle eşleştirilmesi doğrulanmadı**, işlem hattına eklenmedi. Bu yapılar eksik içerik
  listesinde kalmalıdır.
- İlişki dosyalarının gerçek sütun biçimi doğrulanamadı; okuyucu toleranslı yazıldı ve yön
  belirleme yöntemini rapora yazar, ama gerçek dosyalarla ilk derlemede kontrol edilmelidir.
- Anahtar sözcük sınıflandırması ve bölge ataması sezgiseldir; `heuristic` işaretli kayıtlar uzman
  incelemesi gerektirir. Geometriye dayalı bölge ataması yapılmadı.
- FMA kimliği olmayan öğeler varsayılan olarak GLB'lere konmaz (`includeElementsWithoutFma`).
- Adlar OBJ başlığındaki İngilizce adlardır; TA2/Latince/Türkçe adlarla eşleştirme ve doğrulama
  içerik hattının işidir.
- BodyParts3D'nin ayrıntı düzeyi sınırlıdır: bazı kemik yüzey işaretleri, organ iç yapıları vb.
  ayrı öğe olarak bulunmayabilir; bunlar kapsam raporunda eksik olarak görünmelidir.
- Normaller yeniden hesaplandığı için keskin kenarlar yumuşatılır. 14 bit konum nicemlemesinde
  adım yaklaşık "mesh boyutu / 16383" kadardır (ör. 0,4 m'lik bir kemikte ~25 µm; en büyük hata
  bunun yarısı).
- Korunan yapı listesi ve LOD bütçeleri ölçülmemiş başlangıç değerleridir.
- Tüm geometri kayıtları `draft` durumundadır; uzman incelemesi yapılmamıştır.
