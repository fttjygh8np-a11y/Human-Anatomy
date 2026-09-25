# Kapsam raporu

> Otomatik üretildi: `npm run report:coverage` · içerik sürümü `d991c194c42b84a5` · 2026-09-25.
> Bu rapor içerik kayıtlarının sayımıdır; anatomi uzmanı incelemesinin yerine geçmez. Uzman onayları yalnızca
> `content/reviews/` altındaki, incelemeci adı ve rolü içeren kayıtlardan sayılır.

## Özet

Kapsam matrisindeki toplam hedef yapı: **32**. Tamamlanmış: **0/32 (%0)**.

| Boyut | Tamamlanan |
|---|---:|
| Envanter kaydı | 32/32 (%100) |
| 3B anatomik model | 32/32 (%100) |
| TR/LA/EN adlar | 0/32 (%0) |
| Bilgi kartı içeriği | 0/32 (%0) |
| Model lisansı doğrulanmış | 32/32 (%100) |
| Uzman incelemesi | 0/32 (%0) |
| Tamamlanmış | 0/32 (%0) |
| _Adlar üç dilde mevcut (doğrulanmamış dahil)_ | 4/32 (%13) |

Boyutların tanımı:

- **Envanter kaydı:** hedef, `content/` içindeki bir yapı kaydına bağlı (`structureId`).
- **3B anatomik model:** yapının (veya parça-bütün alt yapılarının) anatomik veriden türetilmiş model düğümü var; çift yapılarda sağ ve sol örneklerin ikisi de. Şematik geçici modeller sayılmaz.
- **TR/LA/EN adlar:** üç dildeki ad da kaynağıyla "doğrulandı" durumunda.
- **Bilgi kartı içeriği:** zorunlu alanlar (summary, description, location; kaslarda ayrıca origin/insertion/action, eklemlerde jointType/movements) mevcut ya da "uygulanamaz" olarak işaretli.
- **Model lisansı doğrulanmış:** modelin kaynak kayıtlarında kullanım, değiştirme ve dağıtım izni var ve lisans birincil kaynaktan tarihli olarak doğrulanmış (`license.verifiedAt`).
- **Uzman incelemesi:** metin, etiket, geometri ve ilişki boyutlarının dördü de anatomi uzmanı kaydıyla "Yayına onaylı".
- **Tamamlanmış:** yukarıdaki boyutların tümü.

## Sisteme göre

| Sistem | Hedef | Envanter kaydı | 3B anatomik model | TR/LA/EN adlar | Bilgi kartı içeriği | Model lisansı doğrulanmış | Uzman incelemesi | Tamamlanmış |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| İskelet sistemi | 32 | 32/32 (%100) | 32/32 (%100) | 0/32 (%0) | 0/32 (%0) | 32/32 (%100) | 0/32 (%0) | 0/32 (%0) |

## Bölgeye göre (üst düzey bölge)

| Bölge | Hedef | Envanter kaydı | 3B anatomik model | TR/LA/EN adlar | Bilgi kartı içeriği | Model lisansı doğrulanmış | Uzman incelemesi | Tamamlanmış |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Üst ekstremite | 32 | 32/32 (%100) | 32/32 (%100) | 0/32 (%0) | 0/32 (%0) | 32/32 (%100) | 0/32 (%0) | 0/32 (%0) |

## Ayrıntı düzeyine göre

| Düzey | Hedef | Envanter kaydı | 3B anatomik model | TR/LA/EN adlar | Bilgi kartı içeriği | Model lisansı doğrulanmış | Uzman incelemesi | Tamamlanmış |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Temel | 18 | 18/18 (%100) | 18/18 (%100) | 0/18 (%0) | 0/18 (%0) | 18/18 (%100) | 0/18 (%0) | 0/18 (%0) |
| Orta | 14 | 14/14 (%100) | 14/14 (%100) | 0/14 (%0) | 0/14 (%0) | 14/14 (%100) | 0/14 (%0) | 0/14 (%0) |

## Sistem × bölge matrisi (tamamlanan / hedef)

| Sistem | Üst ekstremite |
|---|---:|
| İskelet sistemi | 0/32 |

## Hedef yapılar

Ad sütunları: ✓ doğrulandı · ? doğrulanmadı · — yok. İnceleme: metin/etiket/geometri/ilişki.

| Hedef | Sistem | Bölge | Düzey | Envanter | Model | TR | LA | EN | Eksik içerik | Lisans | İnceleme |
|---|---|---|---|---|---|:-:|:-:|:-:|---|---|---|
| Clavicula (Clavicle) | İskelet sistemi | Omuz kuşağı | Temel | `fma:13321` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Scapula | İskelet sistemi | Omuz kuşağı | Temel | `fma:13394` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Humerus | İskelet sistemi | Kol | Temel | `fma:13303` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Radius | İskelet sistemi | Önkol | Temel | `fma:23463` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Ulna | İskelet sistemi | Önkol | Temel | `fma:23466` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os scaphoideum (Scaphoid) | İskelet sistemi | El bileği | Temel | `fma:23709` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os lunatum (Lunate) | İskelet sistemi | El bileği | Temel | `fma:23712` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os triquetrum (Triquetrum) | İskelet sistemi | El bileği | Temel | `fma:23715` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os pisiforme (Pisiform) | İskelet sistemi | El bileği | Temel | `fma:23718` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os trapezium (Trapezium) | İskelet sistemi | El bileği | Temel | `fma:23721` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os trapezoideum (Trapezoid) | İskelet sistemi | El bileği | Temel | `fma:23724` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os capitatum (Capitate) | İskelet sistemi | El bileği | Temel | `fma:23727` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os hamatum (Hamate) | İskelet sistemi | El bileği | Temel | `fma:23730` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| First metacarpal | İskelet sistemi | El tarağı | Temel | `fma:23899` | var (sağ ✓, sol ✓) | — | — | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Second metacarpal | İskelet sistemi | El tarağı | Temel | `fma:23900` | var (sağ ✓, sol ✓) | — | — | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Third metacarpal | İskelet sistemi | El tarağı | Temel | `fma:23901` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Fourth metacarpal | İskelet sistemi | El tarağı | Temel | `fma:23902` | var (sağ ✓, sol ✓) | — | — | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Fifth metacarpal | İskelet sistemi | El tarağı | Temel | `fma:23903` | var (sağ ✓, sol ✓) | — | — | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Proximal phalanx of thumb | İskelet sistemi | El parmakları | Orta | `fma:23918` | var (sağ ✓, sol ✓) | — | — | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Distal phalanx of thumb | İskelet sistemi | El parmakları | Orta | `fma:23945` | var (sağ ✓, sol ✓) | — | — | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Proximal phalanx of index finger | İskelet sistemi | El parmakları | Orta | `fma:23919` | var (sağ ✓, sol ✓) | — | — | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Middle phalanx of index finger | İskelet sistemi | El parmakları | Orta | `fma:23933` | var (sağ ✓, sol ✓) | — | — | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Distal phalanx of index finger | İskelet sistemi | El parmakları | Orta | `fma:23946` | var (sağ ✓, sol ✓) | — | — | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Proximal phalanx of middle finger | İskelet sistemi | El parmakları | Orta | `fma:23920` | var (sağ ✓, sol ✓) | — | — | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Middle phalanx of middle finger | İskelet sistemi | El parmakları | Orta | `fma:23934` | var (sağ ✓, sol ✓) | — | — | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Distal phalanx of middle finger | İskelet sistemi | El parmakları | Orta | `fma:23947` | var (sağ ✓, sol ✓) | — | — | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Proximal phalanx of ring finger | İskelet sistemi | El parmakları | Orta | `fma:23921` | var (sağ ✓, sol ✓) | — | — | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Middle phalanx of ring finger | İskelet sistemi | El parmakları | Orta | `fma:23935` | var (sağ ✓, sol ✓) | — | — | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Distal phalanx of ring finger | İskelet sistemi | El parmakları | Orta | `fma:23948` | var (sağ ✓, sol ✓) | — | — | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Proximal phalanx of little finger | İskelet sistemi | El parmakları | Orta | `fma:23922` | var (sağ ✓, sol ✓) | — | — | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Middle phalanx of little finger | İskelet sistemi | El parmakları | Orta | `fma:23936` | var (sağ ✓, sol ✓) | — | — | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Distal phalanx of little finger | İskelet sistemi | El parmakları | Orta | `fma:23949` | var (sağ ✓, sol ✓) | — | — | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |

## Kapsam hedefi olmayan yapılar

2118 yapı kaydı henüz bir kapsam hedefine bağlı değil (skeletal: 270, digestive: 138, cardiovascular: 784, muscular: 570, respiratory: 119, endocrine: 4, urinary: 8, reproductive: 13, sensory: 28, articular: 22, nervous: 155, integumentary: 3, lymphatic: 4). Bunlar tamamlanma oranına katılmaz.

## 3B model varlıkları

70 varlık (70 anatomik, 0 şematik), 3779 düğüm; modeli olan yapı: 1595; envanterde karşılığı olmayan düğüm: 0.

## İnsan incelemesi ve otomatik kontroller (ayrı ayrı)

- **İnsan inceleme kayıtları:** 0 — henüz hiçbir içerik anatomi uzmanınca incelenmedi.
- **Otomatik doğrulama (npm run content:validate):** 0 hata, 4 uyarı. Otomatik kontroller uzman incelemesinin yerine geçmez.
