# v1.0 sürüm kapıları

Oluşturma: 2026-09-25T18:15:19.640Z · içerik sürümü `9cb374bfdeed33e1` · `npm run report:release`

> Otomatik ölçümdür. Uzman incelemesi, gerçek cihaz ölçümü ve pilot gibi insan gerektiren kapılar,
> kanıtları depoya girene kadar açık görünür. Hedef yapılar: kapsam matrisindeki (İÜC Dönem 1–2 +
> elle yazılmış) ve envanterde karşılığı olan yapılar.

| # | Kapı | Hedef | Ölçülen | Durum |
| --- | --- | --- | --- | --- |
| 1 | Kapsam | Dönem 1–2 hedeflerinin tamamı kapsam matrisinde ve envanterde | 350 hedef yapı (kitaplarda geçen, bölgesi atanmış); bölgesi olmayanlar: docs/raporlar/iuc-kapsam-disi.md | 🟡 |
| 2 | 3B model | ≥ %90 anatomik model | 347/350 (%99) | ✅ |
| 3 | Adlar | LA %100; TR kitapta varsa kitaptan; ekranda yalnız İngilizce ad yok | LA 341/350 (%97) · TR 156/350 (%45) (kitaptan alıntılı 51) · yalnız İngilizce 1 | 🟡 |
| 4 | Bilgi kartı | Zorunlu alanlar %100, kitaptan alıntılı | 119/350 (%34) tamam · kitaptan alıntılı alanı olan 0 | 🟡 |
| 5 | İlişkiler | Kitapta geçen sinir/arter/ven ilişkileri kayıtlı | En az bir ilişkisi olan hedef: 174/350 (%50) | 🟡 |
| 6 | Öğrenme | Her kitap bölümüne ders; her hedef ≥ 2 soruda; bölge başına kesit sorusu | Ders 3 · yazılı soru 0 · kesit sorusu 0 · ≥2 yazılı soruda geçen hedef 0/350 (%0) | 🟡 |
| 7 | Teknik | Üç tarayıcıda e2e/axe yeşil; gerçek cihazda ≥ 30 FPS; PWA | CI: yalnız Chromium. Gerçek cihaz FPS ölçülmedi. PWA yok (docs/raporlar/performans.md). | 🟡 |
| 8 | Yasal | Kullanılan kaynakların lisansı birincil kaynaktan doğrulanmış; uygulamada atıf ve uyarı | Lisansı doğrulanmamış kullanılan kaynak: TA2 (FIPAT), TDK Güncel Türkçe Sözlük | 🟡 |
| 9 | Uzman | Onay yoksa açıkça gösterilir; inceleme ekranı hazır | Uzman onaylı inceleme kaydı: 0. Uygulama "uzman onayından geçmemiştir" uyarısını gösteriyor. | ❌ |
