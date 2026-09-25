# Kapsam raporu

> Otomatik üretildi: `npm run report:coverage` · içerik sürümü `b71d393b30255e74` · 2026-09-25.
> Bu rapor içerik kayıtlarının sayımıdır; anatomi uzmanı incelemesinin yerine geçmez. Uzman onayları yalnızca
> `content/reviews/` altındaki, incelemeci adı ve rolü içeren kayıtlardan sayılır.

## Özet

Kapsam matrisindeki toplam hedef yapı: **515**. Tamamlanmış: **0/515 (%0)**.

| Boyut | Tamamlanan |
|---|---:|
| Envanter kaydı | 515/515 (%100) |
| 3B anatomik model | 512/515 (%99) |
| TR/LA/EN adlar | 0/515 (%0) |
| Bilgi kartı içeriği | 119/515 (%23) |
| Model lisansı doğrulanmış | 513/515 (%100) |
| Uzman incelemesi | 0/515 (%0) |
| Tamamlanmış | 0/515 (%0) |
| _Adlar üç dilde mevcut (doğrulanmamış dahil)_ | 168/515 (%33) |

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
| İskelet sistemi | 132 | 132/132 (%100) | 132/132 (%100) | 0/132 (%0) | 119/132 (%90) | 132/132 (%100) | 0/132 (%0) | 0/132 (%0) |
| Eklem sistemi | 6 | 6/6 (%100) | 6/6 (%100) | 0/6 (%0) | 0/6 (%0) | 6/6 (%100) | 0/6 (%0) | 0/6 (%0) |
| Kas sistemi | 113 | 113/113 (%100) | 113/113 (%100) | 0/113 (%0) | 0/113 (%0) | 113/113 (%100) | 0/113 (%0) | 0/113 (%0) |
| Dolaşım sistemi | 125 | 125/125 (%100) | 125/125 (%100) | 0/125 (%0) | 0/125 (%0) | 125/125 (%100) | 0/125 (%0) | 0/125 (%0) |
| Lenfatik sistem | 3 | 3/3 (%100) | 3/3 (%100) | 0/3 (%0) | 0/3 (%0) | 3/3 (%100) | 0/3 (%0) | 0/3 (%0) |
| Sinir sistemi | 51 | 51/51 (%100) | 51/51 (%100) | 0/51 (%0) | 0/51 (%0) | 51/51 (%100) | 0/51 (%0) | 0/51 (%0) |
| Solunum sistemi | 12 | 12/12 (%100) | 11/12 (%92) | 0/12 (%0) | 0/12 (%0) | 12/12 (%100) | 0/12 (%0) | 0/12 (%0) |
| Sindirim sistemi | 35 | 35/35 (%100) | 35/35 (%100) | 0/35 (%0) | 0/35 (%0) | 35/35 (%100) | 0/35 (%0) | 0/35 (%0) |
| Üriner sistem | 4 | 4/4 (%100) | 4/4 (%100) | 0/4 (%0) | 0/4 (%0) | 4/4 (%100) | 0/4 (%0) | 0/4 (%0) |
| Üreme sistemi | 27 | 27/27 (%100) | 25/27 (%93) | 0/27 (%0) | 0/27 (%0) | 25/27 (%93) | 0/27 (%0) | 0/27 (%0) |
| Endokrin bezler | 2 | 2/2 (%100) | 2/2 (%100) | 0/2 (%0) | 0/2 (%0) | 2/2 (%100) | 0/2 (%0) | 0/2 (%0) |
| Duyu organları | 4 | 4/4 (%100) | 4/4 (%100) | 0/4 (%0) | 0/4 (%0) | 4/4 (%100) | 0/4 (%0) | 0/4 (%0) |
| Deri ve deri ekleri | 1 | 1/1 (%100) | 1/1 (%100) | 0/1 (%0) | 0/1 (%0) | 1/1 (%100) | 0/1 (%0) | 0/1 (%0) |

## Bölgeye göre (üst düzey bölge)

| Bölge | Hedef | Envanter kaydı | 3B anatomik model | TR/LA/EN adlar | Bilgi kartı içeriği | Model lisansı doğrulanmış | Uzman incelemesi | Tamamlanmış |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Baş | 102 | 102/102 (%100) | 102/102 (%100) | 0/102 (%0) | 14/102 (%14) | 102/102 (%100) | 0/102 (%0) | 0/102 (%0) |
| Boyun | 39 | 39/39 (%100) | 39/39 (%100) | 0/39 (%0) | 8/39 (%21) | 39/39 (%100) | 0/39 (%0) | 0/39 (%0) |
| Sırt | 38 | 38/38 (%100) | 38/38 (%100) | 0/38 (%0) | 18/38 (%47) | 38/38 (%100) | 0/38 (%0) | 0/38 (%0) |
| Toraks | 91 | 91/91 (%100) | 90/91 (%99) | 0/91 (%0) | 15/91 (%16) | 91/91 (%100) | 0/91 (%0) | 0/91 (%0) |
| Karın | 57 | 57/57 (%100) | 57/57 (%100) | 0/57 (%0) | 0/57 (%0) | 57/57 (%100) | 0/57 (%0) | 0/57 (%0) |
| Pelvis ve perine | 42 | 42/42 (%100) | 40/42 (%95) | 0/42 (%0) | 0/42 (%0) | 40/42 (%95) | 0/42 (%0) | 0/42 (%0) |
| Üst ekstremite | 69 | 69/69 (%100) | 69/69 (%100) | 0/69 (%0) | 32/69 (%46) | 69/69 (%100) | 0/69 (%0) | 0/69 (%0) |
| Alt ekstremite | 77 | 77/77 (%100) | 77/77 (%100) | 0/77 (%0) | 32/77 (%42) | 77/77 (%100) | 0/77 (%0) | 0/77 (%0) |

## Ayrıntı düzeyine göre

| Düzey | Hedef | Envanter kaydı | 3B anatomik model | TR/LA/EN adlar | Bilgi kartı içeriği | Model lisansı doğrulanmış | Uzman incelemesi | Tamamlanmış |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Temel | 465 | 465/465 (%100) | 462/465 (%99) | 0/465 (%0) | 69/465 (%15) | 463/465 (%100) | 0/465 (%0) | 0/465 (%0) |
| Orta | 50 | 50/50 (%100) | 50/50 (%100) | 0/50 (%0) | 50/50 (%100) | 50/50 (%100) | 0/50 (%0) | 0/50 (%0) |

## Sistem × bölge matrisi (tamamlanan / hedef)

| Sistem | Baş | Boyun | Sırt | Toraks | Karın | Pelvis ve perine | Üst ekstremite | Alt ekstremite |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| İskelet sistemi | 0/24 | 0/8 | 0/19 | 0/16 | 0/1 | · | 0/32 | 0/32 |
| Eklem sistemi | · | 0/3 | · | · | · | · | 0/1 | 0/2 |
| Kas sistemi | 0/11 | 0/18 | 0/18 | 0/9 | 0/4 | 0/3 | 0/25 | 0/25 |
| Dolaşım sistemi | 0/6 | 0/5 | · | 0/55 | 0/22 | 0/8 | 0/11 | 0/18 |
| Lenfatik sistem | · | · | · | 0/2 | 0/1 | · | · | · |
| Sinir sistemi | 0/50 | · | 0/1 | · | · | · | · | · |
| Solunum sistemi | · | 0/4 | · | 0/8 | · | · | · | · |
| Sindirim sistemi | 0/6 | 0/1 | · | 0/1 | 0/26 | 0/1 | · | · |
| Üriner sistem | · | · | · | · | 0/2 | 0/2 | · | · |
| Üreme sistemi | · | · | · | · | · | 0/27 | · | · |
| Endokrin bezler | 0/1 | · | · | · | 0/1 | · | · | · |
| Duyu organları | 0/4 | · | · | · | · | · | · | · |
| Deri ve deri ekleri | · | · | · | · | · | 0/1 | · | · |

## Hedef yapılar

Ad sütunları: ✓ doğrulandı · ? doğrulanmadı · — yok. İnceleme: metin/etiket/geometri/ilişki.

| Hedef | Sistem | Bölge | Düzey | Envanter | Model | TR | LA | EN | Eksik içerik | Lisans | İnceleme |
|---|---|---|---|---|---|:-:|:-:|:-:|---|---|---|
| Vertebra thoracica prima (First thoracic vertebra) | İskelet sistemi | Sırt | Orta | `fma:9165` | var | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Second thoracic vertebra | İskelet sistemi | Sırt | Orta | `fma:9187` | var | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Third thoracic vertebra | İskelet sistemi | Sırt | Orta | `fma:9209` | var | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Fourth thoracic vertebra | İskelet sistemi | Sırt | Orta | `fma:9248` | var | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Fifth thoracic vertebra | İskelet sistemi | Sırt | Orta | `fma:9922` | var | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Sixth thoracic vertebra | İskelet sistemi | Sırt | Orta | `fma:9945` | var | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Seventh thoracic vertebra | İskelet sistemi | Sırt | Orta | `fma:9968` | var | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Eighth thoracic vertebra | İskelet sistemi | Sırt | Orta | `fma:9991` | var | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Ninth thoracic vertebra | İskelet sistemi | Sırt | Orta | `fma:10014` | var | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Tenth thoracic vertebra | İskelet sistemi | Sırt | Orta | `fma:10037` | var | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Eleventh thoracic vertebra | İskelet sistemi | Sırt | Orta | `fma:10059` | var | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Twelfth thoracic vertebra | İskelet sistemi | Sırt | Orta | `fma:10081` | var | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| First lumbar vertebra | İskelet sistemi | Sırt | Orta | `fma:13072` | var | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Second lumbar vertebra | İskelet sistemi | Sırt | Orta | `fma:13073` | var | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Third lumbar vertebra | İskelet sistemi | Sırt | Orta | `fma:13074` | var | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Fourth lumbar vertebra | İskelet sistemi | Sırt | Orta | `fma:13075` | var | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Fifth lumbar vertebra | İskelet sistemi | Sırt | Orta | `fma:13076` | var | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
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
| musculus biceps brachii (Biceps brachii) | Kas sistemi | Baş | Temel | `ax:ta2-2464` | var (sağ ✓, sol ✓) | — | ? | ? | description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Wirsung kanalı (Pancreatic duct) | Sindirim sistemi | Karın | Temel | `fma:10419` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Disk (Intervertebral disk) | İskelet sistemi | Sırt | Temel | `fma:10446` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| truncus costocervicalis (Costocervical trunk) | Dolaşım sistemi | Toraks | Temel | `fma:10636` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria musculophrenica (Musculophrenic artery) | Dolaşım sistemi | Toraks | Temel | `fma:10645` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria epigastrica superior (Superior epigastric artery) | Dolaşım sistemi | Toraks | Temel | `fma:10646` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria cervicalis profunda (Deep cervical artery) | Dolaşım sistemi | Boyun | Temel | `fma:10659` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria thyreoidea inferior (Inferior thyroid artery) | Dolaşım sistemi | Boyun | Temel | `fma:10662` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria suprascapularis (Suprascapular artery) | Dolaşım sistemi | Toraks | Temel | `fma:10663` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria transversa colli (Transverse cervical artery) | Dolaşım sistemi | Boyun | Temel | `fma:10664` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Vena cava inferior (Inferior vena cava) | Dolaşım sistemi | Karın | Temel | `fma:10951` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus pectoralis minor (Pectoralis minor) | Kas sistemi | Toraks | Temel | `fma:13109` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Diyafram (Diaphragm) | Solunum sistemi | Toraks | Temel | `fma:13295` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| vena cephalica (Cephalic vein) | Dolaşım sistemi | Üst ekstremite | Temel | `fma:13324` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Koltuk altı toplardamarı (Axillary vein) | Dolaşım sistemi | Üst ekstremite | Temel | `fma:13329` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus obliquus externus abdominis (External oblique) | Kas sistemi | Karın | Temel | `fma:13335` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Sternohyoid kas (Sternohyoid) | Kas sistemi | Boyun | Temel | `fma:13341` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Omohyoid kas (Omohyoid) | Kas sistemi | Boyun | Temel | `fma:13342` | var (sağ ✓, sol ✓) | ? | ? | ? | description, location, origin, insertion | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Sternothyroid kas (Sternothyroid) | Kas sistemi | Boyun | Temel | `fma:13343` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Thyrohyoid kas (Thyrohyoid) | Kas sistemi | Boyun | Temel | `fma:13344` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| lobus dexter hepatis (Right lobe of liver) | Sindirim sistemi | Karın | Temel | `fma:13362` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| lobus sinister hepatis (Left lobe of liver) | Sindirim sistemi | Karın | Temel | `fma:13363` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| lobus caudatus (Caudate lobe of liver) | Sindirim sistemi | Karın | Temel | `fma:13365` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus pectoralis major (Right pectoralis major) | Kas sistemi | Toraks | Temel | `fma:13373` | var | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus pectoralis major (Left pectoralis major) | Kas sistemi | Toraks | Temel | `fma:13374` | var | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus rhomboideus major (Rhomboid major) | Kas sistemi | Üst ekstremite | Temel | `fma:13379` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus rhomboideus minor (Rhomboid minor) | Kas sistemi | Üst ekstremite | Temel | `fma:13380` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus scalenus anterior (Scalenus anterior) | Kas sistemi | Boyun | Temel | `fma:13385` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus scalenus medius (Scalenus medius) | Kas sistemi | Boyun | Temel | `fma:13386` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus scalenus posterior (Scalenus posterior) | Kas sistemi | Boyun | Temel | `fma:13387` | var (sağ ✓, sol ✓) | — | ? | ? | description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus serratus anterior (Serratus anterior) | Kas sistemi | Toraks | Temel | `fma:13397` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus serratus posterior superior (Serratus posterior superior) | Kas sistemi | Sırt | Temel | `fma:13401` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus serratus posterior inferior (Serratus posterior inferior) | Kas sistemi | Sırt | Temel | `fma:13402` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus sternocleidomastoideus (Sternocleidomastoid) | Kas sistemi | Boyun | Temel | `fma:13407` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus subclavius (Subclavius) | Kas sistemi | Toraks | Temel | `fma:13410` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus subscapularis (Subscapularis) | Kas sistemi | Üst ekstremite | Temel | `fma:13413` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| columna vertebralis (Vertebral column) | İskelet sistemi | Karın | Temel | `fma:13478` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Hipofiz (Pituitary gland) | Endokrin bezler | Baş | Temel | `fma:13889` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Splenik ven (Splenic vein) | Dolaşım sistemi | Karın | Temel | `fma:14331` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| vena mesenterica superior (Superior mesenteric vein) | Dolaşım sistemi | Karın | Temel | `fma:14332` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| vena iliaca communis (Common iliac vein) | Dolaşım sistemi | Pelvis ve perine | Temel | `fma:14333` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Karaciğer damarı (Hepatic vein) | Sindirim sistemi | Karın | Temel | `fma:14337` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| vena hepatica intermedia (Middle hepatic vein) | Dolaşım sistemi | Karın | Temel | `fma:14340` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Sistik kanal (Cystic duct) | Sindirim sistemi | Karın | Temel | `fma:14539` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Apandis (Appendix) | Sindirim sistemi | Karın | Temel | `fma:14542` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Rektum (Rectum) | Sindirim sistemi | Pelvis ve perine | Temel | `fma:14544` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| colon ascendens (Ascending colon) | Sindirim sistemi | Karın | Temel | `fma:14545` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| colon transversum (Transverse colon) | Sindirim sistemi | Karın | Temel | `fma:14546` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| colon descendens (Descending colon) | Sindirim sistemi | Karın | Temel | `fma:14547` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Ortak hepatik kanal (Common hepatic duct) | Sindirim sistemi | Karın | Temel | `fma:14668` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| ductus hepaticus dexter (Right hepatic duct) | Sindirim sistemi | Karın | Temel | `fma:14669` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| ductus hepaticus sinister (Left hepatic duct) | Sindirim sistemi | Karın | Temel | `fma:14670` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteriae lumbales (Lumbar artery) | Dolaşım sistemi | Karın | Temel | `fma:14735` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria mesenterica superior (Superior mesenteric artery) | Dolaşım sistemi | Karın | Temel | `fma:14749` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria mesenterica inferior (Inferior mesenteric artery) | Dolaşım sistemi | Karın | Temel | `fma:14750` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria renalis (Renal artery) | Dolaşım sistemi | Karın | Temel | `fma:14751` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria suprarenalis media (Middle suprarenal artery) | Dolaşım sistemi | Karın | Temel | `fma:14754` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria iliaca communis (Common iliac artery) | Dolaşım sistemi | Pelvis ve perine | Temel | `fma:14764` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria hepatica communis (Common hepatic artery) | Dolaşım sistemi | Karın | Temel | `fma:14771` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria hepatica propria (Hepatic artery proper) | Sindirim sistemi | Karın | Temel | `fma:14772` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Splenik arter (Splenic artery) | Dolaşım sistemi | Karın | Temel | `fma:14773` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria hepatica dextra (Right hepatic artery) | Sindirim sistemi | Karın | Temel | `fma:14778` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria hepatica sinistra (Left hepatic artery) | Sindirim sistemi | Karın | Temel | `fma:14779` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria pancreatica inferior (Inferior pancreatic artery) | Dolaşım sistemi | Karın | Temel | `fma:14790` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria pancreatica magna (Great pancreatic artery) | Dolaşım sistemi | Karın | Temel | `fma:14792` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria caudae pancreatis (Caudal pancreatic artery) | Dolaşım sistemi | Karın | Temel | `fma:14793` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| truncus coeliacus (Celiac trunk) | Dolaşım sistemi | Karın | Temel | `fma:14812` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| venae lumbales (Lumbar vein) | Dolaşım sistemi | Karın | Temel | `fma:15370` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| vena mesenterica inferior (Inferior mesenteric vein) | Dolaşım sistemi | Karın | Temel | `fma:15391` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Sidik torbası (Urinary bladder) | Üriner sistem | Pelvis ve perine | Temel | `fma:15900` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| fundus uteri (Fundus of uterus) | Üreme sistemi | Pelvis ve perine | Temel | `fma:17561` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| psoas major (Psoas major) | Kas sistemi | Karın | Temel | `fma:18060` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Penis başı (Glans penis) | Üreme sistemi | Pelvis ve perine | Temel | `fma:18247` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Epididimis (Epididymis) | Üreme sistemi | Pelvis ve perine | Temel | `fma:18255` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria iliaca externa (External iliac artery) | Dolaşım sistemi | Pelvis ve perine | Temel | `fma:18805` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria iliaca interna (Internal iliac artery) | Dolaşım sistemi | Pelvis ve perine | Temel | `fma:18808` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| vena iliaca externa (External iliac vein) | Dolaşım sistemi | Pelvis ve perine | Temel | `fma:18883` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| vena iliaca interna (Internal iliac vein) | Dolaşım sistemi | Pelvis ve perine | Temel | `fma:18884` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| venae gluteae superiores (Superior gluteal vein) | Dolaşım sistemi | Alt ekstremite | Temel | `fma:18908` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| venae gluteae inferiores (Inferior gluteal vein) | Dolaşım sistemi | Alt ekstremite | Temel | `fma:18911` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus piriformis (Piriformis) | Kas sistemi | Karın | Temel | `fma:19082` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus coccygeus (Coccygeus) | Kas sistemi | Pelvis ve perine | Temel | `fma:19088` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| ligamentum uterosacrale (Right uterosacral ligament) | Üreme sistemi | Pelvis ve perine | Temel | `fma:19119` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| ligamentum uterosacrale (Left uterosacral ligament) | Üreme sistemi | Pelvis ve perine | Temel | `fma:19120` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Seminal keseler (Seminal vesicle) | Üreme sistemi | Pelvis ve perine | Temel | `fma:19386` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| corpus spongiosum penis (Corpus spongiosum of penis) | Üreme sistemi | Pelvis ve perine | Temel | `fma:19617` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Korpus kavernozum penis (Corpus cavernosum of penis) | Üreme sistemi | Pelvis ve perine | Temel | `fma:19618` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Üretra (Urethra) | Üriner sistem | Pelvis ve perine | Temel | `fma:19667` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Penisin dorsal arteri (Dorsal artery of penis) | Dolaşım sistemi | Pelvis ve perine | Temel | `fma:19795` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| mesosalpinx (Right mesosalpinx) | Üreme sistemi | Pelvis ve perine | Temel | `fma:19809` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| mesosalpinx (Left mesosalpinx) | Üreme sistemi | Pelvis ve perine | Temel | `fma:19810` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| mesovarium (Right mesovarium) | Üreme sistemi | Pelvis ve perine | Temel | `fma:19817` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| mesovarium (Left mesovarium) | Üreme sistemi | Pelvis ve perine | Temel | `fma:19818` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| ligamentum suspensorium ovarii (Suspensory ligament of right ovary) | Üreme sistemi | Pelvis ve perine | Temel | `fma:19823` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| ligamentum suspensorium ovarii (Suspensory ligament of left ovary) | Üreme sistemi | Pelvis ve perine | Temel | `fma:19824` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| saccus lacrimalis (Lacrimal sac) | Duyu organları | Baş | Temel | `fma:20289` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria profunda femoris (Right deep femoral artery) | Dolaşım sistemi | Alt ekstremite | Temel | `fma:20796` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria profunda femoris (Left deep femoral artery) | Dolaşım sistemi | Alt ekstremite | Temel | `fma:20797` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria circumflexa lateralis femoris (Lateral circumflex femoral artery) | Dolaşım sistemi | Alt ekstremite | Temel | `fma:20798` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| vena femoralis (Femoral vein) | Dolaşım sistemi | Alt ekstremite | Temel | `fma:21185` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| vena dorsalis profunda penis (Deep dorsal vein of penis) | Dolaşım sistemi | Pelvis ve perine | Temel | `fma:21354` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| vena saphena magna (Great saphenous vein) | Dolaşım sistemi | Alt ekstremite | Temel | `fma:21376` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Dış anal sfinkter (External anal sphincter) | Kas sistemi | Pelvis ve perine | Temel | `fma:21930` | var | ? | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| obturator internus (Obturator internus) | Kas sistemi | Karın | Temel | `fma:22298` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| obturator externus (Obturator externus) | Kas sistemi | Alt ekstremite | Temel | `fma:22299` | var (sağ ✓, sol ✓) | — | ? | ? | description, location, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus iliacus (Iliacus) | Kas sistemi | Pelvis ve perine | Temel | `fma:22310` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus gluteus maximus (Gluteus maximus) | Kas sistemi | Alt ekstremite | Temel | `fma:22314` | var (sağ ✓, sol ✓) | — | ? | ? | description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus gluteus medius (Gluteus medius) | Kas sistemi | Alt ekstremite | Temel | `fma:22315` | var (sağ ✓, sol ✓) | — | ? | ? | description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus gluteus minimus (Gluteus minimus) | Kas sistemi | Alt ekstremite | Temel | `fma:22317` | var (sağ ✓, sol ✓) | — | ? | ? | description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus gemellus superior (Gemellus superior) | Kas sistemi | Alt ekstremite | Temel | `fma:22318` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus gemellus inferior (Gemellus inferior) | Kas sistemi | Alt ekstremite | Temel | `fma:22320` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus sartorius (Sartorius) | Kas sistemi | Alt ekstremite | Temel | `fma:22353` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus biceps femoris (Biceps femoris) | Kas sistemi | Baş | Temel | `fma:22356` | var (sağ ✓, sol ✓) | — | ? | ? | description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus semitendinosus (Semitendinosus) | Kas sistemi | Alt ekstremite | Temel | `fma:22357` | var (sağ ✓, sol ✓) | — | ? | ? | description, location, insertion | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| tensor fasciae latae (Tensor fasciae latae) | Kas sistemi | Alt ekstremite | Temel | `fma:22423` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus rectus femoris (Rectus femoris) | Kas sistemi | Alt ekstremite | Temel | `fma:22430` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus vastus lateralis (Vastus lateralis) | Kas sistemi | Alt ekstremite | Temel | `fma:22431` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus vastus medialis (Vastus medialis) | Kas sistemi | Alt ekstremite | Temel | `fma:22432` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus vastus intermedius (Vastus intermedius) | Kas sistemi | Alt ekstremite | Temel | `fma:22433` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus semimembranosus (Semimembranosus) | Kas sistemi | Alt ekstremite | Temel | `fma:22438` | var (sağ ✓, sol ✓) | — | ? | ? | description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Addüktör longus kası (Adductor longus) | Kas sistemi | Alt ekstremite | Temel | `fma:22441` | var (sağ ✓, sol ✓) | ? | ? | ? | description, location, insertion | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| adductor brevis (Adductor brevis) | Kas sistemi | Alt ekstremite | Temel | `fma:22442` | var (sağ ✓, sol ✓) | — | ? | ? | description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| adductor magnus (Adductor magnus) | Kas sistemi | Alt ekstremite | Temel | `fma:22443` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| extensor longus hallucis (Extensor hallucis longus) | Kas sistemi | Alt ekstremite | Temel | `fma:22533` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus gastrocnemius (Gastrocnemius) | Kas sistemi | Baş | Temel | `fma:22541` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus soleus (Soleus) | Kas sistemi | Alt ekstremite | Temel | `fma:22542` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus plantaris (Plantaris) | Kas sistemi | Alt ekstremite | Temel | `fma:22543` | var (sağ ✓, sol ✓) | — | ? | ? | description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus popliteus (Popliteus) | Kas sistemi | Alt ekstremite | Temel | `fma:22590` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| flexor longus hallucis (Flexor hallucis longus) | Kas sistemi | Alt ekstremite | Temel | `fma:22593` | var (sağ ✓, sol ✓) | — | ? | ? | description, location, origin | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus splenius capitis (Splenius capitis) | Kas sistemi | Sırt | Temel | `fma:22653` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Koltuk altı atardamarı (Axillary artery) | Dolaşım sistemi | Üst ekstremite | Temel | `fma:22654` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria thoracoacromialis (Right thoraco-acromial artery) | Dolaşım sistemi | Toraks | Temel | `fma:22672` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria thoracoacromialis (Left thoraco-acromial artery) | Dolaşım sistemi | Üst ekstremite | Temel | `fma:22673` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria thoracica lateralis (Lateral thoracic artery) | Dolaşım sistemi | Toraks | Temel | `fma:22674` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria subscapularis (Subscapular artery) | Dolaşım sistemi | Toraks | Temel | `fma:22677` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria circumflexa anterior humeri (Anterior circumflex humeral artery) | Dolaşım sistemi | Toraks | Temel | `fma:22680` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus splenius colli (Splenius cervicis) | Kas sistemi | Sırt | Temel | `fma:22681` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria circumflexa posterior humeri (Posterior circumflex humeral artery) | Dolaşım sistemi | Toraks | Temel | `fma:22684` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria brachialis (Brachial artery) | Dolaşım sistemi | Üst ekstremite | Temel | `fma:22689` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria profunda brachii (Deep brachial artery) | Dolaşım sistemi | Üst ekstremite | Temel | `fma:22695` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus iliocostalis lumborum (Iliocostalis lumborum) | Kas sistemi | Sırt | Temel | `fma:22702` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus iliocostalis thoracis (Iliocostalis thoracis) | Kas sistemi | Sırt | Temel | `fma:22703` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus iliocostalis colli (Iliocostalis cervicis) | Kas sistemi | Sırt | Temel | `fma:22704` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria collateralis ulnaris superior (Superior ulnar collateral artery) | Dolaşım sistemi | Üst ekstremite | Temel | `fma:22706` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus longissimus thoracis (Longissimus thoracis) | Kas sistemi | Sırt | Temel | `fma:22709` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria collateralis ulnaris inferior (Inferior ulnar collateral artery) | Dolaşım sistemi | Üst ekstremite | Temel | `fma:22710` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus longissimus colli (Longissimus cervicis) | Kas sistemi | Sırt | Temel | `fma:22711` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus longissimus capitis (Longissimus capitis) | Kas sistemi | Sırt | Temel | `fma:22714` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Radyal arter (Radial artery) | Dolaşım sistemi | Toraks | Temel | `fma:22730` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria recurrens radialis (Radial recurrent artery) | Dolaşım sistemi | Toraks | Temel | `fma:22748` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus spinalis thoracis (Spinalis thoracis) | Kas sistemi | Sırt | Temel | `fma:22765` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Ulnar arter (Ulnar artery) | Dolaşım sistemi | Toraks | Temel | `fma:22796` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria interossea communis (Common interosseous artery) | Dolaşım sistemi | Toraks | Temel | `fma:22806` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria interossea anterior (Anterior interosseous artery) | Dolaşım sistemi | Toraks | Temel | `fma:22810` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus semispinalis thoracis (Semispinalis thoracis) | Kas sistemi | Sırt | Temel | `fma:22828` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus semispinalis colli (Semispinalis cervicis) | Kas sistemi | Sırt | Temel | `fma:22829` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus semispinalis capitis (Semispinalis capitis) | Kas sistemi | Sırt | Temel | `fma:22830` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| vena basilica (Basilic vein) | Dolaşım sistemi | Üst ekstremite | Temel | `fma:22908` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| venae radiales (Radial vein) | Dolaşım sistemi | Üst ekstremite | Temel | `fma:22947` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| venae ulnares (Ulnar vein) | Dolaşım sistemi | Üst ekstremite | Temel | `fma:22950` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria circumflexa scapulae (Circumflex scapular artery) | Dolaşım sistemi | Toraks | Temel | `fma:23179` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Sağ göğüs kuşağı (Right pectoral girdle) | Kas sistemi | Toraks | Temel | `fma:23218` | var | ? | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Sol göğüs kuşağı (Left pectoral girdle) | Kas sistemi | Toraks | Temel | `fma:23219` | var | ? | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| membrana interossea antebrachii (Interosseous membrane of forearm) | Eklem sistemi | Üst ekstremite | Temel | `fma:23706` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Sağ bronş ağacı (Right bronchial tree) | Solunum sistemi | Toraks | Temel | `fma:26661` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Sol bronş ağacı (Left bronchial tree) | Solunum sistemi | Toraks | Temel | `fma:26662` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| levator scapulae (Levator scapulae) | Kas sistemi | Üst ekstremite | Temel | `fma:32519` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus deltoideus (Deltoid) | Kas sistemi | Üst ekstremite | Temel | `fma:32521` | var (sağ ✓, sol ✓) | — | ? | ? | description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus infraspinatus (Right infraspinatus muscle) | Kas sistemi | Üst ekstremite | Temel | `fma:32547` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus infraspinatus (Left infraspinatus muscle) | Kas sistemi | Üst ekstremite | Temel | `fma:32548` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus teres major (Teres major) | Kas sistemi | Üst ekstremite | Temel | `fma:32549` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus teres minor (Teres minor) | Kas sistemi | Üst ekstremite | Temel | `fma:32550` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Membrana interossea cruris (Interosseous membrane of leg) | Eklem sistemi | Alt ekstremite | Temel | `fma:35187` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Aort (Aorta) | Dolaşım sistemi | Karın | Temel | `fma:3734` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Yükselen aorta (Ascending aorta) | Dolaşım sistemi | Toraks | Temel | `fma:3736` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| abductor brevis pollicis (Abductor pollicis brevis) | Kas sistemi | Üst ekstremite | Temel | `fma:37373` | var (sağ ✓, sol ✓) | — | ? | ? | description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| flexor brevis pollicis (Flexor pollicis brevis) | Kas sistemi | Üst ekstremite | Temel | `fma:37378` | var (sağ ✓, sol ✓) | — | ? | ? | description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus opponens pollicis (Opponens pollicis) | Kas sistemi | Üst ekstremite | Temel | `fma:37379` | var (sağ ✓, sol ✓) | — | ? | ? | description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| abductor hallucis (Abductor hallucis) | Kas sistemi | Alt ekstremite | Temel | `fma:37448` | var (sağ ✓, sol ✓) | — | ? | ? | description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus coracobrachialis (Coracobrachialis) | Kas sistemi | Üst ekstremite | Temel | `fma:37664` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus brachialis (Brachialis) | Kas sistemi | Üst ekstremite | Temel | `fma:37667` | var (sağ ✓, sol ✓) | — | ? | ? | description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arcus aortae (Arch of aorta) | Dolaşım sistemi | Toraks | Temel | `fma:3768` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus triceps brachii (Triceps brachii) | Kas sistemi | Baş | Temel | `fma:37688` | var (sağ ✓, sol ✓) | — | ? | ? | description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus anconeus (Anconeus) | Kas sistemi | Üst ekstremite | Temel | `fma:37704` | var (sağ ✓, sol ✓) | — | ? | ? | description, location, insertion | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| aorta descendens (Descending aorta) | Dolaşım sistemi | Toraks | Temel | `fma:3784` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Abdominal aort (Abdominal aorta) | Dolaşım sistemi | Karın | Temel | `fma:3789` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Pronator quadratus kası (Pronator quadratus) | Kas sistemi | Üst ekstremite | Temel | `fma:38453` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus palmaris longus (Palmaris longus) | Kas sistemi | Üst ekstremite | Temel | `fma:38462` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| flexor longus pollicis (Flexor pollicis longus) | Kas sistemi | Üst ekstremite | Temel | `fma:38481` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus brachioradialis (Brachioradialis) | Kas sistemi | Üst ekstremite | Temel | `fma:38485` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| supinator (Supinator) | Kas sistemi | Üst ekstremite | Temel | `fma:38512` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| abductor longus pollicis (Abductor pollicis longus) | Kas sistemi | Üst ekstremite | Temel | `fma:38515` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| extensor brevis pollicis (Extensor pollicis brevis) | Kas sistemi | Üst ekstremite | Temel | `fma:38518` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| extensor longus pollicis (Extensor pollicis longus) | Kas sistemi | Üst ekstremite | Temel | `fma:38521` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| extensor indicis (Extensor indicis) | Kas sistemi | Üst ekstremite | Temel | `fma:38524` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Brakiyosefalik (Brachiocephalic artery) | Dolaşım sistemi | Toraks | Temel | `fma:3932` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Şah damarı (Common carotid artery) | Dolaşım sistemi | Toraks | Temel | `fma:3939` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| İnternal karotid arter (Internal carotid artery) | Dolaşım sistemi | Boyun | Temel | `fma:3947` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Subklaviyan arter (Subclavian artery) | Dolaşım sistemi | Toraks | Temel | `fma:3951` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Vertebral arter (Vertebral artery) | Dolaşım sistemi | Toraks | Temel | `fma:3956` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria thoracica interna (Internal thoracic artery) | Dolaşım sistemi | Toraks | Temel | `fma:3960` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| truncus thyreocervicalis (Thyrocervical trunk) | Dolaşım sistemi | Toraks | Temel | `fma:3990` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Gracilis kası (Gracilis) | Kas sistemi | Alt ekstremite | Temel | `fma:43882` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria tibialis anterior (Anterior tibial artery) | Dolaşım sistemi | Alt ekstremite | Temel | `fma:43894` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria tibialis posterior (Posterior tibial artery) | Dolaşım sistemi | Alt ekstremite | Temel | `fma:43895` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria recurrens tibialis anterior (Anterior tibial recurrent artery) | Dolaşım sistemi | Alt ekstremite | Temel | `fma:43902` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria dorsalis pedis (Dorsalis pedis artery) | Dolaşım sistemi | Alt ekstremite | Temel | `fma:43915` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria plantaris lateralis (Lateral plantar artery) | Dolaşım sistemi | Alt ekstremite | Temel | `fma:43926` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| ligamentum plantare longum (Long plantar ligament) | Eklem sistemi | Alt ekstremite | Temel | `fma:44248` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| vena poplitea (Popliteal vein) | Dolaşım sistemi | Alt ekstremite | Temel | `fma:44327` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| venae tibiales anteriores (Anterior tibial vein) | Dolaşım sistemi | Alt ekstremite | Temel | `fma:44331` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| venae tibiales posteriores (Posterior tibial vein) | Dolaşım sistemi | Alt ekstremite | Temel | `fma:44332` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| vena saphena parva (Small saphenous vein) | Dolaşım sistemi | Alt ekstremite | Temel | `fma:44333` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| platysma (Platysma) | Kas sistemi | Boyun | Temel | `fma:45738` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Digastrik kas (Digastric) | Kas sistemi | Boyun | Temel | `fma:46291` | var (sağ ✓, sol ✓) | ? | ? | ? | description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Milohiyoid kas (Mylohyoid) | Kas sistemi | Boyun | Temel | `fma:46320` | var (sağ ✓, sol ✓) | ? | ? | ? | description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Geniohyoid kas (Geniohyoid) | Kas sistemi | Boyun | Temel | `fma:46325` | var (sağ ✓, sol ✓) | ? | ? | ? | description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Kafatası (Skull) | İskelet sistemi | Baş | Temel | `fma:46565` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus cricoarytenoideus posterior (Posterior crico-arytenoid) | Kas sistemi | Boyun | Temel | `fma:46576` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus arytenoideus transversus (Transverse arytenoid) | Kas sistemi | Boyun | Temel | `fma:46582` | var | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus arytenoideus obliquus (Oblique arytenoid) | Kas sistemi | Boyun | Temel | `fma:46583` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus thyreoarytenoideus (Thyro-arytenoid) | Kas sistemi | Boyun | Temel | `fma:46588` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| levator veli palatini (Levator veli palatini) | Sindirim sistemi | Baş | Temel | `fma:46727` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| tensor veli palatini (Tensor veli palatini) | Sindirim sistemi | Baş | Temel | `fma:46730` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus uvulae (Uvular muscle) | Sindirim sistemi | Baş | Temel | `fma:46733` | var | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| sinus coronarius (Coronary sinus) | Dolaşım sistemi | Toraks | Temel | `fma:4706` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Superior vena kava (Superior vena cava) | Dolaşım sistemi | Toraks | Temel | `fma:4720` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| İnternal juguler ven (Internal jugular vein) | Dolaşım sistemi | Boyun | Temel | `fma:4724` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| vena intercostalis superior sinistra (Left superior intercostal vein) | Dolaşım sistemi | Toraks | Temel | `fma:4797` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| vena azyga (Azygos vein) | Dolaşım sistemi | Toraks | Temel | `fma:4838` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| vena intercostalis superior dextra (Right superior intercostal vein) | Dolaşım sistemi | Toraks | Temel | `fma:4877` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus rectus superior (Superior rectus) | Kas sistemi | Baş | Temel | `fma:49035` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus rectus inferior (Inferior rectus) | Kas sistemi | Baş | Temel | `fma:49036` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus rectus medialis (Medial rectus) | Kas sistemi | Baş | Temel | `fma:49037` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus rectus lateralis bulbi oculi (Lateral rectus) | Kas sistemi | Baş | Temel | `fma:49038` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus obliquus superior bulbi oculi (Superior oblique) | Kas sistemi | Baş | Temel | `fma:49039` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus obliquus inferior bulbi oculi (Inferior oblique) | Kas sistemi | Baş | Temel | `fma:49040` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| levator palpebrae superioris (Levator palpebrae superioris) | Kas sistemi | Baş | Temel | `fma:49041` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| vena hemiazyga (Hemiazygos vein) | Dolaşım sistemi | Toraks | Temel | `fma:4944` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria ophthalmica (Ophthalmic artery) | Dolaşım sistemi | Toraks | Temel | `fma:49868` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Anterior serebral arter (Anterior cerebral artery) | Dolaşım sistemi | Baş | Temel | `fma:50028` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria media cerebri (Right middle cerebral artery) | Dolaşım sistemi | Toraks | Temel | `fma:50082` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Posterior komünikan arter (Posterior communicating artery) | Dolaşım sistemi | Toraks | Temel | `fma:50084` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Anterior koroideal arter (Anterior choroidal artery) | Dolaşım sistemi | Toraks | Temel | `fma:50087` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Anterior komünikan arter (Anterior communicating artery) | Dolaşım sistemi | Toraks | Temel | `fma:50169` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Willis poligonu (Cerebral arterial circle) | Dolaşım sistemi | Baş | Temel | `fma:50454` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Posterior inferior serebellar arter (Posterior inferior cerebellar artery) | Dolaşım sistemi | Baş | Temel | `fma:50518` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Anterior spinal arter (Anterior spinal artery) | Dolaşım sistemi | Toraks | Temel | `fma:50531` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Baziler arter (Basilar artery) | Dolaşım sistemi | Toraks | Temel | `fma:50542` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Anterior inferior serebellar arter (Anterior inferior cerebellar artery) | Dolaşım sistemi | Baş | Temel | `fma:50544` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| rami pontis arteriae basilaris (Right pontine artery) | Dolaşım sistemi | Toraks | Temel | `fma:50561` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Superior serebellar arter (Superior cerebellar artery) | Dolaşım sistemi | Baş | Temel | `fma:50573` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria posterior cerebri (Right posterior cerebral artery) | Dolaşım sistemi | Toraks | Temel | `fma:50584` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria posterior cerebri (Left posterior cerebral artery) | Dolaşım sistemi | Baş | Temel | `fma:50585` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Portal ven (Hepatic portal vein) | Dolaşım sistemi | Karın | Temel | `fma:50735` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Çölyak arter (Celiac artery) | Dolaşım sistemi | Karın | Temel | `fma:50737` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Beyin (Brain) | Sinir sistemi | Baş | Temel | `fma:50801` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Nervus opticus (Optic nerve) | Sinir sistemi | Baş | Temel | `fma:50863` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Troklear sinir (Trochlear nerve) | Sinir sistemi | Baş | Temel | `fma:50865` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| extensor brevis hallucis (Extensor hallucis brevis) | Kas sistemi | Alt ekstremite | Temel | `fma:51141` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| nervus lacrimalis (Lacrimal nerve) | Sinir sistemi | Baş | Temel | `fma:52628` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| nervus frontalis (Frontal nerve) | Sinir sistemi | Baş | Temel | `fma:52638` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| nervus supraorbitalis (Supra-orbital nerve) | Sinir sistemi | Baş | Temel | `fma:52655` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Sağ göz çukuru (Right orbit) | İskelet sistemi | Baş | Temel | `fma:53082` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Sol göz çukuru (Left orbit) | İskelet sistemi | Baş | Temel | `fma:53083` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Beyin tası (Neurocranium) | İskelet sistemi | Baş | Temel | `fma:53672` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| viscerocranium (Viscerocranium) | İskelet sistemi | Baş | Temel | `fma:53673` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Kasık kılı (Pubic hair) | Deri ve deri ekleri | Pelvis ve perine | Temel | `fma:54319` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Dil (Tongue) | Sindirim sistemi | Baş | Temel | `fma:54640` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Yumuşak damak (Soft palate) | Sindirim sistemi | Baş | Temel | `fma:55021` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| raphe pharyngis (Pharyngeal raphe) | Sindirim sistemi | Boyun | Temel | `fma:55077` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Çene altı tükrük bezi (Submandibular gland) | Sindirim sistemi | Baş | Temel | `fma:55093` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| cartilago thyreoidea (Thyroid cartilage) | Solunum sistemi | Boyun | Temel | `fma:55099` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Aritenoid (Arytenoid cartilage) | Solunum sistemi | Boyun | Temel | `fma:55109` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Epiglottis | Solunum sistemi | Boyun | Temel | `fma:55130` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| membrana thyreohyoidea (Thyrohyoid membrane) | Kas sistemi | Boyun | Temel | `fma:55132` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| ligamentum thyreohyoideum medianum (Median thyrohyoid ligament) | Eklem sistemi | Boyun | Temel | `fma:55138` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| ligamentum thyreohyoideum laterale (Lateral thyrohyoid ligament) | Eklem sistemi | Boyun | Temel | `fma:55139` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| ligamentum teres uteri (Right round ligament of uterus) | Üreme sistemi | Pelvis ve perine | Temel | `fma:57789` | yok | — | ? | ? | summary, description, location | — | Taslak / Taslak / Taslak / Taslak |
| ligamentum teres uteri (Left round ligament of uterus) | Üreme sistemi | Pelvis ve perine | Temel | `fma:57790` | yok | — | ? | ? | summary, description, location | — | Taslak / Taslak / Taslak / Taslak |
| Saydam tabaka (Cornea) | İskelet sistemi | Baş | Temel | `fma:58238` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Göz akı (Sclera) | İskelet sistemi | Baş | Temel | `fma:58269` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Damar tabaka (Choroid) | İskelet sistemi | Baş | Temel | `fma:58298` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| pars optica retinae (Optic part of retina) | Duyu organları | Baş | Temel | `fma:58604` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Vitreus sıvı (Vitreous body) | İskelet sistemi | Baş | Temel | `fma:58827` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| glandula lacrimalis (Lacrimal gland) | İskelet sistemi | Baş | Temel | `fma:59101` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| apparatus lacrimalis (Right lacrimal apparatus) | Duyu organları | Baş | Temel | `fma:59368` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| apparatus lacrimalis (Left lacrimal apparatus) | Duyu organları | Baş | Temel | `fma:59369` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| hemisphaerium cerebri (Left cerebral hemisphere) | Sinir sistemi | Baş | Temel | `fma:61819` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| gyrus frontalis superior (Superior frontal gyrus) | Sinir sistemi | Baş | Temel | `fma:61857` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| gyrus frontalis medius (Middle frontal gyrus) | Sinir sistemi | Baş | Temel | `fma:61859` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| İnferior frontal girus (Inferior frontal gyrus) | Sinir sistemi | Baş | Temel | `fma:61860` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| gyrus precentralis (Precentral gyrus) | Sinir sistemi | Baş | Temel | `fma:61894` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| gyrus postcentralis (Postcentral gyrus) | Sinir sistemi | Baş | Temel | `fma:61896` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| gyrus supramarginalis (Supramarginal gyrus) | Sinir sistemi | Baş | Temel | `fma:61897` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Angular girus (Angular gyrus) | Sinir sistemi | Baş | Temel | `fma:61898` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| lobulus parietalis superior (Superior parietal lobule) | Sinir sistemi | Baş | Temel | `fma:61899` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| gyrus parahippocampalis (Parahippocampal gyrus) | Sinir sistemi | Baş | Temel | `fma:61918` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| capsula interna (Internal capsule) | Sinir sistemi | Baş | Temel | `fma:61950` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Beyin (Forebrain) | Sinir sistemi | Baş | Temel | `fma:61992` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Orta beyin (Midbrain) | Sinir sistemi | Baş | Temel | `fma:61993` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| telencephalon (Telencephalon) | Sinir sistemi | Baş | Temel | `fma:62000` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| diencephalon (Diencephalon) | Sinir sistemi | Baş | Temel | `fma:62001` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Omurilik soğanı (Medulla oblongata) | Sinir sistemi | Baş | Temel | `fma:62004` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Talamus (Thalamus) | Sinir sistemi | Baş | Temel | `fma:62007` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Hipotalamus (Hypothalamus) | Sinir sistemi | Baş | Temel | `fma:62008` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| epithalamus (Epithalamus) | Sinir sistemi | Baş | Temel | `fma:62009` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| habenula (Habenula) | Sinir sistemi | Baş | Temel | `fma:62032` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Kozalaksı bez (Pineal body) | Sinir sistemi | Baş | Temel | `fma:62033` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| tuber cinereum (Tuber cinereum) | Sinir sistemi | Baş | Temel | `fma:62327` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| pedunculus cerebri (Peduncle of midbrain) | Sinir sistemi | Baş | Temel | `fma:62394` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Üst tepe (Superior colliculus) | Sinir sistemi | Baş | Temel | `fma:62403` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| colliculus inferior (Inferior colliculus) | Sinir sistemi | Baş | Temel | `fma:62404` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Singulat korteks (Cingulate gyrus) | Sinir sistemi | Baş | Temel | `fma:62434` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| hippocampus (Hippocampus) | Sinir sistemi | Baş | Temel | `fma:62493` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteriae intercostales posteriores (Posterior intercostal arteries) | Dolaşım sistemi | Toraks | Temel | `fma:63822` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria intercostalis posterior prima (First posterior intercostal artery) | Dolaşım sistemi | Toraks | Temel | `fma:66241` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria thoracodorsalis (Thoracodorsal artery) | Dolaşım sistemi | Toraks | Temel | `fma:66320` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| hemisphaerium cerebri (Right cerebral hemisphere) | Sinir sistemi | Baş | Temel | `fma:67292` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Oksipital lob (Occipital lobe) | Sinir sistemi | Baş | Temel | `fma:67325` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| İnsular lob (Insula) | Sinir sistemi | Baş | Temel | `fma:67329` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Beyincik (Cerebellum) | Sinir sistemi | Baş | Temel | `fma:67944` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria suprarenalis inferior (Inferior suprarenal artery) | Dolaşım sistemi | Karın | Temel | `fma:69264` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Femoral sinir (Femoral artery) | Dolaşım sistemi | Alt ekstremite | Temel | `fma:70248` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| venae intercostales anteriores (Set of anterior intercostal veins) | Dolaşım sistemi | Toraks | Temel | `fma:70839` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| atrium dextrum (Right atrium) | Dolaşım sistemi | Toraks | Temel | `fma:7096` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| atrium sinistrum (Left atrium) | Dolaşım sistemi | Toraks | Temel | `fma:7097` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| ventriculus dexter (Right ventricle) | Dolaşım sistemi | Toraks | Temel | `fma:7098` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| ventriculus sinister (Left ventricle) | Dolaşım sistemi | Toraks | Temel | `fma:7101` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| lobus thymi (Lobe of thymus) | Lenfatik sistem | Toraks | Temel | `fma:71193` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| vena thoracica lateralis (Lateral thoracic vein) | Dolaşım sistemi | Toraks | Temel | `fma:71210` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculi interspinales lumborum (Set of interspinales lumborum) | Kas sistemi | Sırt | Temel | `fma:71307` | var | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Yemek borusu (Esophagus) | Sindirim sistemi | Toraks | Temel | `fma:7131` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculi intertransversarii anteriores colli (Set of anterior cervical intertransversarii) | Kas sistemi | Sırt | Temel | `fma:71442` | var | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Mide (Stomach) | Sindirim sistemi | Karın | Temel | `fma:7148` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Dalak (Spleen) | Lenfatik sistem | Karın | Temel | `fma:7196` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Karaciğer (Liver) | Sindirim sistemi | Karın | Temel | `fma:7197` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Pankreas (Pancreas) | Sindirim sistemi | Karın | Temel | `fma:7198` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| İnce bağırsak (Small intestine) | Sindirim sistemi | Karın | Temel | `fma:7200` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Kalın bağırsak (Large intestine) | Sindirim sistemi | Karın | Temel | `fma:7201` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Safra kesesi (Gallbladder) | Sindirim sistemi | Karın | Temel | `fma:7202` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Böbrek (Kidney) | Üriner sistem | Karın | Temel | `fma:7203` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| On iki parmak barsağı (Duodenum) | Sindirim sistemi | Karın | Temel | `fma:7206` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| jejunum (Jejunum) | Sindirim sistemi | Karın | Temel | `fma:7207` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| ileum (Ileum) | Sindirim sistemi | Karın | Temel | `fma:7208` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Er bezi (Testis) | Üreme sistemi | Pelvis ve perine | Temel | `fma:7210` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| ligamentum stylohyoideum (Stylohyoid ligament) | Eklem sistemi | Boyun | Temel | `fma:72308` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| valva atrioventricularis dextra (Tricuspid valve) | Dolaşım sistemi | Toraks | Temel | `fma:7234` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| valva atrioventricularis sinistra (Mitral valve) | Dolaşım sistemi | Toraks | Temel | `fma:7235` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| valva aortae (Aortic valve) | Dolaşım sistemi | Toraks | Temel | `fma:7236` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| valva trunci pulmonalis (Pulmonary valve) | Dolaşım sistemi | Toraks | Temel | `fma:7246` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| lobus frontalis (Right frontal lobe) | Sinir sistemi | Baş | Temel | `fma:72969` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| lobus frontalis (Left frontal lobe) | Sinir sistemi | Baş | Temel | `fma:72970` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| lobus temporalis (Right temporal lobe) | Sinir sistemi | Baş | Temel | `fma:72971` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| lobus temporalis (Left temporal lobe) | Sinir sistemi | Baş | Temel | `fma:72972` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| lobus parietalis (Right parietal lobe) | Sinir sistemi | Baş | Temel | `fma:72973` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| lobus parietalis (Left parietal lobe) | Sinir sistemi | Baş | Temel | `fma:72974` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| lobus limbicus (Right limbic lobe) | Sinir sistemi | Baş | Temel | `fma:72980` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| lobus limbicus (Left limbic lobe) | Sinir sistemi | Baş | Temel | `fma:72981` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| pulmo dexter (Right lung) | Solunum sistemi | Toraks | Temel | `fma:7309` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| pulmo sinister (Left lung) | Solunum sistemi | Toraks | Temel | `fma:7310` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Bronş ağacı (Tracheobronchial tree) | Solunum sistemi | Toraks | Temel | `fma:7393` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Soluk borusu (Trachea) | Solunum sistemi | Toraks | Temel | `fma:7394` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| bronchus principalis (Main bronchus) | Solunum sistemi | Toraks | Temel | `fma:7405` | kısmi (sağ —, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Göğüs kemiği (Sternum) | İskelet sistemi | Toraks | Temel | `fma:7485` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| ligamentum cardinale (Cardinal ligament) | Üreme sistemi | Pelvis ve perine | Temel | `fma:77064` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria poplitea (Popliteal artery) | Dolaşım sistemi | Alt ekstremite | Temel | `fma:77155` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculi spinales (Spinalis) | Kas sistemi | Sırt | Temel | `fma:77179` | var | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |

… ve 115 hedef daha (tam liste: kapsam.json).

## Kapsam hedefi olmayan yapılar

1222 yapı kaydı henüz bir kapsam hedefine bağlı değil (skeletal: 65, cardiovascular: 541, digestive: 106, respiratory: 112, reproductive: 17, muscular: 277, nervous: 74, sensory: 22, integumentary: 2, articular: 6). Bunlar tamamlanma oranına katılmaz.

## 3B model varlıkları

72 varlık (72 anatomik, 0 şematik), 3812 düğüm; modeli olan yapı: 1627; envanterde karşılığı olmayan düğüm: 0.

## İnsan incelemesi ve otomatik kontroller (ayrı ayrı)

- **İnsan inceleme kayıtları:** 0 — henüz hiçbir içerik anatomi uzmanınca incelenmedi.
- **Otomatik doğrulama (npm run content:validate):** 0 hata, 7 uyarı. Otomatik kontroller uzman incelemesinin yerine geçmez.
