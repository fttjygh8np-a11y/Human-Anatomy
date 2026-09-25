# İçerik yazım rehberi

Bu rehber anatomik içeriğin (yapılar, adlar, ilişkiler, kaynaklar, kapsam hedefleri, dersler ve
sorular) nasıl yazılacağını, nasıl kaynaklandırılacağını ve hangi durumların ne anlama geldiğini
tanımlar. Uzman inceleme süreci ayrıca [uzman-inceleme.md](uzman-inceleme.md) belgesinde anlatılır.

Temel ilkeler (bkz. [gereksinimler.md](gereksinimler.md) §3, §12):

- Her içerik değeri bir kaynağa dayanır. Kaynak, sayfa numarası, baskı, erişim tarihi, anatomik
  ilişki, ölçüm veya uzman onayı **uydurulmaz**.
- "Uygulanamaz", "henüz eklenmedi" ve "doğrulanmadı" birbirinden ayrı durumlardır.
- Metin, ad/etiket, 3B geometri ve ilişkiler ayrı ayrı incelenir; birinin onayı diğerini onaylamaz.
- Otomatik kontroller (şema, bütünlük, testler) uzman incelemesinin yerine geçmez.

## 1. Klasörler ve komutlar

Tek doğru kaynak `content/` klasöründeki JSON dosyalarıdır. `public/data/` altındaki dosyalar
derleme çıktısıdır; elle düzenlenmez.

| Konum | İçerik | Şema |
|---|---|---|
| `content/taxonomy/systems.json` | Sistemler (ad, renk, katman sırası) | `systemRecordSchema` + ad doğrulama bilgisi |
| `content/taxonomy/regions.json` | Bölge ağacı (üst düzey bölgeler ve alt bölgeler) | `regionRecordSchema` + ad doğrulama bilgisi |
| `content/sources/*.json` | Kaynak ve lisans kayıtları | `sourceSchema` |
| `content/structures/_inventory/*.json` | BodyParts3D'den üretilen taslak yapılar (**elle düzenlenmez**) | `structureSchema` |
| `content/structures/**` (diğer) | Yazılmış yapılar veya envanter taslaklarına **ekler** | `structureSchema` |
| `content/relations/**` | Yapılar arası ilişkiler | `relationSchema` |
| `content/lessons/**`, `content/questions/**` | Dersler ve yazılmış sorular | `lessonSchema`, `questionSchema` |
| `content/reviews/**` | İnsan inceleme kayıtları | `reviewRecordSchema` |
| `content/scope/**` | Kapsam matrisi hedefleri | `scopeTargetSchema` |

Şemaların tamamı `src/core/schema.ts` dosyasındadır. Her dosya tek bir kayıt nesnesi ya da kayıt
dizisi içerir. Dosyalar UTF-8 JSON'dur (yorum satırı yoktur; açıklamalar `note`/`notes` alanlarına
yazılır).

| Komut | Görev |
|---|---|
| `npm run content:inventory` | `vendor/bodyparts3d/elements.json` (model hattı üretir) dosyasından `content/structures/_inventory/` taslaklarını üretir. Dosya yoksa bilgi verip çıkar. |
| `npm run content:validate` | Hiçbir şey yazmadan tüm içeriği doğrular; Türkçe rapor verir. Hata varsa çıkış kodu 1. `-- --strict` uyarıları da engelleyici yapar, `-- --json` makine okunur çıktı verir. |
| `npm run content:build` | İçeriği doğrular ve `public/data/*.json` paketini yazar (`npm run build` bunu otomatik çalıştırır). Hata varsa hiçbir dosya yazılmaz. Yayın derlemesinde `-- --strict` kullanılmalıdır. |
| `npm run report:coverage` | Kapsam raporunu üretir: `docs/raporlar/kapsam.md` ve `kapsam.json`. |

`public/data/assets.json` model hattına aittir: içerik derlemesi onu değiştirmez, yalnızca
denetler (her model düğümünün yapı kaydı var mı, sağ-sol konumu tutarlı mı, lisans izinleri yeterli
mi). Dosya henüz yoksa paketin yüklenebilmesi için boş bir liste yazılır.

`manifest.json` içindeki `contentVersion`, tüm girdi dosyalarının (içerik + model kataloğu)
SHA-256 özetinden türetilir; aynı girdi her zaman aynı sürümü verir. `files` alanı her çıktı
dosyasının `sha256:` özetini içerir. Tekrarlanabilir derleme için `SOURCE_DATE_EPOCH` ortam
değişkeni `generatedAt` alanını sabitler.

### Dönem 1–2 kaynak hattı (İÜC ders kitapları)

Cerrahpaşa Tıp Fakültesi Anatomi AD'nin açık lisanslı (CC BY 4.0) üç ders kitabı, kapsamın ve
Türkçe terimlerin birincil kaynağıdır.

| Komut | Görev |
|---|---|
| `npm run content:iuc` | PDF'leri indirir (sha256 denetimli) ve basılı sayfa numaralı sayfa metinlerini `vendor/iuc/` altına yazar. |
| `npm run content:iuc-terms` | Kitaplardaki "Latince (Türkçe)" çiftlerini çıkarır. Aday listesi `content/terminology/iuc-terimler.json` dosyasına gider. Yalnızca `content/terminology/iuc-kabul.json` dosyasında elle kabul edilen çiftler Türkçe ad olur ve `content/structures/terminoloji/iuc-adlar.json` dosyasına yazılır. Kitapta alıntısı bulunmayan bir kabul komutu durdurur. |
| `npm run content:iuc-scope` | Latince adı kitaplarda geçen yapıları Dönem 1–2 kapsam hedefi yapar: `content/scope/iuc-donem12.json`, düzey "temel". Bölgesi olmayanlar `docs/raporlar/iuc-kapsam-disi.md` dosyasında listelenir. |
| `npm run content:iuc-muscles` | "M. x:" bloklarındaki Başlangıcı / Sonlanışı / İşlevi / Siniri satırlarını birebir alıntıyla kas kartlarına yazar: `content/structures/iuc/kaslar.json`. |
| `npm run content:iuc-cards` | "Latince (Türkçe)" başlıklı bölümlerden, yapının adını anan ilk cümleyi özet, sonraki cümleleri açıklama yapar: `content/structures/iuc/kartlar.json`. Yalnız boş alanları doldurur. Elle incelemede uygunsuz bulunan yapılar gerekçesiyle `content/terminology/iuc-kart-dislama.json` dosyasına eklenir (`yapilar`: tümden dışla, `yalnizOzet`: açıklamayı atla). |
| `npm run content:quotecheck` | `quote` taşıyan her kaynak referansının belirtilen sayfada birebir geçtiğini denetler. İÜC kaynağında `quote` zorunludur. |
| `npm run report:release` | v1.0 sürüm kapılarını ölçer: `docs/raporlar/surum-kapilari.md`. |

**İÜC kaynağından içerik eklerken dört kural geçerli:**
1. `sources` içinde `locator: "s. N"` (basılı sayfa) ve `quote` (sayfadaki birebir metin) verilir. Atlanan kısım "…" ile gösterilir.
2. Alan değeri kısaltılmış veya uyarlanmışsa `note` alanında belirtilir. CC BY 4.0 buna izin verir; değişikliğin belirtilmesi gerekir.
3. `content:quotecheck` geçmeden PR birleştirilmez (CI'da çalışır).
4. Alıntının geçmesi, değerin doğru yapıya bağlandığını kanıtlamaz. Durum uzman incelemesine kadar "doğrulanmadı" kalır.

**Envanterdeki bütün yapılar:** `npm run content:inventory` artık BodyParts3D parça–bütün (part-of)
listesindeki "bütün" kavramları da ekler (kalp, sağ atriyum, mitral kapak, karaciğer, akciğerler,
beyin, kafatası, sternum…). Bir bütün kavramın eklenmesi için üç koşul gerekir:
- adı tek bir TA2 terimiyle eşleşmeli;
- en az iki kayıtlı parçadan oluşmalı;
- parçalarının en az %75'i aynı sistemde olmalı.

"Boyun" ve "el" gibi bölge adları sisteme bağlanmaz. Her parça, onu kapsayan en küçük bütüne
bağlanır; yapı ağacı bu sayede anatomik hiyerarşi kazanır.

## 2. Kimlikler

Kimlikler kalıcıdır; bir kez yayımlanan kimlik yeniden kullanılmaz veya başka bir yapıya verilmez.

| Tür | Biçim | Not |
|---|---|---|
| Yapı | `fma:<numara>`, `uberon:<numara>`, `ax:<ad>` | FMA karşılığı olan yapılarda `fma:` kullanılır. `ax:` yalnızca FMA/UBERON karşılığı bulunmayan uygulama içi kavramlar içindir. FMA numarası tahmin edilmez; eşleşme kaynağından (BodyParts3D, FMA) alınır. |
| Kaynak | `src:<kısa-ad>` | Örn. `src:fipat-ta2`, `src:bodyparts3d` |
| İlişki | `rel:<...>` | Örn. `rel:fma:1-innervated_by-fma:2` |
| İnceleme | `rev:<...>` | Örn. `rev:2026-10-01-fma-23981-text` |
| Ders / soru | `lesson:<...>`, `q:<...>` | |
| Kapsam hedefi | serbest, örn. `hedef:upper_limb.skeletal.humerus` | Yapı oluşunca `structureId` ile bağlanır. |

## 3. Yapı kaydı

Zorunlu alanlar: `id`, `schemaVersion` (şu an 1), `kind`, `names.en`, `systems` (ilki birincil
sistemdir), `laterality`, `detailLevel`, `provenance`. Diğer alanların varsayılanları şemada tanımlıdır.

Önemli alanlar:

- **`laterality`** — `right`/`left` taraflı örnek; `paired_generic` taraftan bağımsız çift yapı
  kavramı; `midline` orta hatta tek yapı; `unpaired` orta hat dışında tek yapı;
  `not_applicable`. Taraflı örnekler `counterpartId` ile karşı taraftakine (iki yönlü) ve
  `genericId` ile genel kavrama bağlanır. Sağ ve sol örnekler asla tek kayıtta birleştirilmez.
- **`parentIds`** — parça-bütün (part-of) üst yapıları. Hiyerarşik olmayan bağlar `relations`'a yazılır.
  Taraflı bir yapı karşı taraftaki bir yapının parçası olamaz; döngü oluşturulamaz.
- **`regions`** ve **`regionBasis`** — bölge ataması ve nasıl belirlendiği
  (`authored`, `derived_from_hierarchy`, `derived_from_geometry`, `unassigned`).
- **`detailLevel`** — `basic` (temel), `intermediate` (orta), `advanced` (ileri). Bu editoryal bir
  karardır ve uzman incelemesinde gözden geçirilir.
- **`variation`** — yapının kendisi bir varyasyonsa `isVariant: true` ve kaynak.
- **`depthLayer`** — bölgesel diseksiyon derinliği (0 = en yüzeyel). Sistem düzeyindeki varsayılan
  katman sırası `systems.json` içindeki `layerOrder` alanıdır (0 = deri); bölgesel diseksiyon için
  yapı düzeyindeki `depthLayer` esas alınır.
- **`content`** — bilgi kartı alanları (bkz. §5).
- **`review`** — metin/etiket/geometri/ilişki inceleme durumları (bkz. uzman-inceleme.md).
- **`provenance.createdBy`** — `import:bodyparts3d`, `author:human`, `author:ai-draft` vb.

### Envanter taslakları ve ekler

`npm run content:inventory`, BodyParts3D öğe listesinden her FMA kavramı için bir taslak yapı üretir:
kimlik (`fma:<n>`), BodyParts3D İngilizce adı (`unverified`), FMA ve öğe kimlikleri, sistem, taraf
(öğe verisinden ya da İngilizce addaki right/left sözcüğünden), model parçasından türetilen bölge ve
adları yalnızca taraf sözcüğüyle ayrışan sağ-sol eşleri. Yapı türü (`kind`) addaki açık sözcüklerden
(muscle, artery, ligament…) ya da sistemden otomatik tahmin edilir ve `provenance.notes` içinde
belirtilir. **Türkçe ve Latince ad üretilmez.** Tüm inceleme durumları `draft` olur.

Taslaklar yeniden içe aktarımda baştan yazılır; bu nedenle elle düzenlenmez. Ad eklemek, bölge
düzeltmek, üst yapı bağlamak gibi işler `content/structures/` altında (örn.
`content/structures/upper_limb/humerus.json`) aynı `id` ile yazılan **ek** (overlay) kayıtlarla
yapılır. Birleştirme kuralları: nesneler alan alan birleşir, diziler ve tekil değerler ekteki
değerle değiştirilir, `null` alanı siler. Birleşmiş kayıt tam şemaya göre doğrulanır.

```json
{
  "id": "fma:XXXXX",
  "names": {
    "la": { "value": "…", "status": "verified", "sources": [{ "sourceId": "src:fipat-ta2", "locator": "TA2 <kimlik numarası>" }] },
    "tr": { "value": "…", "status": "unverified", "sources": [] }
  },
  "regions": ["arm"],
  "regionBasis": "authored",
  "provenance": { "createdBy": "import:bodyparts3d", "createdAt": "…", "updatedAt": "<bugün>" }
}
```

(Örnekteki `XXXXX`, `…` ve `<…>` yer tutucudur; gerçek değerler kaynağından alınır.)

## 4. Adlandırma kuralları (TR / LA / EN)

Her ad bir `nameEntry` kaydıdır: `value`, `status` (`verified` / `unverified`) ve `sources`.

- **Latince ve İngilizce:** Başvuru standardı FIPAT *Terminologia Anatomica*, 2. baskıdır (TA2,
  `src:fipat-ta2`). Bir ad yalnızca TA2'deki ilgili maddeyle **karşılaştırıldıktan sonra**
  `verified` yapılır ve `locator` alanına TA2 kimlik numarası yazılır. TA2'de bulunmayan yapılarda
  kullanılan diğer terminoloji standardı ayrı bir kaynak kaydı olarak eklenir ve belirtilir.
- **BodyParts3D İngilizce adları** terminoloji standardı değildir; içe aktarımda `unverified`
  kalır. TA2 ile karşılaştırılıp gerekirse düzeltildiğinde kaynağı TA2 olarak değiştirilir.
- **Türkçe:** Türkçe karşılık ayrıca doğrulanır (§3 gereksinimi). Türkçe terim için gösterilebilir
  bir kaynak (Türkçe anatomi terminolojisi veya ders kitabı, sayfa/madde ile) yoksa ad
  `unverified` kalır ve `sources` boş bırakılabilir; bu durum raporlarda "doğrulanmadı" olarak görünür.
  Kaynaksız ad asla `verified` yapılmaz (doğrulama bunu hata sayar).
- **Yazım:** Değer kaynağındaki yazımla birebir girilir. Taraflı örneklerde taraf adın içinde açıkça
  yer alır (EN "Right …"/"Left …", TR "Sağ …"/"Sol …"); `paired_generic` kavramın adı taraf içermez.
- **Eş anlamlılar:** eponimler, eski terimler, yaygın adlar ve kısaltmalar `synonyms` altında uygun
  `kind` ile (`eponym`, `former_term`, `common`, `abbreviation`, `synonym`) ve mümkünse kaynakla
  yazılır; ana ad olarak kullanılmaz. Arama bu alanları kullanır.
- **Taksonomi adları** (`systems.json`, `regions.json`) aynı kuralları izler; derlenmiş pakette düz
  metne dönüşür, doğrulama bilgisi `content/` içinde ve raporlarda kalır. Uygulamaya özgü birleşik
  bölgeler (örn. pelvis ve perine) için olmayan bir Latince terim uydurulmaz.
- Aynı dilde iki yapıya aynı ad verilmesi uyarı üretir (arama ve sınavlarda karışıklık).

## 5. İçerik alanları ve durumları

Bilgi kartı alanları: `summary`, `description`, `location`, `parts`, `relationsText`, `function`,
`origin`, `insertion`, `action`, `jointType`, `movements`, `clinicalNotes`, `variations`.
Arteriyel beslenme, venöz dönüş, lenfatik drenaj ve innervasyon metin olarak değil **ilişki**
olarak yazılır (böylece 3B modelde gösterilebilir).

| Yazım | Anlamı | Arayüzdeki etiket |
|---|---|---|
| alan hiç yok | Bu alan için henüz çalışılmadı | Henüz eklenmedi |
| `{ "status": "missing" }` | Alan gerekli ama içerik henüz yazılmadı (bilinçli işaret) | Henüz eklenmedi |
| `{ "status": "not_applicable", "note": "…" }` | Alan bu yapı için anlamlı değil (örn. kemikte origo) | Uygulanamaz |
| `{ "status": "present", "verification": "unverified", … }` | İçerik var, kaynakla karşılaştırılmadı | Doğrulanmadı |
| `… "verification": "source_checked"` | Kaynak kontrolcüsü içeriği gösterilen kaynakla karşılaştırdı | Kaynakla karşılaştırıldı |
| `… "verification": "expert_approved"` | Anatomi uzmanı onayladı; **eşleşen inceleme kaydı zorunlu** | Uzman onaylı |

`present` durumundaki her değer en az bir kaynak gösterir (`sources`). `source_checked` ve
`expert_approved` durumlarında en az bir kaynakta `locator` (bölüm, sayfa, tablo) beklenir.
Varyasyona bağlı ifadeler `variantNote` ile işaretlenir; çelişkili kaynaklarda hangi referansın
kullanıldığı ve diğer görüş `variations` ya da `variantNote` içinde belirtilir.

Kaynak türleri: terminoloji (`terminology`), ontoloji (`ontology`), model kütüphanesi
(`model_library`) ve veri kümesi (`dataset`) kaynakları yapıları **adlandırmaya ve tanımlamaya**
yarar; açıklama, klinik ilişki ve işlev metinleri için ders kitabı, açık ders kitabı veya makale gibi
bir kaynak gerekir. Metni yalnızca bu tür kaynaklara dayanan alanlar uyarı üretir.

Klinik notlar yalnızca eğitim amaçlıdır; kişisel tanı veya tedavi önerisi içermez.

## 6. Kaynak gösterme

Kaynak kaydı (`content/sources/<ad>.json`):

- `citation` kaynakçada görünecek tam künyedir; `shortLabel` kısa gösterimdir.
- `url` yalnızca **resmî olduğundan emin olunan** adrese yazılır; emin olunmayan adresler `notes`
  içinde "doğrulanmadı" diye belirtilir.
- `edition`, `version`, `year`, `doi`, `isbn` yalnızca kaynağın kendisinden kontrol edildiyse yazılır.
- `accessed` yalnızca kaynağa gerçekten erişildiği tarihtir.
- `license` alanında kullanım, değiştirme ve dağıtım izinleri ayrı ayrı yazılır. `verifiedAt`
  (`url`, `date`, isteğe bağlı `quote`) yalnızca lisans metni birincil kaynaktan okunduğunda
  doldurulur. İnternette erişilebilir olmak yeniden kullanım izni sayılmaz. Farklı lisans beyanları
  varsa (örn. BodyParts3D lisans sayfası ile OBJ dosya başlıkları) ikisi de `notes` içinde kayıt
  altına alınır ve daha kısıtlayıcı yükümlülüğe göre davranılır.
- Model varlıklarının kaynaklarında kullanım, değiştirme ve dağıtım izinlerinin üçü de gerekir;
  eksikse derleme hata verir. Doğrulanmamış lisans uyarı üretir ve kapsam raporunda "lisans
  doğrulanmış" sayılmaz.

Kaynak atfı (`SourceRef`): `{ "sourceId": "src:…", "locator": "bölüm/sayfa/tablo/TA2 no", "note": "…" }`.

## 7. İlişkiler

İlişki `from → to` yönündedir ve `from` yapısı açısından okunur: `"from": kas, "type":
"innervated_by", "to": sinir` = "kas, sinir tarafından innerve edilir". Türler ve Türkçe etiketleri
`src/i18n/labels.ts` içindeki `RELATION_LABEL` listesindedir. Her ilişki en az bir kaynak, bir
doğrulama durumu (`verification`) ve `provenance` içerir. Varyasyon ilişkileri `isVariant: true`
ile işaretlenir. Sağ taraftaki bir yapıyı sol taraftaki yapıya bağlayan beslenme, innervasyon,
tutunma, parça-bütün gibi ilişkiler uyarı üretir. Aynı tür/yön/uç çiftinin iki kez yazılması uyarıdır.

## 8. Kapsam matrisi

"Eksiksiz" kavramı `content/scope/` altındaki hedeflerle ölçülür: her hedef bir sistem, bölge, yapı
türü, ayrıntı düzeyi, taraf ve **dayanak kaynağı** (`basis`) içerir. Hedef, yapı kaydı oluşunca
`structureId` ile bağlanır. Çift yapılar için hedef `paired_generic` kavrama bağlanır; model
kapsamı için sağ ve sol örneklerin ikisinin de anatomik modeli gerekir. Bir hedefin tamamlanmış
sayılması için envanter kaydı, anatomik 3B model, üç dilde doğrulanmış ad, zorunlu bilgi kartı
alanları, doğrulanmış model lisansı ve dört boyutta uzman onayı gerekir (gereksinimler §13).
Şematik geçici modeller kapsama sayılmaz. İlk pilot hedef listesi `content/scope/upper_limb-skeletal.json`
dosyasındadır; düzey atamaları editoryal taslaktır.

## 9. Dersler ve sorular

Ders adımları ve yazılmış sorular yapılara kimlikle bağlanır ve kaynak gösterir. Sorunun
çözülebilmesi için görünür olması gereken yapılar `requiresVisible` alanına yazılır. Çoktan seçmeli
sorularda en az iki seçenek ve seçenekler arasında bulunan tek bir doğru cevap olmalıdır. Sorular
eğitim amaçlıdır; kişisel tanı veya tedavi önerisi içermez.

### Ders ekleme

Dersler `content/lessons/<bölge>.json` dosyalarına dizi olarak yazılır (örnek:
`content/lessons/ust-ekstremite.json`). Her adım, ekranda gösterilecek yapıları (`show`),
vurgulanacak yapıları (`focus`), izolasyonu (`isolate`) ve kamera yönünü (`camera`: `anterior`,
`posterior`, `right`, `left`, `superior`, `inferior`) belirtir. Her adımda en az bir kaynak
bulunmalıdır. Uygulama dersten çıkınca öğrencinin önceki sahnesini geri yükler.

```json
{
  "id": "lesson:ust-ekstremite.1-omuz-kusagi",
  "title": "Omuz kuşağı: klavikula ve skapula",
  "level": "basic",
  "systems": ["skeletal"],
  "regions": ["upper_limb"],
  "objectives": [{ "id": "o1", "text": "Omuz kuşağını oluşturan iki kemiği adlandırmak." }],
  "steps": [
    {
      "id": "s1",
      "title": "Omuz kuşağı",
      "body": "Kaynaktan kendi sözcüklerinizle yazılmış açıklama.",
      "focus": ["fma:13322"],
      "show": ["fma:13322", "fma:13395"],
      "isolate": false,
      "camera": "anterior",
      "sources": [{ "sourceId": "src:openstax-ap2e", "locator": "8.1 The Pectoral Girdle" }]
    }
  ],
  "review": "draft",
  "provenance": "author:human"
}
```

### Soru ekleme

Yapıyı bul, adını söyle ve ilişki soruları çalışma zamanında yapı kayıtlarından otomatik
üretilir. **Kesit tanıma** ve klinik bağlamlı sorular otomatik üretilmez; bunlar
`content/questions/<konu>.json` dosyasına elle yazılır (klasör henüz yoktur, ilk soru dosyasıyla
açılır). `type`: `find`, `name`, `relation`, `section` veya `mcq`.

```json
{
  "id": "q:ust-ekstremite.kesit-1",
  "type": "mcq",
  "level": "intermediate",
  "systems": ["skeletal"],
  "regions": ["upper_limb"],
  "prompt": "Soru metni",
  "options": [
    { "id": "a", "text": "Seçenek A", "structureId": "fma:13303" },
    { "id": "b", "text": "Seçenek B", "structureId": "fma:23466" }
  ],
  "answer": { "optionId": "a" },
  "explanation": "Yanıttan sonra gösterilecek, kaynaklı açıklama.",
  "requiresVisible": ["fma:13303", "fma:23466"],
  "sources": [{ "sourceId": "src:openstax-ap2e", "locator": "Bölüm ve başlık" }],
  "review": "draft",
  "provenance": "author:human"
}
```

Kimlik biçimleri ve alanların tamamı için `src/core/schema.ts` dosyasındaki `lessonSchema` ve
`questionSchema` şemalarına bakın. Değişiklikten sonra `npm run content:validate` çalıştırın.

### Yeni 3B model ekleme

1. **Lisans:** Modelin kullanım, değiştirme ve dağıtım izinlerini birincil kaynaktan okuyun.
   `content/sources/<kaynak>.json` kaydını lisans metninden bir alıntı ve tarih içeren
   `license.verifiedAt` alanıyla yazın. İnternette erişilebilir olmak izin anlamına gelmez.
2. **İndirme ve dönüştürme betiği:** `scripts/models/hra/` örneğini izleyin.
   - İndirilen dosyaları `vendor/<kaynak>/` altında sha256 değeriyle önbelleğe alın.
   - Koordinatları `anat-gltf-v1` çerçevesine çevirin: +X sol, +Y üst, +Z ön, metre.
   - GLB'yi `public/models/<kaynak>/` altına yazın.
   - Varlık kaydını `public/data/assets-<kaynak>.json` dosyasına yazın. Bu kayıt her düğümün
     yapı kimliğini, köken zincirini (`provenance`) ve lisans kaynağını içerir.
   - Model tüm vücut modeline hizalı değilse `registeredToBody: false` verin. Uygulama bu
     modelleri ayrı bir görünümde gösterir.
3. **Yapı kayıtları:** Modeldeki her seçilebilir nesne için bir yapı kaydı bulunmalıdır. Mevcut
   bir kaydı (ör. `fma:` kimliği) kullanın ya da `content/structures/<klasör>/` altında yeni kayıt
   açın. Eşleşmesi kesin olmayan düğümleri dışlayın ve nedenini kaydedin.
4. `npm run content:build` çalıştırın. `assets-*.json` dosyaları `assets.json` ile birleştirilir;
   taraf/konum ve eşleşme denetimleri bu adımda yapılır.
5. [model-katalogu.md](model-katalogu.md) belgesine kaynağı, lisansı ve dönüşüm adımlarını
   ekleyin. Kurulumda otomatik çalışması için komutu `package.json` içindeki `setup` betiğine
   ekleyin.
6. Basit geometrik yer tutucu modeller `representation: "schematic"` olarak işaretlenmelidir. Bu
   modeller tamamlanmış anatomik içerik sayılmaz.

## 10. Yapay zekâ taslakları

Yapay zekâ ile üretilen her kayıt `provenance.createdBy: "author:ai-draft"` (ilişki, ders ve
sorularda `provenance: "author:ai-draft"`) ile işaretlenir.

**İçerebilir:**

- Kapsam hedefi ve yapı listesi önerileri (dayanak kaynak gösterilerek).
- Gerçekten mevcut ve atfı doğru bir kaynağa dayanan metin taslakları, `verification: "unverified"` olarak.
- Ad önerileri, `status: "unverified"` olarak.
- Eksik alan ve tutarsızlık listeleri, düzeltme önerileri.

**İçeremez:**

- `source_checked`, `expert_approved` veya ad için `verified` durumu; `approved` inceleme durumu.
- `content/reviews/` altında inceleme kaydı, incelemeci adı veya uzman onayı.
- Uydurulmuş kaynak, künye, sayfa numarası, baskı, erişim tarihi, DOI, TA2 kimlik numarası veya URL.
- Kaynaksız sayısal bilgi (ölçü, açı, hareket açıklığı, oran) veya kaynaksız anatomik ilişki.
- Varyasyonu olağan anatomi gibi sunan ifade; kişisel tanı ya da tedavi önerisi.
- Lisans izni varsayımı veya `license.verifiedAt` kaydı.

Yapay zekâ taslağı, kaynak kontrolünden ve anatomi uzmanı incelemesinden geçmeden "doğrulanmış"
içerik olarak sunulmaz; arayüz bu durumu "Doğrulanmadı" etiketiyle gösterir.

## 11. Doğrulama kontrolleri

`npm run content:validate` şunları denetler (hata = derleme durur, uyarı = `--strict` ile durur):

- Şema: her kayıt `src/core/schema.ts` şemasına uyar (Türkçe hata mesajları).
- Kimlik tekilliği; envanter ve ek birleşimi.
- Referanslar: üst yapılar, karşı taraf ve genel kavram bağlantıları, ilişki uçları, kaynaklar,
  bölgeler, ders/soru yapıları, inceleme hedefleri, model varlığı kaynakları.
- Parça-bütün döngüleri (`parentIds` + `part_of` ilişkileri) ve bölge ağacı döngüleri.
- Taraf tutarlılığı: karşı taraf eşleşmesinin iki yönlü ve zıt taraflı olması, genel kavramın
  `paired_generic` olması, taraflı yapının karşı tarafın parçası olmaması, sağ-sol model
  merkezlerinin kanonik çerçeveye uyması (+X deneğin soludur).
- Doğrulama durumları: `verified` ad ve `present` alanlar için kaynak; `expert_approved` alanlar ve
  `approved` durumlar için anatomi uzmanının en güncel onay kaydı; incelemecisiz inceleme kaydı yok.
- Yinelenen adlar ve ilişkiler; zayıf metin kaynağı; konumsuz doğrulama.
- Model düğümlerinin envanterde karşılığı (yoksa uyarı); model kaynağının lisans izinleri.

Doğrulamanın geçmesi içeriğin doğru olduğu anlamına gelmez; yalnızca iddia edilen durumların
gerekli kayıtlarla desteklendiğini gösterir.

## 12. Yeni yapı ekleme adımları (özet)

1. Kapsam hedefini `content/scope/` altında (dayanak kaynakla) ekleyin veya mevcut hedefi bulun.
2. Yapı envanterde varsa (`_inventory`) bir ek dosyası açın; yoksa kaynakta karşılığı olan kalıcı
   kimlikle tam kayıt yazın.
3. Adları kaynağıyla girin; doğrulamadığınız adları `unverified` bırakın.
4. Bilgi kartı alanlarını kaynak ve konum göstererek yazın; uygulanamaz alanları işaretleyin.
5. Beslenme, innervasyon, tutunma ve komşulukları `content/relations/` altında ilişki olarak ekleyin.
6. `npm run content:validate` çalıştırın; hataları giderin.
7. İlgili inceleme boyutlarını `source_check_pending` durumuna getirin; süreç uzman-inceleme.md'deki gibi ilerler.
8. `npm run report:coverage` ile kapsam raporunu güncelleyin.
