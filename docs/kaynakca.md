# Kaynakça

Bu belge `content/sources/*.json` kayıtlarının özetidir. Her içerik değeri bu kaynaklardan birine
kimliğiyle (`src:…`) atıf yapar. Lisans sütunundaki "doğrulandı" ifadesi, lisans metninin bu
çalışmada birincil kaynaktan okunduğunu ve tarihiyle `license.verifiedAt` alanına kaydedildiğini
gösterir. "Doğrulanmadı" ise lisans koşullarının okunamadığı anlamına gelir.

| Kimlik | Kaynak | Kullanım | Lisans | Lisans durumu |
|---|---|---|---|---|
| `src:iuc-lokomotor` | Yıldız YZ, Marur T, Demirci MS, ed. *Lokomotor Sistem Anatomisi*. İÜC Üniversite Yayınevi; 2024. DOI 10.5152/3900 | Dönem 1–2 kapsamı; Türkçe/Latince adlar; kemik, eklem ve kas açıklamaları (sayfa numaralı alıntı) | CC BY 4.0 | Doğrulandı (2026-09-25, künye sayfası) |
| `src:iuc-ic-organlar` | Soyluoğlu Aİ, Tanyeli E, Goral K, ed. *İç Organlar Anatomisi*. İÜC Üniversite Yayınevi; 2024. DOI 10.5152/7800 | Dönem 1–2 kapsamı; iç organ adları ve açıklamaları | CC BY 4.0 | Doğrulandı (2026-09-25, künye sayfası) |
| `src:iuc-noroanatomi` | Ertem AD, Özkuş K, Adıgüzel Şahin Z, ed. *Nöroanatomi Ders Notları*. İÜC Yayınevi; 2024. DOI 10.5152/7900 | Dönem 1–2 kapsamı; nöroanatomi adları ve açıklamaları | CC BY 4.0 | Doğrulandı (2026-09-25, künye sayfası) |
| `src:bodyparts3d` | BodyParts3D 4.0. Database Center for Life Science (DBCLS), Japonya. https://dbarchive.biosciencedbc.jp/en/bodyparts3d/desc.html | 3B geometri, İngilizce adlar, FMA eşleşmesi | CC BY 4.0 | Doğrulandı (2026-09-25) |
| `src:hra` | Human Reference Atlas (HRA) 3D Reference Object Library. HuBMAP. https://humanatlas.io/3d-reference-library | Kadın üreme organları geometrisi, İngilizce adlar, FMA/UBERON eşleşmesi | CC BY 4.0 | Doğrulandı (2026-09-25, `metadata.json`) |
| `src:openstax-ap2e` | *Anatomy and Physiology 2e*. OpenStax, Rice University. https://openstax.org/details/books/anatomy-and-physiology-2e | Açıklama, konum, fonksiyon, kas bağlantıları ve dersler (kendi sözcüklerimizle yazılmış özetler; birebir alıntı yok) | CC BY-NC-SA 4.0 | Doğrulandı (2026-09-25). **Ticari olmayan kullanım** ve **aynı lisansla paylaşım** koşulu vardır. |
| `src:wikidata` | Wikidata. Wikimedia Foundation. https://www.wikidata.org/ | Kimlik eşleşmeleri, ilişkiler, Türkçe adlar (ikinci kaynak) | CC0 1.0 | Doğrulandı (2026-09-25, Wikidata:Licensing) |
| `src:fipat-ta2` | FIPAT. *Terminologia Anatomica*, 2. baskı (TA2). https://fipat.library.dal.ca/. Terim listesi OpenAnatomy TA2 Viewer (https://ta2viewer.openanatomy.org/) üzerinden okundu. | Latince adlar (TA2 kimliğiyle) | Tekil terim, atıfla | **Doğrulanmadı.** FIPAT sitesine bu çalışma ortamından erişilemedi. |
| `src:tdk-gts` | Türk Dil Kurumu. *Güncel Türkçe Sözlük*. https://sozluk.gov.tr/ | Türkçe adlar (yalnızca "anatomi" veya "tıp" etiketli maddeler) | Tekil terim, atıfla | **Doğrulanmadı.** Kullanım koşulları okunamadı. |
| `src:fma` | Foundational Model of Anatomy (FMA). University of Washington. | Kimlikler (`fma:`) | CC BY 3.0 (kayıtlı) | Doğrulanmadı |
| `src:uberon` | Uberon multi-species anatomy ontology. OBO Foundry. | Kimlikler (`uberon:`) | CC BY 3.0 (kayıtlı) | Doğrulanmadı |

## Notlar

- **İÜC ders kitapları:** İstanbul Üniversitesi-Cerrahpaşa, Cerrahpaşa Tıp Fakültesi Anatomi Ana Bilim
  Dalı öğretim üyelerince yazılmıştır. Uygulamanın Dönem 1–2 kapsamı ve Türkçe terimleri bu kitaplara
  dayanır. Bu kaynaktan alınan her değer, kaynaktaki birebir metni (`quote`) ve sayfa numarasını taşır.
  `npm run content:quotecheck` her alıntının belirtilen sayfada gerçekten geçtiğini otomatik olarak
  denetler (PDF'ler `npm run content:iuc` ile indirilir, sha256 denetimlidir). Bu denetim "kaynak böyle
  diyor mu?" sorusunu yanıtlar; değerin doğru yapıya bağlandığını ve güncel olduğunu ise yalnızca bir
  anatomi uzmanının incelemesi doğrulayabilir.

- **Türkçe anatomi terminolojisi:** Türkçe adlarda birincil kaynak İÜC ders kitaplarıdır (tıp
  fakültesi anatomi öğretim üyelerince yazılmış, açık lisanslı). TDK (genel dil sözlüğü) ve Wikidata
  (topluluk katkısı) yalnızca kitapta karşılığı bulunmayan yapılar için ikincil kaynak olarak kalır.
  Tüm Türkçe adlar uzman incelemesine kadar "doğrulanmadı" durumundadır.
- **TDK API:** Yalnızca herkese açık `/gts` uç noktası kullanıldı. Yetkili arayüze özel uç
  noktalar kullanılmadı.
- **Latince adlar:** Terimler TA2 kimlik numarasıyla (`locator: "TA2 ID n"`) kaynaklanır. Terim
  listesinin anlık görüntüsü `vendor/terminology/ta2.json` dosyasında sha256 ve tarihle tutulur.
  Bir eşleşme dışlama listesindedir (`content/terminology/ta2-dislama.json`).
- **Sayfa numaraları:** OpenStax kaynaklı alanlarda bölüm ve başlık adları bulunur. Doğrulanmamış
  sayfa numarası verilmez.
- Model dosyalarının ayrıntılı kökeni ve dönüşüm adımları [model-katalogu.md](model-katalogu.md)
  belgesindedir.
