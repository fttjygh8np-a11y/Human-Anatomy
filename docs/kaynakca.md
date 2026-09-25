# Kaynakça

Bu belge `content/sources/*.json` kayıtlarının özetidir. Her içerik değeri bu kaynaklardan birine
kimliğiyle (`src:…`) atıf yapar. Lisans sütunundaki "doğrulandı" ifadesi, lisans metninin bu
çalışmada birincil kaynaktan okunduğunu ve tarihiyle `license.verifiedAt` alanına kaydedildiğini
gösterir. "Doğrulanmadı" ise lisans koşullarının okunamadığı anlamına gelir.

| Kimlik | Kaynak | Kullanım | Lisans | Lisans durumu |
|---|---|---|---|---|
| `src:bodyparts3d` | BodyParts3D 4.0. Database Center for Life Science (DBCLS), Japonya. https://dbarchive.biosciencedbc.jp/en/bodyparts3d/desc.html | 3B geometri, İngilizce adlar, FMA eşleşmesi | CC BY 4.0 | Doğrulandı (2026-09-25) |
| `src:hra` | Human Reference Atlas (HRA) 3D Reference Object Library. HuBMAP. https://humanatlas.io/3d-reference-library | Kadın üreme organları geometrisi, İngilizce adlar, FMA/UBERON eşleşmesi | CC BY 4.0 | Doğrulandı (2026-09-25, `metadata.json`) |
| `src:openstax-ap2e` | *Anatomy and Physiology 2e*. OpenStax, Rice University. https://openstax.org/details/books/anatomy-and-physiology-2e | Açıklama, konum, fonksiyon, kas bağlantıları ve dersler (kendi sözcüklerimizle yazılmış özetler; birebir alıntı yok) | CC BY-NC-SA 4.0 | Doğrulandı (2026-09-25). **Ticari olmayan kullanım** ve **aynı lisansla paylaşım** koşulu vardır. |
| `src:wikidata` | Wikidata. Wikimedia Foundation. https://www.wikidata.org/ | Kimlik eşleşmeleri, ilişkiler, Türkçe adlar (ikinci kaynak) | CC0 1.0 | Doğrulandı (2026-09-25, Wikidata:Licensing) |
| `src:fipat-ta2` | FIPAT. *Terminologia Anatomica*, 2. baskı (TA2). https://fipat.library.dal.ca/. Terim listesi OpenAnatomy TA2 Viewer (https://ta2viewer.openanatomy.org/) üzerinden okundu. | Latince adlar (TA2 kimliğiyle) | Tekil terim, atıfla | **Doğrulanmadı.** FIPAT sitesine bu çalışma ortamından erişilemedi. |
| `src:tdk-gts` | Türk Dil Kurumu. *Güncel Türkçe Sözlük*. https://sozluk.gov.tr/ | Türkçe adlar (yalnızca "anatomi" veya "tıp" etiketli maddeler) | Tekil terim, atıfla | **Doğrulanmadı.** Kullanım koşulları okunamadı. |
| `src:fma` | Foundational Model of Anatomy (FMA). University of Washington. | Kimlikler (`fma:`) | CC BY 3.0 (kayıtlı) | Doğrulanmadı |
| `src:uberon` | Uberon multi-species anatomy ontology. OBO Foundry. | Kimlikler (`uberon:`) | CC BY 3.0 (kayıtlı) | Doğrulanmadı |

## Notlar

- **Türkçe anatomi terminolojisi:** Açık erişimli ve yetkili bir Türkçe anatomi terimleri
  kaynağı bulunamadı. TDK genel dil sözlüğüdür; Wikidata etiketleri topluluk katkısıdır. Bu
  nedenle tüm Türkçe adlar "doğrulanmadı" durumundadır. Bir anatomi uzmanının bu adları Türk
  Anatomi ve Klinik Anatomi Derneği terminolojisi gibi yetkili bir kaynakla karşılaştırması
  gerekir.
- **TDK API:** Yalnızca herkese açık `/gts` uç noktası kullanıldı. Yetkili arayüze özel uç
  noktalar kullanılmadı.
- **Latince adlar:** Terimler TA2 kimlik numarasıyla (`locator: "TA2 ID n"`) kaynaklanır. Terim
  listesinin anlık görüntüsü `vendor/terminology/ta2.json` dosyasında sha256 ve tarihle tutulur.
  Bir eşleşme dışlama listesindedir (`content/terminology/ta2-dislama.json`).
- **Sayfa numaraları:** OpenStax kaynaklı alanlarda bölüm ve başlık adları bulunur. Doğrulanmamış
  sayfa numarası verilmez.
- Model dosyalarının ayrıntılı kökeni ve dönüşüm adımları [model-katalogu.md](model-katalogu.md)
  belgesindedir.
