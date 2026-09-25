# Test raporu

Tarih: 2026-09-25 · Ortam: Linux, Node 22.22, Chromium (Playwright, SwiftShader ile yazılımsal
WebGL). Tüm sonuçlar bu oturumda komutlar çalıştırılarak alındı.

> **Otomatik testler ve insan incelemesi ayrı raporlanır.** Aşağıdaki otomatik kontroller
> anatomik doğruluğu kanıtlamaz ve anatomi uzmanı incelemesinin yerine geçmez.

## 1. Otomatik kontroller

| Kontrol | Komut | Sonuç |
|---|---|---|
| TypeScript | `npm run typecheck` | Hata yok |
| ESLint | `npm run lint` | Hata yok |
| Birim testleri | `npm test` | **402/402 geçti** (32 dosya) |
| Üretim derlemesi | `npm run build` | Başarılı |
| İçerik doğrulama | `npm run content:validate` | **0 hata, 4 uyarı** (aşağıda) |
| Uçtan uca + erişilebilirlik | `npm run test:e2e` | **16/16 geçti** |

### Birim testleri (dosya başına test sayısı)

| Alan | Dosyalar |
|---|---|
| İçerik hattı | `content.test` 4, `compile` 8, `integrity` 14, `inventory` 14, `manifest` 3, `terminology` 7, `coverage` 4 |
| Model hattı | `build.e2e` 11, `classify` 18, `download` 9, `mesh` 10, `obj` 11 |
| Veri ve arama | `contentIndex` 6, `loader` 7, `searchIndex` 32 |
| Öğrenme | `generator` 33, `grading` 15, `guidedTour` 8, `prepareScene` 17, `rng` 6, `session` 10 |
| Durum ve kullanıcı verisi | `sceneStore` 6, `srs` 11, `userDb` 52 |
| Görüntüleyici | `engine` 16, `fetchAsset` 8, `keyboard` 3, `labels` 7, `math` 29, `styles` 10, `ViewerCanvas` 10 |
| Arayüz | `ui` 3 |

### Uçtan uca testler (gerçek modellerle)

1. Uygulama içeriği yükler: ağaç, arama ve 3B alanı hazır; konsol hatası yok.
2. "kol kemiği" araması: bilgi kartında kaynaklı TR/LA/EN adlar.
3. Sistem ağacı: dal açılır ve yapı seçilir.
4. Gizle → araç çubuğu ve Ctrl+Z ile geri al, yinele.
5. Ağaçta yalnızca klavye ile gezinme ve seçim.
6. Not, kayıtlı görünüm ve hata bildirimi yeniden yüklemeden sonra korunur.
7. Rehberli ders adım adım ilerler; erişilebilirlik ihlali yok.
8. Kadın yapısı seçilince HRA modeli görünümü açılır.
9. Sınav (ad modu) başlar ve soru gösterir.
10. Ayarlar: tema ve yazı boyutu yeniden yüklemeden sonra korunur.
11–16. axe-core taraması: Keşfet, Sınav ve Ayarlar görünümleri, açık ve koyu temada.

**Erişilebilirlik:** axe-core (WCAG 2.0/2.1/2.2 A ve AA kuralları ile best-practice) altı
taramada **ciddi veya kritik ihlal bulmadı**. Daha düşük önemdeki bulgular test raporuna ek
olarak kaydedilir. Ekran okuyucu ile elle test **yapılmadı**.

**Kararlılık notu:** Tam koşuda bir kez başarısız olan 6 numaralı test incelendi. Test, IndexedDB
yazmaları tamamlanmadan sayfayı yeniden yüklüyordu. Test, yeniden yüklemeden önce kayıt
onaylarını bekleyecek şekilde düzeltildi. Düzeltmeden sonra tam koşu 16/16 geçti ve test 4 kez
art arda (12/12) geçti. Uygulamada veri kaybı yoktu; bu bir test zamanlama hatasıydı.

### İçerik doğrulama uyarıları

Dört sağ/sol çiftinde modelin ağırlık merkezi, adın belirttiği tarafla çelişiyor ya da çift orta
hatta üst üste biniyor: `fma:21385`, `fma:37388`, `fma:46633`, `fma:4843`. Bunlar
`content/structures/denetim/taraf-uyusmazliklari.json` dosyasında kayıtlıdır. Kaynak modelde mi,
adlandırmada mı hata olduğuna bir uzman karar vermelidir.

## 2. İnsan incelemesi

| İnceleme | Durum |
|---|---|
| Anatomi uzmanı incelemesi (metin, ad, geometri, ilişki) | **Yapılmadı: 0 inceleme kaydı, 0 onaylı yapı** |
| Türkçe terminoloji incelemesi | Yapılmadı |
| Yardımcı teknolojiyle (ekran okuyucu) erişilebilirlik testi | Yapılmadı |
| Gerçek cihazlarda (mobil, düşük donanım) kullanılabilirlik ve performans | Yapılmadı |

Süreç için: [../uzman-inceleme.md](../uzman-inceleme.md). Performans ölçümleri:
[performans.md](performans.md).
