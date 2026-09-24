# Uzman inceleme süreci

Anatomik içeriğin uzman tarafından incelenmesi, içerik üretiminden **ayrı** bir süreçtir
([gereksinimler.md](gereksinimler.md) §12, §13). Bu belge durumları, rolleri, incelemecilerin neyi
kontrol ettiğini ve kayıtların nasıl tutulduğunu (denetim izi) tanımlar. İçerik yazım kuralları için
bkz. [icerik-rehberi.md](icerik-rehberi.md).

**Mevcut durum:** Henüz hiçbir içerik anatomi uzmanınca incelenmedi; `content/reviews/` boştur.
Uygulama bu durumu açıkça gösterir. İnceleme kaydı veya onaylayan kişi uydurulmaz.

## 1. Temel kurallar

1. Yayın onayını (`approved`) yalnızca adı belirtilmiş bir **anatomi uzmanı** (`anatomy_expert`) verir.
2. Her insan kararı `content/reviews/` altında bir **inceleme kaydı** olarak yazılır. Yapı, ilişki,
   model, ders ve soru kayıtlarındaki durum alanları bu kayıtların özetidir; kayıt olmadan
   `approved` durumu derlemeyi durdurur.
3. Metin, ad/etiket, 3B geometri ve ilişkiler **ayrı ayrı** incelenir. Metnin onaylanması modelin
   geometrisinin onaylandığı anlamına gelmez.
4. Otomatik kontroller (şema ve bütünlük doğrulaması, testler, yapay zekâ ile iddia karşılaştırma)
   inceleme kaydı değildir; yapı kaydındaki `automatedChecks` alanına yazılır ve raporlarda insan
   incelemesinden ayrı gösterilir.

## 2. Roller

| Rol (`reviewer.role`) | Görev | Verebileceği durumlar |
|---|---|---|
| Yazar (kayıt değil; `provenance`) | İçeriği kaynakla yazar veya yapay zekâ taslağını hazırlar | `draft`, `source_check_pending` (inceleme kaydı gerekmez) |
| `source_checker` — kaynak kontrolcüsü | Her ifadeyi gösterilen kaynak ve konumla karşılaştırır; adları TA2 ve Türkçe kaynakla karşılaştırır; lisans kayıtlarını birincil kaynaktan doğrular | `expert_review_pending`, `needs_revision`; alan düzeyinde `source_checked`, ad düzeyinde `verified` |
| `editor` — editör | Dil, biçim, tutarlılık; öğrenci hata bildirimlerinin ön değerlendirmesi | `needs_revision`, `source_check_pending` |
| `anatomy_expert` — anatomi uzmanı | Anatomik doğruluk, ayrıntı düzeyi, varyasyon ayrımı, model-kayıt eşleşmesi | `approved`, `needs_revision`; alan düzeyinde `expert_approved` |

Bir kişi farklı zamanlarda farklı rollerde bulunabilir, ancak aynı içeriğin kaynak kontrolünü ve
uzman onayını aynı kişinin yapmaması önerilir. İncelemecinin adı, isteğe bağlı kurumu ve ORCID'i
kayıtta görünür; bu bilgiler yalnızca kişinin açık izniyle yazılır.

## 3. Durumlar ve geçişler

Durumlar `src/core/schema.ts` içindeki `REVIEW_STATUSES` listesidir; Türkçe etiketleri
`src/i18n/labels.ts` içindedir.

| Durum | Etiket | Anlamı | Gereken kayıt |
|---|---|---|---|
| `draft` | Taslak | Yazım sürüyor ya da içe aktarılmış ham veri | — |
| `source_check_pending` | Kaynak kontrolü bekliyor | Yazar içeriği kaynak kontrolüne gönderdi | — (isteğe bağlı kayıt) |
| `expert_review_pending` | Anatomi uzmanı incelemesi bekliyor | Kaynak kontrolü tamam | İncelemecisi belirtilmiş kayıt önerilir |
| `needs_revision` | Düzeltme gerekli | Kaynak kontrolcüsü, editör veya uzman düzeltme istedi | İncelemecisi belirtilmiş kayıt **zorunlu** (gerekçe `notes` içinde) |
| `approved` | Yayına onaylı | Anatomi uzmanı onayladı | `anatomy_expert` rolünde, adı belirtilmiş kayıt **zorunlu** |

Olağan akış:

```
draft → source_check_pending → expert_review_pending → approved
                 ↑                      │         │
                 └──── needs_revision ←─┴─────────┘  (düzeltme sonrası yeniden kaynak kontrolü)
```

Onaylanmış içerik değiştirilirse ilgili boyutun durumu `source_check_pending`'e döner ve yeni
inceleme gerekir. Onay, onaylandığı içerik sürümü için geçerlidir (`contentVersion` alanı).

## 4. İnceleme boyutları

| Hedef türü | Boyutlar (`aspect`) | Durumun tutulduğu yer |
|---|---|---|
| Yapı (`structure`) | `text`, `labels`, `geometry`, `relations` | `review.text`, `review.labels`, `review.geometry`, `review.relations`; alan düzeyinde `content.<alan>.verification`; adlarda `names.<dil>.status` |
| İlişki (`relation`) | `relations` | `review`, `verification` |
| Model varlığı (`asset`) | `geometry` | `review.geometry` |
| Soru (`question`) | `question` | `review` |
| Ders (`lesson`) | `lesson` | `review` |

Hedef türüne uymayan boyutla yazılan kayıt (örn. ilişkiye `text` incelemesi) hata sayılır.

## 5. İncelemecilerin kontrol ettikleri

**Kaynak kontrolü (her boyut için):** Her ifade gösterilen kaynakta, gösterilen konumda (bölüm,
sayfa, tablo, TA2 numarası) gerçekten var mı; kaynak türü ifadeye uygun mu (terminoloji kaynağı
açıklama metnine dayanak olamaz); künye, baskı ve lisans kaydı doğru mu; uydurulmuş veya
doğrulanamayan atıf var mı.

**Metin (`text`):** Anatomik doğruluk; seçilen ayrıntı düzeyine uygunluk; olağan anatomi ile
varyasyonların ayrılması; çelişkili bilgilerde kullanılan referansın belirtilmesi; klinik notların
yalnızca eğitim amaçlı olması (tanı/tedavi önerisi olmaması); Türkçe dil ve terim tutarlılığı;
"uygulanamaz" ve "henüz eklenmedi" işaretlerinin doğru kullanımı.

**Adlar ve etiketler (`labels`):** Latince ve İngilizce adların TA2 ile uyumu; Türkçe karşılığın
kaynağı; eş anlamlılar, eponimler ve eski terimlerin doğru türde işaretlenmesi; taraf bilgisinin
adda ve kayıtta doğru olması; 3B etiketin doğru nesneye bağlı olması.

**3B geometri (`geometry`):** Model nesnesinin gerçekten ilgili yapıyı temsil etmesi (model
düğümü ↔ yapı kimliği); sağ-sol ve yön doğruluğu; komşu yapılarla konum uyumu; eksik veya fazla
parça; sadeleştirme sırasında küçük ama önemli yapıların kaybolmaması; şematik modellerin
"şematik" olarak işaretli olması; iç yapısı olmayan organların kesitte iç anatomi varmış gibi
görünmemesi. Geometri incelemesi kaydı model varlığı (`asset`) ve/veya yapı üzerinden yazılır.

**İlişkiler (`relations`):** İlişki türü ve yönü; iki ucun doğru yapılar (doğru taraf) olması;
varyasyon ilişkilerinin işaretlenmesi; kaynak.

**Sorular ve dersler:** Tek ve doğru cevap; cevabın içerik kayıtlarıyla tutarlılığı; sorunun
görünür ve seçilebilir yapılarla çözülebilir olması; sınav sırasında cevabı açığa çıkaran ipucu
bulunmaması; açıklama ve kaynak.

## 6. İnceleme kaydı yazma

Kayıtlar `content/reviews/` altında, tercihen yıl/ay klasörlerinde tutulur
(örn. `content/reviews/2026/10.json`). Biçim (`reviewRecordSchema`):

```json
{
  "id": "rev:<tarih>-<hedef>-<boyut>",
  "target": { "type": "structure", "id": "<yapı kimliği>" },
  "aspect": "text",
  "status": "approved",
  "reviewer": { "name": "<Ad Soyad>", "role": "anatomy_expert", "affiliation": "<Kurum>" },
  "date": "<YYYY-AA-GG>",
  "contentVersion": "<npm run content:build çıktısındaki içerik sürümü>",
  "notes": "<Kontrol edilen kaynaklar, kararlar, varsa çekinceler>"
}
```

(Açılı parantezli değerler yer tutucudur; bu bir şablondur, gerçek bir inceleme kaydı değildir.)

Kurallar (doğrulama tarafından denetlenir):

- `draft` ve `source_check_pending` dışındaki her durumda `reviewer` (ad ve rol) zorunludur.
- `approved` durumunda `reviewer.role` yalnızca `anatomy_expert` olabilir.
- Hedef kaydın durum alanı, o hedef ve boyut için **en güncel** (en son tarihli) kayıtla uyumlu
  olmalıdır. `approved` durumu ve `expert_approved` alan durumu, en güncel kaydın bir anatomi
  uzmanının `approved` kaydı olmasını gerektirir; daha sonra yazılmış bir `needs_revision` kaydı
  onayı geçersiz kılar.
- Kaydın hedefi var olmalı ve boyut hedef türüne uymalıdır.
- İnceleme yapıldığında yapının `lastReviewedAt` alanı güncellenir.

## 7. Denetim izi

- İnceleme kayıtları **yalnızca eklenir**; eski kayıt silinmez veya değiştirilmez. Yeni karar yeni
  kayıttır. Hata düzeltmeleri de açıklamalı yeni kayıtla yapılır.
- Her kayıt git geçmişinde kimin, ne zaman, hangi içerik sürümü (`contentVersion`) için karar
  verdiğini gösterir; içerik sürümü girdi dosyalarının özetinden hesaplandığı için onaylanan
  içerik yeniden üretilebilir.
- Onay sonrası içerik değişikliklerini yakalamak için değişiklik yapan kişi ilgili boyutu yeniden
  `source_check_pending` durumuna çeker. (Onaylanan alanların özetinin kayda eklenmesi ve
  değişikliğin otomatik saptanması sonraki bir geliştirme adımıdır.)

## 8. Öğrenci hata bildirimleri

Öğrenciler hatalı etiket, ad, ilişki, model konumu veya metin bildirebilir. Bildirim yapı kimliği,
kategori, içerik sürümü ve görünüm bilgisiyle kaydedilir (`errorReportSchema`). Editör bildirimi
değerlendirir; hata doğrulanırsa ilgili hedef ve boyut için `needs_revision` inceleme kaydı yazılır
ve düzeltme olağan akışla (kaynak kontrolü → uzman incelemesi) yeniden onaylanır.

## 9. Raporlama ve arayüz

- `npm run content:validate` otomatik kontrol sonuçlarını, `npm run report:coverage` kapsam ve
  inceleme durumlarını raporlar; kapsam raporunda insan inceleme kayıtları ve otomatik kontroller
  ayrı bölümlerde verilir.
- Arayüz her alan ve boyut için durumu gösterir ("Doğrulanmadı", "Kaynakla karşılaştırıldı",
  "Uzman onaylı", "Anatomi uzmanı incelemesi bekliyor" vb.). İncelenmemiş içerik onaylıymış gibi
  gösterilmez.
- Uzman onayı olmayan içerik yayında kalabilir, ancak açıkça "incelenmedi" olarak işaretlenir ve
  kapsam raporunda tamamlanmış sayılmaz.
