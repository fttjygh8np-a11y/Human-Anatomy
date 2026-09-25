# Kapsam raporu

> Otomatik üretildi: `npm run report:coverage` · içerik sürümü `55cb971577405f0b` · 2026-09-25.
> Bu rapor içerik kayıtlarının sayımıdır; anatomi uzmanı incelemesinin yerine geçmez. Uzman onayları yalnızca
> `content/reviews/` altındaki, incelemeci adı ve rolü içeren kayıtlardan sayılır.

## Özet

Kapsam matrisindeki toplam hedef yapı: **32**. Tamamlanmış: **0/32 (%0)**.

| Boyut | Tamamlanan |
|---|---:|
| Envanter kaydı | 14/32 (%44) |
| 3B anatomik model | 14/32 (%44) |
| TR/LA/EN adlar | 0/32 (%0) |
| Bilgi kartı içeriği | 0/32 (%0) |
| Model lisansı doğrulanmış | 14/32 (%44) |
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
| İskelet sistemi | 32 | 14/32 (%44) | 14/32 (%44) | 0/32 (%0) | 0/32 (%0) | 14/32 (%44) | 0/32 (%0) | 0/32 (%0) |

## Bölgeye göre (üst düzey bölge)

| Bölge | Hedef | Envanter kaydı | 3B anatomik model | TR/LA/EN adlar | Bilgi kartı içeriği | Model lisansı doğrulanmış | Uzman incelemesi | Tamamlanmış |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Üst ekstremite | 32 | 14/32 (%44) | 14/32 (%44) | 0/32 (%0) | 0/32 (%0) | 14/32 (%44) | 0/32 (%0) | 0/32 (%0) |

## Ayrıntı düzeyine göre

| Düzey | Hedef | Envanter kaydı | 3B anatomik model | TR/LA/EN adlar | Bilgi kartı içeriği | Model lisansı doğrulanmış | Uzman incelemesi | Tamamlanmış |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Temel | 18 | 14/18 (%78) | 14/18 (%78) | 0/18 (%0) | 0/18 (%0) | 14/18 (%78) | 0/18 (%0) | 0/18 (%0) |
| Orta | 14 | 0/14 (%0) | 0/14 (%0) | 0/14 (%0) | 0/14 (%0) | 0/14 (%0) | 0/14 (%0) | 0/14 (%0) |

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
| First metacarpal | İskelet sistemi | El tarağı | Temel | yok | yok | — | — | — | summary, description, location | — | — |
| Second metacarpal | İskelet sistemi | El tarağı | Temel | yok | yok | — | — | — | summary, description, location | — | — |
| Third metacarpal | İskelet sistemi | El tarağı | Temel | `fma:23901` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Fourth metacarpal | İskelet sistemi | El tarağı | Temel | yok | yok | — | — | — | summary, description, location | — | — |
| Fifth metacarpal | İskelet sistemi | El tarağı | Temel | yok | yok | — | — | — | summary, description, location | — | — |
| Proximal phalanx of thumb | İskelet sistemi | El parmakları | Orta | yok | yok | — | — | — | summary, description, location | — | — |
| Distal phalanx of thumb | İskelet sistemi | El parmakları | Orta | yok | yok | — | — | — | summary, description, location | — | — |
| Proximal phalanx of index finger | İskelet sistemi | El parmakları | Orta | yok | yok | — | — | — | summary, description, location | — | — |
| Middle phalanx of index finger | İskelet sistemi | El parmakları | Orta | yok | yok | — | — | — | summary, description, location | — | — |
| Distal phalanx of index finger | İskelet sistemi | El parmakları | Orta | yok | yok | — | — | — | summary, description, location | — | — |
| Proximal phalanx of middle finger | İskelet sistemi | El parmakları | Orta | yok | yok | — | — | — | summary, description, location | — | — |
| Middle phalanx of middle finger | İskelet sistemi | El parmakları | Orta | yok | yok | — | — | — | summary, description, location | — | — |
| Distal phalanx of middle finger | İskelet sistemi | El parmakları | Orta | yok | yok | — | — | — | summary, description, location | — | — |
| Proximal phalanx of ring finger | İskelet sistemi | El parmakları | Orta | yok | yok | — | — | — | summary, description, location | — | — |
| Middle phalanx of ring finger | İskelet sistemi | El parmakları | Orta | yok | yok | — | — | — | summary, description, location | — | — |
| Distal phalanx of ring finger | İskelet sistemi | El parmakları | Orta | yok | yok | — | — | — | summary, description, location | — | — |
| Proximal phalanx of little finger | İskelet sistemi | El parmakları | Orta | yok | yok | — | — | — | summary, description, location | — | — |
| Middle phalanx of little finger | İskelet sistemi | El parmakları | Orta | yok | yok | — | — | — | summary, description, location | — | — |
| Distal phalanx of little finger | İskelet sistemi | El parmakları | Orta | yok | yok | — | — | — | summary, description, location | — | — |

## Kapsam hedefi olmayan yapılar

1567 yapı kaydı henüz bir kapsam hedefine bağlı değil (skeletal: 235, digestive: 118, cardiovascular: 580, respiratory: 79, muscular: 385, endocrine: 3, urinary: 6, reproductive: 10, articular: 16, nervous: 111, sensory: 18, integumentary: 3, lymphatic: 3). Bunlar tamamlanma oranına katılmaz.

## 3B model varlıkları

70 varlık (70 anatomik, 0 şematik), 3779 düğüm; modeli olan yapı: 1595; envanterde karşılığı olmayan düğüm: 0.

## İnsan incelemesi ve otomatik kontroller (ayrı ayrı)

- **İnsan inceleme kayıtları:** 0 — henüz hiçbir içerik anatomi uzmanınca incelenmedi.
- **Otomatik doğrulama (npm run content:validate):** 0 hata, 4 uyarı. Otomatik kontroller uzman incelemesinin yerine geçmez.
