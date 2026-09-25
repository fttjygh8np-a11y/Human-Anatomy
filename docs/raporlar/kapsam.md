# Kapsam raporu

> Otomatik üretildi: `npm run report:coverage` · içerik sürümü `cb05330e0eca1c6e` · 2026-09-25.
> Bu rapor içerik kayıtlarının sayımıdır; anatomi uzmanı incelemesinin yerine geçmez. Uzman onayları yalnızca
> `content/reviews/` altındaki, incelemeci adı ve rolü içeren kayıtlardan sayılır.

## Özet

Kapsam matrisindeki toplam hedef yapı: **119**. Tamamlanmış: **0/119 (%0)**.

| Boyut | Tamamlanan |
|---|---:|
| Envanter kaydı | 119/119 (%100) |
| 3B anatomik model | 119/119 (%100) |
| TR/LA/EN adlar | 0/119 (%0) |
| Bilgi kartı içeriği | 119/119 (%100) |
| Model lisansı doğrulanmış | 119/119 (%100) |
| Uzman incelemesi | 0/119 (%0) |
| Tamamlanmış | 0/119 (%0) |
| _Adlar üç dilde mevcut (doğrulanmamış dahil)_ | 46/119 (%39) |

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
| İskelet sistemi | 119 | 119/119 (%100) | 119/119 (%100) | 0/119 (%0) | 119/119 (%100) | 119/119 (%100) | 0/119 (%0) | 0/119 (%0) |

## Bölgeye göre (üst düzey bölge)

| Bölge | Hedef | Envanter kaydı | 3B anatomik model | TR/LA/EN adlar | Bilgi kartı içeriği | Model lisansı doğrulanmış | Uzman incelemesi | Tamamlanmış |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Baş | 14 | 14/14 (%100) | 14/14 (%100) | 0/14 (%0) | 14/14 (%100) | 14/14 (%100) | 0/14 (%0) | 0/14 (%0) |
| Boyun | 8 | 8/8 (%100) | 8/8 (%100) | 0/8 (%0) | 8/8 (%100) | 8/8 (%100) | 0/8 (%0) | 0/8 (%0) |
| Sırt | 18 | 18/18 (%100) | 18/18 (%100) | 0/18 (%0) | 18/18 (%100) | 18/18 (%100) | 0/18 (%0) | 0/18 (%0) |
| Toraks | 15 | 15/15 (%100) | 15/15 (%100) | 0/15 (%0) | 15/15 (%100) | 15/15 (%100) | 0/15 (%0) | 0/15 (%0) |
| Üst ekstremite | 32 | 32/32 (%100) | 32/32 (%100) | 0/32 (%0) | 32/32 (%100) | 32/32 (%100) | 0/32 (%0) | 0/32 (%0) |
| Alt ekstremite | 32 | 32/32 (%100) | 32/32 (%100) | 0/32 (%0) | 32/32 (%100) | 32/32 (%100) | 0/32 (%0) | 0/32 (%0) |

## Ayrıntı düzeyine göre

| Düzey | Hedef | Envanter kaydı | 3B anatomik model | TR/LA/EN adlar | Bilgi kartı içeriği | Model lisansı doğrulanmış | Uzman incelemesi | Tamamlanmış |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Temel | 69 | 69/69 (%100) | 69/69 (%100) | 0/69 (%0) | 69/69 (%100) | 69/69 (%100) | 0/69 (%0) | 0/69 (%0) |
| Orta | 50 | 50/50 (%100) | 50/50 (%100) | 0/50 (%0) | 50/50 (%100) | 50/50 (%100) | 0/50 (%0) | 0/50 (%0) |

## Sistem × bölge matrisi (tamamlanan / hedef)

| Sistem | Baş | Boyun | Sırt | Toraks | Üst ekstremite | Alt ekstremite |
|---|---:|---:|---:|---:|---:|---:|
| İskelet sistemi | 0/14 | 0/8 | 0/18 | 0/15 | 0/32 | 0/32 |

## Hedef yapılar

Ad sütunları: ✓ doğrulandı · ? doğrulanmadı · — yok. İnceleme: metin/etiket/geometri/ilişki.

| Hedef | Sistem | Bölge | Düzey | Envanter | Model | TR | LA | EN | Eksik içerik | Lisans | İnceleme |
|---|---|---|---|---|---|:-:|:-:|:-:|---|---|---|
| Vertebra thoracica prima (First thoracic vertebra) | İskelet sistemi | Sırt | Orta | `fma:9165` | var | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Second thoracic vertebra | İskelet sistemi | Sırt | Orta | `fma:9187` | var | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Third thoracic vertebra | İskelet sistemi | Sırt | Orta | `fma:9209` | var | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Fourth thoracic vertebra | İskelet sistemi | Sırt | Orta | `fma:9248` | var | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Fifth thoracic vertebra | İskelet sistemi | Sırt | Orta | `fma:9922` | var | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Sixth thoracic vertebra | İskelet sistemi | Sırt | Orta | `fma:9945` | var | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Seventh thoracic vertebra | İskelet sistemi | Sırt | Orta | `fma:9968` | var | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Eighth thoracic vertebra | İskelet sistemi | Sırt | Orta | `fma:9991` | var | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Ninth thoracic vertebra | İskelet sistemi | Sırt | Orta | `fma:10014` | var | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Tenth thoracic vertebra | İskelet sistemi | Sırt | Orta | `fma:10037` | var | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Eleventh thoracic vertebra | İskelet sistemi | Sırt | Orta | `fma:10059` | var | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Twelfth thoracic vertebra | İskelet sistemi | Sırt | Orta | `fma:10081` | var | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| First lumbar vertebra | İskelet sistemi | Sırt | Orta | `fma:13072` | var | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Second lumbar vertebra | İskelet sistemi | Sırt | Orta | `fma:13073` | var | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Third lumbar vertebra | İskelet sistemi | Sırt | Orta | `fma:13074` | var | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Fourth lumbar vertebra | İskelet sistemi | Sırt | Orta | `fma:13075` | var | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Fifth lumbar vertebra | İskelet sistemi | Sırt | Orta | `fma:13076` | var | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os sacrum (Sacrum) | İskelet sistemi | Sırt | Temel | `fma:16202` | var | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os frontale (Frontal bone) | İskelet sistemi | Baş | Temel | `fma:52734` | var | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os parietale (Parietal bone) | İskelet sistemi | Baş | Temel | `fma:9613` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os temporale (Temporal bone) | İskelet sistemi | Baş | Temel | `fma:52737` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os occipitale (Occipital bone) | İskelet sistemi | Baş | Temel | `fma:52735` | var | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os sphenoideum (Sphenoid bone) | İskelet sistemi | Baş | Temel | `fma:52736` | var | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os ethmoideum (Ethmoid) | İskelet sistemi | Baş | Temel | `fma:52740` | var | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Maxilla | İskelet sistemi | Baş | Temel | `fma:9711` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os palatinum (Palatine bone) | İskelet sistemi | Baş | Temel | `fma:52746` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os zygomaticum (Zygomatic bone) | İskelet sistemi | Baş | Temel | `fma:52747` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os nasale (Nasal bone) | İskelet sistemi | Baş | Temel | `fma:52745` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os lacrimale (Lacrimal bone) | İskelet sistemi | Baş | Temel | `fma:52741` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Concha nasalis inferior (Inferior nasal concha) | İskelet sistemi | Baş | Temel | `fma:54736` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Vomer | İskelet sistemi | Baş | Temel | `fma:9710` | var | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Mandibula (Mandible) | İskelet sistemi | Baş | Temel | `fma:52748` | var | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os coxae (Hip bone) | İskelet sistemi | Alt ekstremite | Temel | `fma:16585` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os femoris (Femur) | İskelet sistemi | Alt ekstremite | Temel | `fma:9611` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Patella | İskelet sistemi | Alt ekstremite | Temel | `fma:24485` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Tibia | İskelet sistemi | Alt ekstremite | Temel | `fma:24476` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Fibula | İskelet sistemi | Alt ekstremite | Temel | `fma:24479` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os tali (Talus) | İskelet sistemi | Alt ekstremite | Temel | `fma:9708` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Calcaneus | İskelet sistemi | Alt ekstremite | Temel | `fma:24496` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Navicular bone of foot | İskelet sistemi | Alt ekstremite | Temel | `fma:24499` | var (sağ ✓, sol ✓) | ? | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os cuboideum (Cuboid bone) | İskelet sistemi | Alt ekstremite | Temel | `fma:24527` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os cuneiforme mediale (Medial cuneiform bone) | İskelet sistemi | Alt ekstremite | Temel | `fma:24518` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os cuneiforme intermedium (Intermediate cuneiform bone) | İskelet sistemi | Alt ekstremite | Temel | `fma:24519` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os cuneiforme laterale (Lateral cuneiform bone) | İskelet sistemi | Alt ekstremite | Temel | `fma:24520` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os primum metatarsi (First metatarsal bone) | İskelet sistemi | Alt ekstremite | Temel | `fma:24502` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Second metatarsal bone | İskelet sistemi | Alt ekstremite | Temel | `fma:24503` | var (sağ ✓, sol ✓) | ? | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Third metatarsal bone | İskelet sistemi | Alt ekstremite | Temel | `fma:24504` | var (sağ ✓, sol ✓) | ? | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Fourth metatarsal bone | İskelet sistemi | Alt ekstremite | Temel | `fma:24505` | var (sağ ✓, sol ✓) | ? | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os quintum metatarsi (Fifth metatarsal bone) | İskelet sistemi | Alt ekstremite | Temel | `fma:24506` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Proximal phalanx of big toe | İskelet sistemi | Alt ekstremite | Orta | `fma:43252` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Distal phalanx of big toe | İskelet sistemi | Alt ekstremite | Orta | `fma:32627` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Proximal phalanx of second toe | İskelet sistemi | Alt ekstremite | Orta | `fma:32618` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Middle phalanx of second toe | İskelet sistemi | Alt ekstremite | Orta | `fma:32623` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Distal phalanx of second toe | İskelet sistemi | Alt ekstremite | Orta | `fma:32628` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Proximal phalanx of third toe | İskelet sistemi | Alt ekstremite | Orta | `fma:32619` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Middle phalanx of third toe | İskelet sistemi | Alt ekstremite | Orta | `fma:32624` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Distal phalanx of third toe | İskelet sistemi | Alt ekstremite | Orta | `fma:32629` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Proximal phalanx of fourth toe | İskelet sistemi | Alt ekstremite | Orta | `fma:32620` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Middle phalanx of fourth toe | İskelet sistemi | Alt ekstremite | Orta | `fma:32625` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Distal phalanx of fourth toe | İskelet sistemi | Alt ekstremite | Orta | `fma:32630` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Proximal phalanx of little toe | İskelet sistemi | Alt ekstremite | Orta | `fma:32621` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Middle phalanx of little toe | İskelet sistemi | Alt ekstremite | Orta | `fma:230984` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Distal phalanx of little toe | İskelet sistemi | Alt ekstremite | Orta | `fma:32631` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Sesamoid bone of foot | İskelet sistemi | Alt ekstremite | Orta | `fma:45096` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os hyoideum (Hyoid bone) | İskelet sistemi | Boyun | Temel | `fma:52749` | var | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Atlas | İskelet sistemi | Boyun | Temel | `fma:12519` | var | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Axis | İskelet sistemi | Boyun | Temel | `fma:12520` | var | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Third cervical vertebra | İskelet sistemi | Boyun | Orta | `fma:12521` | var | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Fourth cervical vertebra | İskelet sistemi | Boyun | Orta | `fma:12522` | var | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Fifth cervical vertebra | İskelet sistemi | Boyun | Orta | `fma:12523` | var | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Vertebra cervicalis VI (Sixth cervical vertebra) | İskelet sistemi | Boyun | Orta | `fma:12524` | var | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Vertebra prominens (Seventh cervical vertebra) | İskelet sistemi | Boyun | Temel | `fma:12525` | var | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Manubrium sterni (Manubrium) | İskelet sistemi | Toraks | Temel | `fma:7486` | var | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Corpus sterni (Body of sternum) | İskelet sistemi | Toraks | Temel | `fma:7487` | var | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Processus xiphoideus (Xiphoid process) | İskelet sistemi | Toraks | Temel | `fma:7488` | var | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Costa prima (First rib) | İskelet sistemi | Toraks | Temel | `fma:7597` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Costa secunda (Second rib) | İskelet sistemi | Toraks | Temel | `fma:7620` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Third rib | İskelet sistemi | Toraks | Temel | `fma:7638` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Fourth rib | İskelet sistemi | Toraks | Temel | `fma:7749` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Fifth rib | İskelet sistemi | Toraks | Temel | `fma:7776` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Sixth rib | İskelet sistemi | Toraks | Temel | `fma:8147` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Seventh rib | İskelet sistemi | Toraks | Temel | `fma:7830` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Eighth rib | İskelet sistemi | Toraks | Temel | `fma:8120` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Ninth rib | İskelet sistemi | Toraks | Temel | `fma:8337` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Tenth rib | İskelet sistemi | Toraks | Temel | `fma:8418` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Eleventh rib | İskelet sistemi | Toraks | Temel | `fma:8499` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Twelfth rib | İskelet sistemi | Toraks | Temel | `fma:8515` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Clavicula (Clavicle) | İskelet sistemi | Omuz kuşağı | Temel | `fma:13321` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Scapula | İskelet sistemi | Omuz kuşağı | Temel | `fma:13394` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Humerus | İskelet sistemi | Kol | Temel | `fma:13303` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Radius | İskelet sistemi | Önkol | Temel | `fma:23463` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Ulna | İskelet sistemi | Önkol | Temel | `fma:23466` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os scaphoideum (Scaphoid) | İskelet sistemi | El bileği | Temel | `fma:23709` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os lunatum (Lunate) | İskelet sistemi | El bileği | Temel | `fma:23712` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os triquetrum (Triquetrum) | İskelet sistemi | El bileği | Temel | `fma:23715` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os pisiforme (Pisiform) | İskelet sistemi | El bileği | Temel | `fma:23718` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os trapezium (Trapezium) | İskelet sistemi | El bileği | Temel | `fma:23721` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os trapezoideum (Trapezoid) | İskelet sistemi | El bileği | Temel | `fma:23724` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os capitatum (Capitate) | İskelet sistemi | El bileği | Temel | `fma:23727` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os hamatum (Hamate) | İskelet sistemi | El bileği | Temel | `fma:23730` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| First metacarpal | İskelet sistemi | El tarağı | Temel | `fma:23899` | var (sağ ✓, sol ✓) | ? | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Second metacarpal | İskelet sistemi | El tarağı | Temel | `fma:23900` | var (sağ ✓, sol ✓) | ? | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Third metacarpal | İskelet sistemi | El tarağı | Temel | `fma:23901` | var (sağ ✓, sol ✓) | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Fourth metacarpal | İskelet sistemi | El tarağı | Temel | `fma:23902` | var (sağ ✓, sol ✓) | ? | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Fifth metacarpal | İskelet sistemi | El tarağı | Temel | `fma:23903` | var (sağ ✓, sol ✓) | ? | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Proximal phalanx of thumb | İskelet sistemi | El parmakları | Orta | `fma:23918` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Distal phalanx of thumb | İskelet sistemi | El parmakları | Orta | `fma:23945` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Proximal phalanx of index finger | İskelet sistemi | El parmakları | Orta | `fma:23919` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Middle phalanx of index finger | İskelet sistemi | El parmakları | Orta | `fma:23933` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Distal phalanx of index finger | İskelet sistemi | El parmakları | Orta | `fma:23946` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Proximal phalanx of middle finger | İskelet sistemi | El parmakları | Orta | `fma:23920` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Middle phalanx of middle finger | İskelet sistemi | El parmakları | Orta | `fma:23934` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Distal phalanx of middle finger | İskelet sistemi | El parmakları | Orta | `fma:23947` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Proximal phalanx of ring finger | İskelet sistemi | El parmakları | Orta | `fma:23921` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Middle phalanx of ring finger | İskelet sistemi | El parmakları | Orta | `fma:23935` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Distal phalanx of ring finger | İskelet sistemi | El parmakları | Orta | `fma:23948` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Proximal phalanx of little finger | İskelet sistemi | El parmakları | Orta | `fma:23922` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Middle phalanx of little finger | İskelet sistemi | El parmakları | Orta | `fma:23936` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Distal phalanx of little finger | İskelet sistemi | El parmakları | Orta | `fma:23949` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |

## Kapsam hedefi olmayan yapılar

1927 yapı kaydı henüz bir kapsam hedefine bağlı değil (digestive: 138, skeletal: 79, cardiovascular: 784, muscular: 570, respiratory: 119, endocrine: 4, urinary: 8, reproductive: 13, sensory: 28, articular: 22, nervous: 155, integumentary: 3, lymphatic: 4). Bunlar tamamlanma oranına katılmaz.

## 3B model varlıkları

70 varlık (70 anatomik, 0 şematik), 3779 düğüm; modeli olan yapı: 1595; envanterde karşılığı olmayan düğüm: 0.

## İnsan incelemesi ve otomatik kontroller (ayrı ayrı)

- **İnsan inceleme kayıtları:** 0 — henüz hiçbir içerik anatomi uzmanınca incelenmedi.
- **Otomatik doğrulama (npm run content:validate):** 0 hata, 4 uyarı. Otomatik kontroller uzman incelemesinin yerine geçmez.
