# Ürün gereksinimleri (özgün metin)

> Bu dosya, proje sahibinin verdiği gereksinim metninin değiştirilmemiş kopyasıdır. Uygulamanın her
> modülü bu metne göre değerlendirilir. Karşılanma durumu için bkz. `docs/durum.md`.

Tıp öğrencileri için insan vücudunu kapsamlı biçimde incelemeyi sağlayan, bilimsel kaynaklara dayalı, etkileşimli bir 3B anatomi ve öğrenme uygulaması geliştir.

Yazılım mimarisi, 3B görselleştirme, kullanıcı deneyimi ve tıp eğitimi gereksinimlerini birlikte ele al. Anatomik içeriklerin uzman tarafından incelenmesini ayrı bir süreç olarak tasarla; kendi ürettiğin içeriği uzman onayından geçmiş gibi sunma.

## 1. Ürün hedefi ve temel yaklaşım

Uygulama; öğrencinin insan vücudunu bütün olarak görebildiği, sistemleri ve bölgeleri inceleyebildiği, anatomik yapılara tıklayarak bilgi alabildiği, katmanları kaldırabildiği, kesitleri inceleyebildiği ve bilgisini sınayabildiği bir eğitim platformu olsun.

Hedef kitle tıp fakültesi öğrencileri olsun. İçerikleri temel, orta ve ileri ayrıntı düzeylerinde sun.

Varsayılan gereksinimler:

- Tarayıcı üzerinden çalışan, masaüstü ve tablet kullanımına öncelik veren tasarım.
- Telefonlarda temel inceleme ve öğrenme işlevlerinin kullanılabilmesi.
- Türkçe arayüz; Türkçe, Latince ve İngilizce anatomik adlar.
- Hesap açmadan kullanılabilen temel inceleme modu.
- Kullanıcının notlarını, favorilerini ve öğrenme ilerlemesini kaydedebilmesi.
- Normal erişkin anatomisinin temel kapsam olması; kadın ve erkek üreme anatomisinin ilgili yapılarıyla sunulması.
- Anatomik varyasyonların ayrıca etiketlenmesi.
- Pediatrik anatomi, embriyoloji, histoloji ve patolojinin kapsamı açıkça tanımlanmış ayrı içerik modülleri olarak ele alınması.

“Eksiksiz” ifadesini ölçülebilir bir yapı envanteriyle tanımla. Bir modelin bütün bireysel farklılıkları ve bütün mikroskobik ayrıntıları temsil ettiğini iddia etme.

## 2. Anatomik kapsam

Önce “sistem × bölge × anatomik yapı × ayrıntı düzeyi” kapsam matrisi oluştur. Her başlığın altında sunulacak yapıları tek tek envantere ekle. Yalnızca ana organ isimlerini listelemekle yetinme.

Aşağıdaki sistemleri kapsa:

- **İskelet:** Kemikler, bölümleri, belirgin yüzey işaretleri, çıkıntılar, çukurlar, delikler ve kanallar.
- **Eklemler:** Eklem yüzleri, kapsüller, bağlar, kıkırdaklar, menisküsler, diskler ve ilgili yardımcı yapılar.
- **Kas sistemi:** Yüzeyel ve derin kaslar, kas grupları, tendonlar, aponevrozlar, fasyalar ve ilgili kompartımanlar.
- **Dolaşım:** Kalbin dış ve iç anatomisi, boşlukları, kapakları, büyük damarlar, koroner dolaşım, bölgesel arterler ve venler.
- **Lenfatik ve bağışıklıkla ilişkili yapılar:** Lenf damarları, lenf düğümü grupları, ana lenf yolları ve ilgili organlar.
- **Sinir sistemi:** Beyin, beyincik, beyin sapı, omurilik, zarlar, ventriküler sistem, kraniyal ve spinal sinirler, pleksuslar, periferik sinirler ve otonom yapılar.
- **Solunum:** Üst ve alt solunum yolları, akciğerler, loblar, segmentler, plevra ve solunumla ilişkili kaslar.
- **Sindirim:** Ağız boşluğu, dişler, dil, tükürük bezleri, sindirim kanalı, karaciğer, safra yolları, pankreas, periton ve ilgili bağlantılar.
- **Üriner:** Böbrekler ve iç anatomileri, toplayıcı sistem, üreterler, mesane ve üretra.
- **Üreme:** Kadın ve erkek iç ve dış genital yapıları, destekleyici bağlar, kanallar ve ilgili bezler.
- **Endokrin:** Endokrin bezler ve anatomik yerleşimleri.
- **Duyu organları:** Göz, orbita, göz kasları, gözyaşı sistemi; dış, orta ve iç kulak; koku ve tatla ilişkili yapılar.
- **Deri ve deri ekleri:** Deri katmanları, deri altı doku ve uygun ayrıntı ölçeğinde deri ekleri.

Bölgesel inceleme ayrıca şunları kapsasın:

- Baş, yüz, kafa tabanı ve kafa boşlukları.
- Boyun ve boyun üçgenleri.
- Sırt ve vertebral kanal.
- Toraks, göğüs duvarı ve mediasten.
- Karın, karın duvarı ve retroperitoneal alan.
- Pelvis ve perine.
- Üst ekstremite, el ve parmaklar.
- Alt ekstremite, ayak ve parmaklar.

Organların yanında vücut boşlukları, seröz zarlar, anatomik aralıklar, kanallar, geçiş noktaları, yüzey işaretleri ve önemli komşuluk ilişkilerini de göster.

## 3. Anatomik doğruluk ve kaynak yönetimi

Adlandırmada [FIPAT Terminologia Anatomica, ikinci baskıyı](https://fipat.library.dal.ca/wp-content/uploads/2021/08/FIPAT-TA2-Front-Matter.pdf) referans al. Gerektiğinde ilgili diğer terminoloji standartlarını kontrol et. Türkçe karşılıkları ayrıca doğrula.

Terminoloji kaynaklarının yapıları adlandırmaya yardımcı olduğunu; açıklamalar, klinik ilişkiler ve geometrik doğruluk için ayrıca güvenilir kaynaklar gerektiğini dikkate al.

Her anatomik kayıt için şunları sakla:

- Benzersiz ve kalıcı yapı kimliği.
- Türkçe, Latince ve İngilizce adlar.
- Eş anlamlılar ve yaygın alternatif adlar.
- Sistem, bölge, taraf ve ait olduğu üst yapı.
- Kısa açıklama ve ayrıntılı açıklama.
- Konum, bölümler, komşuluklar ve bağlantılar.
- Yapıya uygun olduğunda işlev, arteriyel beslenme, venöz dönüş, lenfatik drenaj ve innervasyon.
- Kaslarda başlangıç, sonlanış ve hareket bilgileri.
- Eklem ve bağlarda ilgili bağlantılar ve hareketle ilişkiler.
- Uygun olduğunda eğitim amaçlı klinik anatomi notları.
- Kaynak, baskı veya sürüm bilgisi ve son inceleme tarihi.
- İçerik ve model için ayrı uzman inceleme durumları.
- İlgili 3B nesne ve etiket bağlantıları.

Her alanı her yapı için zorunlu tutma. “Uygulanamaz”, “henüz eklenmedi” ve “doğrulanmadı” durumlarını birbirinden ayır.

Kaynak, atıf, anatomik ilişki veya uzman onayı uydurma. Çelişkili bilgilerde kullanılan referansı ve varyasyonu belirt.

## 4. Gerçek 3B model gereksinimleri

Anatomik olarak anlamlı, ayrıntılı ve kullanım hakkı uygun 3B modeller kullan.

Model aktarımında, kullanılan görüntüleme motoruyla uyumlu [glTF/GLB biçimini](https://www.khronos.org/gltf/) tercih et.

Model gereksinimleri:

- Kullanıcının seçebileceği her anatomik yapı ayrı bir nesne veya güvenilir biçimde seçilebilir bir bölge olarak tanımlansın.
- Nesneler anatomik veri tabanındaki kimliklerle eşleşsin.
- Sistemler aynı koordinat düzenini, ölçeği ve anatomik pozisyonu kullansın.
- Sağ-sol bilgisi, yönler ve birimler açıkça tanımlansın.
- Organlar, damarlar ve sinirler anatomik yerleşimleriyle uyumlu olsun.
- İç anatomisi incelenecek organlar ilgili iç yapıları gerçekten içersin.
- Yakın inceleme gerektiren bölgeler için ayrı yüksek ayrıntılı modeller yüklenebilsin.
- Görsel optimizasyon sırasında küçük ama eğitim açısından önemli yapılar kaybolmasın.
- Modelin kaynağı, lisansı, değişiklik geçmişi ve inceleme durumu kayıt altına alınsın.

Her model için kullanım, değiştirme ve uygulama içinde dağıtım izinlerini kontrol et. İnternette erişilebilir olmayı yeniden kullanım izni olarak kabul etme.

Uygun model bulunamayan yapıları eksik içerik listesine ekle. Basit geometrik şekillerle oluşturulmuş geçici modelleri açıkça “şematik” olarak işaretle ve tamamlanmış anatomik içerik hesabına katma.

## 5. Temel 3B etkileşimler

Aşağıdaki işlevleri çalışır durumda uygula:

- Modeli döndürme, yakınlaştırma ve kaydırma.
- Ön, arka, yan, üst ve alt görünüşlere geçiş.
- Anatomik pozisyona ve başlangıç görünümüne dönüş.
- Yapıya tıklayarak seçme ve bilgi kartını açma.
- Seçili yapıya kamerayı odaklama.
- Bir veya birden fazla yapıyı izole etme.
- Yapıları ve sistemleri gösterme, gizleme ve saydamlaştırma.
- Deriden derin yapılara doğru katmanları kaldırma.
- İşlemleri geri alma ve yeniden uygulama.
- Etiketleri açma, kapatma ve yoğunluğunu ayarlama.
- Seçili yapıların adlarını ve ilişkilerini karşılaştırma.
- İnceleme görünümünü kaydetme ve yeniden açma.

Katman yapısı yalnızca sistemlere göre düzenlenmesin; bölgesel diseksiyon için gerekli derinlik ve komşuluk ilişkilerini de desteklesin.

Anatomik sağ-sol işaretlerini kamera açısına göre ters çevirmeden göster. Kullanıcı bir yapıyı aradığında, yapı gizliyse onu görünür hale getirmek için anlaşılır bir işlem sun.

Yapıları birbirinden uzaklaştırarak inceleme özelliği varsa, bunun değiştirilmiş bir gösterim olduğunu belirt ve tek işlemle gerçek konumlarına döndür.

## 6. Sanal diseksiyon, kesit ve hareket

Sanal diseksiyonda yapılar adım adım kaldırılabilsin. Her adım geri alınabilsin ve öğrencinin hangi yapıları kaldırdığı görülebilsin.

Sagittal, koronal ve aksiyal düzlemlerde kesit inceleme sağla. Kesit düzlemi taşınabilsin; yön ve taraf işaretleri korunabilsin.

Yüzey modelinin kırpılması ile gerçek hacimsel kesit verisini ayırt et. İç yapısı bulunmayan bir organı kesildiğinde ayrıntılı iç anatomi varmış gibi gösterme. Yüzey kırpma görüntüsünü BT veya MR görüntüsü olarak etiketleme.

Lisansı uygun, anonim eğitim verileri mevcutsa kesitsel anatomi ile radyolojik görüntüleri eşleştiren ayrı bir modül oluştur.

Hareket modülünde:

- Seçilen eklemin hareketlerini göster.
- İlgili kasları ve bağlantıları vurgula.
- Hareketi durdurma, yavaşlatma ve adım adım inceleme sun.
- Hareket açıklıklarını ve mekanizmalarını kaynaklandır.
- Basitleştirilmiş animasyonları eğitim amaçlı gösterim olarak etiketle.

Kalp, solunum veya akış animasyonları eklenirse bunların kapsamını belirt. Doğrulanmış hesaplama modeli olmadan animasyonu fizyolojik ölçüm veya hasta simülasyonu olarak sunma.

## 7. Arama ve bilgiye erişim

Türkçe, Latince ve İngilizce arama destekle.

Arama; eş anlamlıları, Türkçe karakterleri ve küçük yazım hatalarını dikkate alsın. Sonuçlarda sistem, bölge ve sağ-sol bilgisi bulunsun.

Kullanıcı:

- Sistem ağacından,
- Bölge ağacından,
- Arama sonuçlarından,
- 3B model üzerinden,
- Bir yapının ilişkiler listesinden

aynı anatomik kayda ulaşabilsin.

Bilgi kartındaki “komşuları”, “ilişkili damarlar”, “ilişkili sinirler” ve “bağlantılı yapılar” gibi öğeler model üzerinde ilgili yapıları gösterebilsin. Bu bağlantıları yalnızca metin olarak bırakma.

## 8. Öğrenme ve sınav modları

Aşağıdaki öğrenme biçimlerini oluştur:

- **Serbest keşif:** Öğrencinin modeli bağımsız incelemesi.
- **Rehberli öğrenme:** Bölge veya sistem için sıralı inceleme adımları.
- **Yapıyı bul:** İstenen yapının 3B model üzerinde seçilmesi.
- **Adını söyle:** İşaretlenen yapının adının yazılması veya seçeneklerden bulunması.
- **Komşuluk ve bağlantı:** Yapılar arasındaki ilişkilerin sorgulanması.
- **Kesit tanıma:** Desteklenen kesitlerde yapıların tanınması.
- **Tekrar:** Önceki hatalara göre çalışma önerileri ve aralıklı tekrar.
- **Sınav:** Bölge, sistem, zorluk ve süreye göre oluşturulan değerlendirme.

Sorular doğrulanmış anatomik kayıtlarla bağlantılı olsun. Yanıttan sonra açıklama, ilgili yapının görünümü ve kaynak sun.

Sınav sırasında cevabı açığa çıkaran etiketleri ve bilgi kartlarını uygun şekilde gizle. Gizlenmiş veya seçilemeyen yapılarla çözülemez soru üretme.

Öğrenci favori yapılar ekleyebilsin, not alabilsin ve ilerlemesini görebilsin. İlerleme göstergesinde incelenen içerikle doğru cevaplanan içeriği ayrı göster.

Klinik bağlam içeren sorular eğitim amaçlı olsun; uygulama kişisel tanı veya tedavi önerisi vermesin.

## 9. Arayüz ve erişilebilirlik

Ana çalışma ekranında:

- Ortada geniş 3B inceleme alanı.
- Solda sistemler, bölgeler ve katmanlar.
- Sağda seçili yapının bilgi kartı.
- Üstte arama ve inceleme modu seçimi.
- Alt bölümde görünüm, saydamlık, kesit ve animasyon kontrolleri

bulunsun.

Tablet ve telefonda paneller açılıp kapanabilsin; modelin incelendiği alan korunabilsin.

Arayüz sakin, okunabilir ve tıp eğitimine uygun olsun. Açık ve koyu tema sun. Teknik geliştirme ayrıntılarını öğrenci ekranlarına taşıma.

Rengi tek başına anlam taşıyan araç olarak kullanma. Etiket, simge ve metinle destekle. Klavye ile erişim, görünür odak işaretleri, yeterli kontrast, ölçeklenebilir yazı ve hareket azaltma seçeneği sağla.

3B alanı kullanamayan kişiler için anatomik yapı ağacı ve bilgi kartlarıyla erişilebilen metinsel inceleme yolu sun.

## 10. Teknik mimari ve veri modeli

Mevcut bir proje varsa önce yapısını incele ve uygun olduğu ölçüde koru.

Yeni web projesinde varsayılan olarak TypeScript, React ve Three.js tabanlı bir mimari kullanabilirsin. Seçtiğin araçların birbiriyle uyumlu sürümlerini doğrula ve sabitle.

Şu bileşenleri ayır:

- 3B görüntüleme ve etkileşim.
- Anatomik içerik ve ilişkiler.
- Model dosyaları ve varlık kataloğu.
- Arama.
- Öğrenme ve sınav.
- Kullanıcı notları ve ilerleme.
- İçerik yönetimi ve inceleme.
- Dil ve erişilebilirlik desteği.

Anatomik açıklamaları arayüz bileşenlerine gömme. Yapılandırılmış, sürümlenebilir bir veri katmanı kullan.

En az şu kayıt türlerini tanımla:

- Anatomik yapı.
- Yapılar arası ilişki.
- 3B model varlığı.
- Kaynak ve lisans.
- İçerik incelemesi.
- Ders ve öğrenme hedefi.
- Soru ve değerlendirme.
- Kullanıcı ilerlemesi.
- Kaydedilmiş görünüm ve kişisel not.

Bir anatomik kavramın birden fazla model nesnesiyle temsil edilebileceğini ve bazı ilişkilerin hiyerarşik olmadığını destekle. Sağ ve sol yapı örneklerini birbirine karıştırma.

Misafir kullanımında ilerleme yerel olarak saklanabilsin. Hesap ve cihazlar arası eşitleme eklenirse kullanıcılar birbirlerinin özel notlarına erişemesin. Verileri dışa aktarma ve silme imkânı sun.

## 11. Performans ve hata durumları

Tüm yüksek ayrıntılı modelleri başlangıçta yükleme. Sistemleri ve bölgeleri gerektiğinde yükle.

Ayrıntı düzeyi yönetimi, uygun sıkıştırma, önbellekleme ve kullanılmayan grafik kaynaklarının temizlenmesini uygula. Görsel kalite ayarları düşük donanımlara uyarlanabilsin.

Başlangıçta hedef cihaz, tarayıcı, ağ koşulları ve model büyüklüğü için bir ölçüm profili tanımla. Şunları gerçek ölçümlerle raporla:

- İlk kullanılabilir görünüm süresi.
- Bölge ve sistem geçiş süresi.
- Etkileşim sırasındaki kare hızı.
- Bellek ve indirme boyutu.
- Uzun kullanım sırasında kararlılık.

Yaygın inceleme senaryolarında belirlenen referans cihazda en az 30 FPS hedefle. Bu değeri ölçmeden sağlanmış kabul etme.

Model yüklenememesi, bağlantı kesilmesi, eksik içerik, desteklenmeyen grafik özellikleri ve grafik bağlamı kaybı için anlaşılır hata mesajları ve mümkün olduğunda yeniden deneme sun.

## 12. İçerik yönetimi ve uzman incelemesi

İçerik ekleme ve inceleme için sürdürülebilir bir süreç kur.

İçerik durumları en az şu şekilde olsun:

- Taslak.
- Kaynak kontrolü bekliyor.
- Anatomi uzmanı incelemesi bekliyor.
- Düzeltme gerekli.
- Yayına onaylı.

Metin, etiket ve 3B geometri ayrı ayrı değerlendirilebilsin. Bir metnin onaylanması, modelin geometrisinin de onaylandığı anlamına gelmesin.

Öğrenciler hatalı etiket, anatomik ilişki veya model konumu bildirebilsin. Bildirim ilgili yapı kimliği ve görünüm bilgisiyle ilişkilendirilsin.

Uzman incelemesi henüz yapılmamışsa bu durumu açıkça göster; inceleme kaydı veya onaylayan kişi uydurma.

## 13. Kabul ölçütleri ve doğrulama

Tamamlanma durumunu ekran görüntüsüne veya organ sayısına göre belirleme.

Bir anatomik yapı ancak aşağıdaki koşullar sağlandığında tamamlanmış sayılsın:

- Envanterde benzersiz kaydı bulunuyor.
- Vaat edilen ayrıntı düzeyinde 3B temsili bulunuyor.
- Doğru ad ve taraf bilgisiyle seçilebiliyor.
- Aramayla ve yapı ağacıyla bulunabiliyor.
- Bilgi kartı ve kaynakları mevcut.
- Model ile bilgi kaydı doğru eşleşiyor.
- İlgili ilişkiler ve eğitim bağlantıları çalışıyor.
- Kullanım hakları kayıtlı.
- Gerekli uzman incelemeleri tamamlanmış.

Kapsam raporunda toplam hedef yapı sayısını ve modelleme, içerik, etiketleme, lisans ve uzman incelemesi tamamlanma durumlarını ayrı göster.

Önemli doğrulamalar:

- Sağ-sol ve yön tutarlılığı.
- Model nesnesi–anatomik kayıt eşleşmesi.
- Eksik veya kopuk ilişki bağlantıları.
- Seçim, arama, gizleme, izolasyon ve geri alma.
- Kesitlerde yön işaretleri.
- Sınav cevaplarının içerikle tutarlılığı.
- İlerleme kaydının korunması.
- Erişilebilirlik ve hedef cihazlarda performans.

Otomatik testleri ve insan incelemesini ayrı raporla. Otomatik kontrollerin anatomik uzman incelemesinin yerine geçtiğini söyleme.

## 14. Geliştirme sırası

1. Kapsam matrisi, yapı envanteri, kaynak ve model bulunabilirliği araştırması.
2. Veri modeli, ekran akışları ve görsel tasarım.
3. Doğrulanabilir modeller içeren bir bölgede uçtan uca çalışan ilk sürüm: seçim, bilgi kartı, arama, katmanlar ve kısa sınav.
4. Aynı altyapının bütün sistemlere ve bölgelere genişletilmesi.
5. Sanal diseksiyon, kesitsel inceleme ve desteklenen hareketler.
6. Öğrenme ilerlemesi, içerik yönetimi ve uzman inceleme süreci.
7. Performans, erişilebilirlik, kapsam ve doğruluk değerlendirmesi.
8. Belgelenmiş, kurulabilir ve sürdürülebilir teslim.

İlk çalışan sürümün sınırlı kapsamını açıkça belirt. Bütün vücut hedefini bu ilk sürüme indirgeme.

Bir model, kaynak veya uzman incelemesi eksikse bağımsız geliştirilebilecek işlere devam et. Engellenen kısmı, gereken girdiyi ve tamamlanma koşulunu somut biçimde kaydet.

## 15. Beklenen teslimatlar ve çalışma biçimi

- Çalışan uygulama ve kaynak kodu.
- Kurulum, çalıştırma ve dağıtım talimatları.
- Mimari ve veri modeli açıklaması.
- Anatomik kapsam matrisi ve yapı envanteri.
- Model dosyalarının kataloğu, kaynakları ve lisansları.
- Anatomik içerik kaynakçası.
- Yeni yapı, model, ders ve soru ekleme rehberi.
- Test, performans ve uzman inceleme raporları.
- Tamamlanan, eksik ve doğrulama bekleyen işlerin listesi.

Gerçekte oluşturulmamış, çalıştırılmamış, ölçülmemiş veya doğrulatılmamış bir şey tamamlanmış gibi bildirilmez.
