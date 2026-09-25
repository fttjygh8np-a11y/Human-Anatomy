# Durum raporu: tamamlanan, eksik ve doğrulama bekleyen işler

Tarih: 2026-09-25. Sayılar `npm run report:inventory`, `npm run report:coverage`,
`npm run content:validate` ve test komutlarının bu tarihteki çıktılarından alınmıştır.

> **Özet:** Uygulama çalışıyor. Tüm vücut modeli, arama, bilgi kartı, katmanlar, diseksiyon,
> kesit, sınav, dersler ve kişisel araçlar kullanılabilir. **Hiçbir yapı uzman incelemesinden
> geçmemiştir.** Gereksinimlerin tanımına göre (§13) tamamlanmış yapı sayısı **0**'dır. Adlar ve
> açıklamalar kaynaklıdır ama doğrulanmamıştır. Bazı sistemlerin modelleri eksiktir; hareket ve
> radyoloji modülleri yoktur.

Durum işaretleri: ✅ tamamlandı · 🟡 kısmen / doğrulama bekliyor · ❌ eksik

## Sayısal durum

| Ölçüt | Değer |
|---|---|
| Yapı kaydı (envanter) | 2251 (BodyParts3D 2214, HRA 37) |
| Anatomik 3B modeli olan | 2246 |
| Latince adı olan (TA2, doğrulanmadı) | 1374 (%61) |
| Türkçe adı olan (TDK/Wikidata/elle, doğrulanmadı) | 402 (%18) |
| Kaynaklı açıklaması olan | 119 (%5; yalnızca iskelet sistemi) |
| En az bir ilişkisi olan | 452 (%20); 600 Wikidata ilişkisi |
| Kapsam matrisi hedefi | 119; tamamlanmış **0/119** |
| Uzman onaylı yapı | **0** |
| Birim testi / E2E testi | 402/402, 16/16 geçti |

Ayrıntılar: [raporlar/envanter.md](raporlar/envanter.md), [raporlar/kapsam.md](raporlar/kapsam.md),
[raporlar/test.md](raporlar/test.md), [raporlar/performans.md](raporlar/performans.md).

## Gereksinim bölümlerine göre

### §1 Ürün hedefi: 🟡
Türkçe arayüzlü, kaynak temelli 3B uygulama çalışıyor. İçerik uzman onaylı olmadığından
"doğruluğu denetlenmiş öğrenme aracı" hedefi henüz karşılanmadı.

### §2 Anatomik kapsam: 🟡
- ✅ Sistem × bölge × yapı × düzey kapsam matrisi (`content/scope/`, 119 hedef) ve tam envanter
  raporu (2251 yapı).
- 🟡 İskelet (366), kas (570), dolaşım (784), sinir (155), solunum (119), sindirim (138) sistemleri
  BodyParts3D modelleriyle geniş biçimde var.
- ❌ **Modeli bulunamayan yapılar** (envanterde yok): deri katmanları ve deri ekleri (yalnızca 3
  kayıt), lenf düğümü grupları ve lenf damarları (lenfatik 4 kayıt), meninksler, ventriküler
  sistem, pleksuslar, kemik yüzey işaretleri, delik ve kanallar, fasya ve kompartımanlar, dişler,
  seröz zarlar ve boşluklar, göz ve kulağın iç yapıları, üriner (8) ve endokrin (4) yapıların
  çoğu, erkek dış genital yapıların bir kısmı.
  - **Gereken:** Kullanım, değiştirme ve dağıtım izni doğrulanmış ek 3B model kaynakları
    (ör. lisansı uygun Z-Anatomy/BodyParts3D türevleri) veya uzman gözetiminde modelleme.
- 🟡 Kadın üreme organları: HRA modelleri ayrı bir görünüm olarak eklendi (37 yapı). Başka bir
  donöre ait oldukları için tüm vücut modeline hizalı değildir.
- 🟡 407 yapının bölgesi atanmamış (otomatik bölge ataması yapılamadı).

### §3 Doğruluk ve kaynak yönetimi: 🟡
- ✅ Her ad, açıklama ve ilişki kaynak kimliğiyle kayıtlı. "Uygulanamaz", "henüz eklenmedi" ve
  "doğrulanmadı" durumları ayrı tutuluyor.
- ✅ Lisansı doğrulanan kaynaklar: BodyParts3D, HRA (CC BY 4.0), OpenStax (CC BY-NC-SA 4.0),
  Wikidata (CC0).
- ❌ **TA2 (FIPAT) lisansı doğrulanmadı.** FIPAT sitesine bu ortamdan erişilemedi.
  - **Gereken:** fipat.library.dal.ca kullanım koşullarının okunup
    `content/sources/fipat-ta2.json` → `license.verifiedAt` alanına işlenmesi.
- ❌ **TDK kullanım koşulları doğrulanmadı.** Açık ve yetkili bir Türkçe anatomi terminolojisi
  kaynağı bulunamadı.
  - **Gereken:** Türk Anatomi ve Klinik Anatomi Derneği terminolojisi veya eşdeğer bir kaynak
    ile uzman karşılaştırması.
- ❌ FMA ve UBERON lisansları birincil kaynaktan okunmadı (yalnızca kimlik olarak kullanılıyor).
- ⚠️ OpenStax **ticari olmayan kullanım** koşulu taşır. Ticari yayın öncesinde açıklamaların
  başka kaynakla yeniden yazılması veya hukuki değerlendirme gerekir.

### §4 3B modeller: 🟡
- ✅ GLB, meshopt sıkıştırma, sistem/bölge parçaları, yakın inceleme için ayrıntılı parçalar
  (`*.detail.glb`), FMA kimlik eşleşmesi, tek koordinat sistemi, köken zinciri ve lisans kaydı
  ([model-katalogu.md](model-katalogu.md)).
- 🟡 4 sağ/sol çiftinde model konumu adla çelişiyor
  (`content/structures/denetim/taraf-uyusmazliklari.json`). Uzman kararı gerekli.
- 🟡 HRA'dan 5 düğüm eşleşme veya taraf uyuşmazlığı nedeniyle dışlandı.
- ❌ Modellerin geometri açısından uzman incelemesi yapılmadı.

### §5 Temel 3B etkileşimler: ✅
Döndürme, yakınlaştırma ve kaydırma; altı yön görünümü ve başlangıca dönüş; tıklayarak seçme ve
odaklama; çoklu seçim ve izolasyon; gizleme ve saydamlaştırma; dış katmanı kaldırma; geri alma ve
yineleme; etiket yoğunluğu; karşılaştırma tablosu; kayıtlı görünümler; patlatılmış görünüm (tek
işlemle geri alınabilir); arama sonucundaki gizli yapıyı tek işlemle gösterme. Bunların uzman ve kullanıcı testi
yapılmadı.

### §6 Diseksiyon, kesit, hareket: 🟡
- ✅ Adım adım diseksiyon (geri alınabilir, kaldırılanlar listelenir). Sagittal, koronal ve
  aksiyal yüzey kırpma kesiti, yön işaretleriyle. Kesit "yüzey kırpma" olarak etiketlenir; BT/MR
  olarak gösterilmez.
- ❌ **Hareket modülü yok.** Kaynaklı eklem hareket açıklığı verisi ve eklem pivotları tanımlı
  riglenmiş model bulunamadı.
- ❌ **Radyoloji eşleştirme modülü yok.** Lisansı uygun, anonim ve kesitsel anatomiyle
  eşleştirilmiş veri bulunamadı.

### §7 Arama: ✅
Üç dilde, eş anlamlılarla, Türkçe karakter ve küçük yazım hatası toleranslı arama. Sistem ağacı,
bölge ağacı, 3B model ve ilişkiler listesinden aynı kayda erişim. İlişkiler modelde vurgulanır.
Aranabilirlik, adların yalnızca %18'inin Türkçe olmasıyla sınırlıdır.

### §8 Öğrenme ve sınav: 🟡
- ✅ Serbest keşif; rehberli dersler (3 ders, üst ekstremite); yapıyı bul; adını söyle;
  komşuluk/ilişki; aralıklı tekrar; süreli sınav; favoriler, notlar ve ilerleme (incelenen ve
  doğru yanıtlanan ayrı gösterilir). Sınavda cevabı açığa çıkaran etiketler gizlenir. Görünmeyen
  yapılardan soru üretilmez.
- ❌ **Kesit tanıma soruları yok.** Otomatik üretilmez; kaynaklı hazır kesit sorusu yazılmadı.
- 🟡 Sorular doğrulanmamış kayıtlardan üretiliyor. Ayarlarda "yalnızca uzman onaylı" seçeneği var,
  fakat onaylı kayıt olmadığı için bu seçenek açıkken soru üretilemez.
- ❌ Rehberli ders yalnızca üst ekstremite için var. Diğer bölgeler için ders yazılmadı.

### §9 Arayüz ve erişilebilirlik: ✅ (otomatik), 🟡 (insan testi)
Yerleşim gereksinime uygun; mobil ve tablette paneller açılıp kapanıyor; açık/koyu tema; yazı
ölçeği; hareketi azaltma; klavye erişimi; metin modu. axe-core taramalarında ciddi veya kritik
ihlal yok. Ekran okuyucu ile elle test yapılmadı.

### §10 Mimari ve veri modeli: ✅
Bileşenler ayrı modüllerde, istenen tüm kayıt türleri şemalarda tanımlı
([mimari.md](mimari.md)). Sağ ve sol örnekler ile genel kavramlar ayrı tutuluyor. Misafir modu,
dışa/içe aktarma ve silme mevcut. Hesap ve cihazlar arası eşitleme yok (gereksinimde isteğe bağlı).

### §11 Performans ve hata durumları: 🟡
- ✅ Gerektiğinde yükleme, kod bölme, sıkıştırma, önbellek, kaynak temizleme, kalite ayarı, model
  yükleme hatası ve grafik bağlamı kaybı mesajları, yeniden deneme.
- 🟡 Ölçüm yalnızca GPU'suz kapsayıcıda yapıldı (yazılımsal WebGL): ilk kullanılabilir görünüm
  474 ms, ilk 3B kare 5.044 ms, iskelet görünümünde 2,0 FPS. Açılışta artık iskeletin tamamı
  gösterildiği için ekrandaki üçgen sayısı önceki ölçüme göre yaklaşık 4 kat arttı (149 bin → 589
  bin). Ortam yansımasının ön hesaplaması da yazılımsal işlemede ilk kareyi geciktiriyor. Bu
  sayılar gerçek bir ekran kartını temsil etmez.
- ❌ **Gerçek cihazda 30 FPS hedefi ölçülmedi.**
  - **Gereken:** Referans cihazda (ör. orta sınıf dizüstü ve bir mobil cihaz) `npm run perf`
    veya `?perf` ile ölçüm.

### §12 İçerik yönetimi ve uzman incelemesi: 🟡
- ✅ İnceleme durumları (taslak → yayına onaylı) ve metin, etiket, geometri, ilişki için ayrı
  değerlendirme. Öğrenci hata bildirimi, yapı kimliği ve görünüm bilgisiyle. Süreç
  [uzman-inceleme.md](uzman-inceleme.md) belgesinde.
- ❌ **Uzman incelemesi yapılmadı: 0 inceleme kaydı.** Hiçbir onay veya incelemeci adı
  uydurulmadı.
  - **Gereken:** Anatomi uzmanlarının `content/reviews/` altına ad ve rolleriyle kayıt eklemesi.

### §13 Kabul ölçütleri: 🟡
Kapsam raporu boyutları ayrı gösteriyor. Otomatik doğrulamalar mevcut: taraf tutarlılığı,
model–kayıt eşleşmesi, kopuk bağlantılar, seçim, arama, gizleme, geri alma ve ilerleme kaydı.
Tamamlanmış yapı sayısı **0/119**; bunun başlıca nedenleri uzman onayı ve doğrulanmış adların
olmamasıdır.

### §14 Geliştirme sırası: 🟡
1–4. adımlar ve 6–8. adımlar büyük ölçüde tamamlandı. 5. adımda hareket modülü eksik. 7. adımda
gerçek cihaz ölçümü ve insan incelemesi eksik.

### §15 Teslimatlar: ✅ (belgeler)
Çalışan uygulama; kurulum ve dağıtım ([../README.md](../README.md)); mimari; kapsam ve envanter;
model kataloğu; kaynakça ([kaynakca.md](kaynakca.md)); içerik ekleme rehberi
([icerik-rehberi.md](icerik-rehberi.md)); test, performans ve uzman inceleme raporları; bu durum
listesi.

## İçerik eksikleri (öncelik sırasıyla)

1. **Uzman incelemesi:** 0/2251. En yüksek öncelik; tamamlanma bu adıma bağlı.
2. **Açıklamalar:** Kaslar, eklemler, organlar, damarlar ve sinirler için kaynaklı açıklama yok
   (yalnızca 119 iskelet yapısında var). Kaslarda başlangıç, yapışma ve eylem alanları da boş.
3. **Türkçe adlar:** 1849 yapıda Türkçe ad yok. Mevcut 402 ad doğrulanmadı.
4. **Latince adlar:** 877 yapıda TA2 eşleşmesi bulunamadı.
5. **Modeller:** Yukarıdaki §2 listesi.
6. **Dersler ve kesit soruları:** Üst ekstremite dışında ders yok; kesit sorusu yok.

Her birinin nasıl ekleneceği [icerik-rehberi.md](icerik-rehberi.md) belgesinde anlatılır.
