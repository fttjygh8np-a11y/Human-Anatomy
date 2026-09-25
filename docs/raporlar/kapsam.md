# Kapsam raporu

> Otomatik üretildi: `npm run report:coverage` · içerik sürümü `9cb374bfdeed33e1` · 2026-09-25.
> Bu rapor içerik kayıtlarının sayımıdır; anatomi uzmanı incelemesinin yerine geçmez. Uzman onayları yalnızca
> `content/reviews/` altındaki, incelemeci adı ve rolü içeren kayıtlardan sayılır.

## Özet

Kapsam matrisindeki toplam hedef yapı: **350**. Tamamlanmış: **0/350 (%0)**.

| Boyut | Tamamlanan |
|---|---:|
| Envanter kaydı | 350/350 (%100) |
| 3B anatomik model | 347/350 (%99) |
| TR/LA/EN adlar | 0/350 (%0) |
| Bilgi kartı içeriği | 119/350 (%34) |
| Model lisansı doğrulanmış | 348/350 (%99) |
| Uzman incelemesi | 0/350 (%0) |
| Tamamlanmış | 0/350 (%0) |
| _Adlar üç dilde mevcut (doğrulanmamış dahil)_ | 148/350 (%42) |

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
| Eklem sistemi | 5 | 5/5 (%100) | 5/5 (%100) | 0/5 (%0) | 0/5 (%0) | 5/5 (%100) | 0/5 (%0) | 0/5 (%0) |
| Kas sistemi | 19 | 19/19 (%100) | 19/19 (%100) | 0/19 (%0) | 0/19 (%0) | 19/19 (%100) | 0/19 (%0) | 0/19 (%0) |
| Dolaşım sistemi | 62 | 62/62 (%100) | 62/62 (%100) | 0/62 (%0) | 0/62 (%0) | 62/62 (%100) | 0/62 (%0) | 0/62 (%0) |
| Lenfatik sistem | 3 | 3/3 (%100) | 3/3 (%100) | 0/3 (%0) | 0/3 (%0) | 3/3 (%100) | 0/3 (%0) | 0/3 (%0) |
| Sinir sistemi | 47 | 47/47 (%100) | 47/47 (%100) | 0/47 (%0) | 0/47 (%0) | 47/47 (%100) | 0/47 (%0) | 0/47 (%0) |
| Solunum sistemi | 12 | 12/12 (%100) | 11/12 (%92) | 0/12 (%0) | 0/12 (%0) | 12/12 (%100) | 0/12 (%0) | 0/12 (%0) |
| Sindirim sistemi | 32 | 32/32 (%100) | 32/32 (%100) | 0/32 (%0) | 0/32 (%0) | 32/32 (%100) | 0/32 (%0) | 0/32 (%0) |
| Üriner sistem | 4 | 4/4 (%100) | 4/4 (%100) | 0/4 (%0) | 0/4 (%0) | 4/4 (%100) | 0/4 (%0) | 0/4 (%0) |
| Üreme sistemi | 27 | 27/27 (%100) | 25/27 (%93) | 0/27 (%0) | 0/27 (%0) | 25/27 (%93) | 0/27 (%0) | 0/27 (%0) |
| Endokrin bezler | 2 | 2/2 (%100) | 2/2 (%100) | 0/2 (%0) | 0/2 (%0) | 2/2 (%100) | 0/2 (%0) | 0/2 (%0) |
| Duyu organları | 4 | 4/4 (%100) | 4/4 (%100) | 0/4 (%0) | 0/4 (%0) | 4/4 (%100) | 0/4 (%0) | 0/4 (%0) |
| Deri ve deri ekleri | 1 | 1/1 (%100) | 1/1 (%100) | 0/1 (%0) | 0/1 (%0) | 1/1 (%100) | 0/1 (%0) | 0/1 (%0) |

## Bölgeye göre (üst düzey bölge)

| Bölge | Hedef | Envanter kaydı | 3B anatomik model | TR/LA/EN adlar | Bilgi kartı içeriği | Model lisansı doğrulanmış | Uzman incelemesi | Tamamlanmış |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Baş | 85 | 85/85 (%100) | 85/85 (%100) | 0/85 (%0) | 14/85 (%16) | 85/85 (%100) | 0/85 (%0) | 0/85 (%0) |
| Boyun | 23 | 23/23 (%100) | 23/23 (%100) | 0/23 (%0) | 8/23 (%35) | 23/23 (%100) | 0/23 (%0) | 0/23 (%0) |
| Sırt | 20 | 20/20 (%100) | 20/20 (%100) | 0/20 (%0) | 18/20 (%90) | 20/20 (%100) | 0/20 (%0) | 0/20 (%0) |
| Toraks | 60 | 60/60 (%100) | 59/60 (%98) | 0/60 (%0) | 15/60 (%25) | 60/60 (%100) | 0/60 (%0) | 0/60 (%0) |
| Karın | 42 | 42/42 (%100) | 42/42 (%100) | 0/42 (%0) | 0/42 (%0) | 42/42 (%100) | 0/42 (%0) | 0/42 (%0) |
| Pelvis ve perine | 34 | 34/34 (%100) | 32/34 (%94) | 0/34 (%0) | 0/34 (%0) | 32/34 (%94) | 0/34 (%0) | 0/34 (%0) |
| Üst ekstremite | 43 | 43/43 (%100) | 43/43 (%100) | 0/43 (%0) | 32/43 (%74) | 43/43 (%100) | 0/43 (%0) | 0/43 (%0) |
| Alt ekstremite | 43 | 43/43 (%100) | 43/43 (%100) | 0/43 (%0) | 32/43 (%74) | 43/43 (%100) | 0/43 (%0) | 0/43 (%0) |

## Ayrıntı düzeyine göre

| Düzey | Hedef | Envanter kaydı | 3B anatomik model | TR/LA/EN adlar | Bilgi kartı içeriği | Model lisansı doğrulanmış | Uzman incelemesi | Tamamlanmış |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Temel | 300 | 300/300 (%100) | 297/300 (%99) | 0/300 (%0) | 69/300 (%23) | 298/300 (%99) | 0/300 (%0) | 0/300 (%0) |
| Orta | 50 | 50/50 (%100) | 50/50 (%100) | 0/50 (%0) | 50/50 (%100) | 50/50 (%100) | 0/50 (%0) | 0/50 (%0) |

## Sistem × bölge matrisi (tamamlanan / hedef)

| Sistem | Baş | Boyun | Sırt | Toraks | Karın | Pelvis ve perine | Üst ekstremite | Alt ekstremite |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| İskelet sistemi | 0/24 | 0/8 | 0/19 | 0/16 | 0/1 | · | 0/32 | 0/32 |
| Eklem sistemi | · | 0/3 | · | · | · | · | 0/1 | 0/1 |
| Kas sistemi | 0/1 | 0/4 | · | 0/3 | 0/2 | · | 0/4 | 0/5 |
| Dolaşım sistemi | 0/4 | 0/3 | · | 0/30 | 0/11 | 0/3 | 0/6 | 0/5 |
| Lenfatik sistem | · | · | · | 0/2 | 0/1 | · | · | · |
| Sinir sistemi | 0/46 | · | 0/1 | · | · | · | · | · |
| Solunum sistemi | · | 0/4 | · | 0/8 | · | · | · | · |
| Sindirim sistemi | 0/5 | 0/1 | · | 0/1 | 0/24 | 0/1 | · | · |
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
| Wirsung kanalı (Pancreatic duct) | Sindirim sistemi | Karın | Temel | `fma:10419` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Disk (Intervertebral disk) | İskelet sistemi | Sırt | Temel | `fma:10446` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| truncus costocervicalis (Costocervical trunk) | Dolaşım sistemi | Toraks | Temel | `fma:10636` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria thyreoidea inferior (Inferior thyroid artery) | Dolaşım sistemi | Boyun | Temel | `fma:10662` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Vena cava inferior (Inferior vena cava) | Dolaşım sistemi | Karın | Temel | `fma:10951` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus pectoralis minor (Pectoralis minor) | Kas sistemi | Toraks | Temel | `fma:13109` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Diyafram (Diaphragm) | Solunum sistemi | Toraks | Temel | `fma:13295` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| vena cephalica (Cephalic vein) | Dolaşım sistemi | Üst ekstremite | Temel | `fma:13324` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Koltuk altı toplardamarı (Axillary vein) | Dolaşım sistemi | Üst ekstremite | Temel | `fma:13329` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| lobus dexter hepatis (Right lobe of liver) | Sindirim sistemi | Karın | Temel | `fma:13362` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| lobus sinister hepatis (Left lobe of liver) | Sindirim sistemi | Karın | Temel | `fma:13363` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| lobus caudatus (Caudate lobe of liver) | Sindirim sistemi | Karın | Temel | `fma:13365` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| columna vertebralis (Vertebral column) | İskelet sistemi | Karın | Temel | `fma:13478` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Hipofiz (Pituitary gland) | Endokrin bezler | Baş | Temel | `fma:13889` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Splenik ven (Splenic vein) | Dolaşım sistemi | Karın | Temel | `fma:14331` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| vena mesenterica superior (Superior mesenteric vein) | Dolaşım sistemi | Karın | Temel | `fma:14332` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Karaciğer damarı (Hepatic vein) | Sindirim sistemi | Karın | Temel | `fma:14337` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Sistik kanal (Cystic duct) | Sindirim sistemi | Karın | Temel | `fma:14539` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Apandis (Appendix) | Sindirim sistemi | Karın | Temel | `fma:14542` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Rektum (Rectum) | Sindirim sistemi | Pelvis ve perine | Temel | `fma:14544` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| colon ascendens (Ascending colon) | Sindirim sistemi | Karın | Temel | `fma:14545` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| colon transversum (Transverse colon) | Sindirim sistemi | Karın | Temel | `fma:14546` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| colon descendens (Descending colon) | Sindirim sistemi | Karın | Temel | `fma:14547` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Ortak hepatik kanal (Common hepatic duct) | Sindirim sistemi | Karın | Temel | `fma:14668` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| ductus hepaticus dexter (Right hepatic duct) | Sindirim sistemi | Karın | Temel | `fma:14669` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| ductus hepaticus sinister (Left hepatic duct) | Sindirim sistemi | Karın | Temel | `fma:14670` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria mesenterica superior (Superior mesenteric artery) | Dolaşım sistemi | Karın | Temel | `fma:14749` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria mesenterica inferior (Inferior mesenteric artery) | Dolaşım sistemi | Karın | Temel | `fma:14750` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria iliaca communis (Common iliac artery) | Dolaşım sistemi | Pelvis ve perine | Temel | `fma:14764` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria hepatica propria (Hepatic artery proper) | Sindirim sistemi | Karın | Temel | `fma:14772` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Splenik arter (Splenic artery) | Dolaşım sistemi | Karın | Temel | `fma:14773` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| truncus coeliacus (Celiac trunk) | Dolaşım sistemi | Karın | Temel | `fma:14812` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Sidik torbası (Urinary bladder) | Üriner sistem | Pelvis ve perine | Temel | `fma:15900` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| fundus uteri (Fundus of uterus) | Üreme sistemi | Pelvis ve perine | Temel | `fma:17561` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| psoas major (Psoas major) | Kas sistemi | Karın | Temel | `fma:18060` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Penis başı (Glans penis) | Üreme sistemi | Pelvis ve perine | Temel | `fma:18247` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Epididimis (Epididymis) | Üreme sistemi | Pelvis ve perine | Temel | `fma:18255` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria iliaca externa (External iliac artery) | Dolaşım sistemi | Pelvis ve perine | Temel | `fma:18805` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria iliaca interna (Internal iliac artery) | Dolaşım sistemi | Pelvis ve perine | Temel | `fma:18808` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| ligamentum uterosacrale (Right uterosacral ligament) | Üreme sistemi | Pelvis ve perine | Temel | `fma:19119` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| ligamentum uterosacrale (Left uterosacral ligament) | Üreme sistemi | Pelvis ve perine | Temel | `fma:19120` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Seminal keseler (Seminal vesicle) | Üreme sistemi | Pelvis ve perine | Temel | `fma:19386` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| corpus spongiosum penis (Corpus spongiosum of penis) | Üreme sistemi | Pelvis ve perine | Temel | `fma:19617` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Korpus kavernozum penis (Corpus cavernosum of penis) | Üreme sistemi | Pelvis ve perine | Temel | `fma:19618` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Üretra (Urethra) | Üriner sistem | Pelvis ve perine | Temel | `fma:19667` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| mesosalpinx (Right mesosalpinx) | Üreme sistemi | Pelvis ve perine | Temel | `fma:19809` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| mesosalpinx (Left mesosalpinx) | Üreme sistemi | Pelvis ve perine | Temel | `fma:19810` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| mesovarium (Right mesovarium) | Üreme sistemi | Pelvis ve perine | Temel | `fma:19817` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| mesovarium (Left mesovarium) | Üreme sistemi | Pelvis ve perine | Temel | `fma:19818` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| ligamentum suspensorium ovarii (Suspensory ligament of right ovary) | Üreme sistemi | Pelvis ve perine | Temel | `fma:19823` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| ligamentum suspensorium ovarii (Suspensory ligament of left ovary) | Üreme sistemi | Pelvis ve perine | Temel | `fma:19824` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| saccus lacrimalis (Lacrimal sac) | Duyu organları | Baş | Temel | `fma:20289` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| vena femoralis (Femoral vein) | Dolaşım sistemi | Alt ekstremite | Temel | `fma:21185` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| vena saphena magna (Great saphenous vein) | Dolaşım sistemi | Alt ekstremite | Temel | `fma:21376` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| obturator internus (Obturator internus) | Kas sistemi | Karın | Temel | `fma:22298` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| tensor fasciae latae (Tensor fasciae latae) | Kas sistemi | Alt ekstremite | Temel | `fma:22423` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Addüktör longus kası (Adductor longus) | Kas sistemi | Alt ekstremite | Temel | `fma:22441` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| adductor brevis (Adductor brevis) | Kas sistemi | Alt ekstremite | Temel | `fma:22442` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| adductor magnus (Adductor magnus) | Kas sistemi | Alt ekstremite | Temel | `fma:22443` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Koltuk altı atardamarı (Axillary artery) | Dolaşım sistemi | Üst ekstremite | Temel | `fma:22654` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria subscapularis (Subscapular artery) | Dolaşım sistemi | Toraks | Temel | `fma:22677` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria brachialis (Brachial artery) | Dolaşım sistemi | Üst ekstremite | Temel | `fma:22689` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria profunda brachii (Deep brachial artery) | Dolaşım sistemi | Üst ekstremite | Temel | `fma:22695` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| vena basilica (Basilic vein) | Dolaşım sistemi | Üst ekstremite | Temel | `fma:22908` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Sağ göğüs kuşağı (Right pectoral girdle) | Kas sistemi | Toraks | Temel | `fma:23218` | var | ? | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Sol göğüs kuşağı (Left pectoral girdle) | Kas sistemi | Toraks | Temel | `fma:23219` | var | ? | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| membrana interossea antebrachii (Interosseous membrane of forearm) | Eklem sistemi | Üst ekstremite | Temel | `fma:23706` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Sağ bronş ağacı (Right bronchial tree) | Solunum sistemi | Toraks | Temel | `fma:26661` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Sol bronş ağacı (Left bronchial tree) | Solunum sistemi | Toraks | Temel | `fma:26662` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| levator scapulae (Levator scapulae) | Kas sistemi | Üst ekstremite | Temel | `fma:32519` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Membrana interossea cruris (Interosseous membrane of leg) | Eklem sistemi | Alt ekstremite | Temel | `fma:35187` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Aort (Aorta) | Dolaşım sistemi | Karın | Temel | `fma:3734` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Yükselen aorta (Ascending aorta) | Dolaşım sistemi | Toraks | Temel | `fma:3736` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| abductor hallucis (Abductor hallucis) | Kas sistemi | Alt ekstremite | Temel | `fma:37448` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arcus aortae (Arch of aorta) | Dolaşım sistemi | Toraks | Temel | `fma:3768` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| aorta descendens (Descending aorta) | Dolaşım sistemi | Toraks | Temel | `fma:3784` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Abdominal aort (Abdominal aorta) | Dolaşım sistemi | Karın | Temel | `fma:3789` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Pronator quadratus kası (Pronator quadratus) | Kas sistemi | Üst ekstremite | Temel | `fma:38453` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| supinator (Supinator) | Kas sistemi | Üst ekstremite | Temel | `fma:38512` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| extensor indicis (Extensor indicis) | Kas sistemi | Üst ekstremite | Temel | `fma:38524` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Brakiyosefalik (Brachiocephalic artery) | Dolaşım sistemi | Toraks | Temel | `fma:3932` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Şah damarı (Common carotid artery) | Dolaşım sistemi | Toraks | Temel | `fma:3939` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| İnternal karotid arter (Internal carotid artery) | Dolaşım sistemi | Boyun | Temel | `fma:3947` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Subklaviyan arter (Subclavian artery) | Dolaşım sistemi | Toraks | Temel | `fma:3951` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Vertebral arter (Vertebral artery) | Dolaşım sistemi | Toraks | Temel | `fma:3956` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria thoracica interna (Internal thoracic artery) | Dolaşım sistemi | Toraks | Temel | `fma:3960` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| truncus thyreocervicalis (Thyrocervical trunk) | Dolaşım sistemi | Toraks | Temel | `fma:3990` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| vena poplitea (Popliteal vein) | Dolaşım sistemi | Alt ekstremite | Temel | `fma:44327` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| vena saphena parva (Small saphenous vein) | Dolaşım sistemi | Alt ekstremite | Temel | `fma:44333` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| platysma (Platysma) | Kas sistemi | Boyun | Temel | `fma:45738` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Kafatası (Skull) | İskelet sistemi | Baş | Temel | `fma:46565` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus arytenoideus obliquus (Oblique arytenoid) | Kas sistemi | Boyun | Temel | `fma:46583` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| musculus thyreoarytenoideus (Thyro-arytenoid) | Kas sistemi | Boyun | Temel | `fma:46588` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| levator veli palatini (Levator veli palatini) | Sindirim sistemi | Baş | Temel | `fma:46727` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| tensor veli palatini (Tensor veli palatini) | Sindirim sistemi | Baş | Temel | `fma:46730` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| sinus coronarius (Coronary sinus) | Dolaşım sistemi | Toraks | Temel | `fma:4706` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Superior vena kava (Superior vena cava) | Dolaşım sistemi | Toraks | Temel | `fma:4720` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| İnternal juguler ven (Internal jugular vein) | Dolaşım sistemi | Boyun | Temel | `fma:4724` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| vena azyga (Azygos vein) | Dolaşım sistemi | Toraks | Temel | `fma:4838` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| levator palpebrae superioris (Levator palpebrae superioris) | Kas sistemi | Baş | Temel | `fma:49041` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location, origin, insertion, action | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| vena hemiazyga (Hemiazygos vein) | Dolaşım sistemi | Toraks | Temel | `fma:4944` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria ophthalmica (Ophthalmic artery) | Dolaşım sistemi | Toraks | Temel | `fma:49868` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Anterior serebral arter (Anterior cerebral artery) | Dolaşım sistemi | Baş | Temel | `fma:50028` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria media cerebri (Right middle cerebral artery) | Dolaşım sistemi | Toraks | Temel | `fma:50082` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Willis poligonu (Cerebral arterial circle) | Dolaşım sistemi | Baş | Temel | `fma:50454` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Posterior inferior serebellar arter (Posterior inferior cerebellar artery) | Dolaşım sistemi | Baş | Temel | `fma:50518` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Anterior spinal arter (Anterior spinal artery) | Dolaşım sistemi | Toraks | Temel | `fma:50531` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Baziler arter (Basilar artery) | Dolaşım sistemi | Toraks | Temel | `fma:50542` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria posterior cerebri (Right posterior cerebral artery) | Dolaşım sistemi | Toraks | Temel | `fma:50584` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| arteria posterior cerebri (Left posterior cerebral artery) | Dolaşım sistemi | Baş | Temel | `fma:50585` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Portal ven (Hepatic portal vein) | Dolaşım sistemi | Karın | Temel | `fma:50735` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Çölyak arter (Celiac artery) | Dolaşım sistemi | Karın | Temel | `fma:50737` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Beyin (Brain) | Sinir sistemi | Baş | Temel | `fma:50801` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Nervus opticus (Optic nerve) | Sinir sistemi | Baş | Temel | `fma:50863` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
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
| hemisphaerium cerebri (Right cerebral hemisphere) | Sinir sistemi | Baş | Temel | `fma:67292` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Oksipital lob (Occipital lobe) | Sinir sistemi | Baş | Temel | `fma:67325` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| İnsular lob (Insula) | Sinir sistemi | Baş | Temel | `fma:67329` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Beyincik (Cerebellum) | Sinir sistemi | Baş | Temel | `fma:67944` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Femoral sinir (Femoral artery) | Dolaşım sistemi | Alt ekstremite | Temel | `fma:70248` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| atrium dextrum (Right atrium) | Dolaşım sistemi | Toraks | Temel | `fma:7096` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| atrium sinistrum (Left atrium) | Dolaşım sistemi | Toraks | Temel | `fma:7097` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| ventriculus dexter (Right ventricle) | Dolaşım sistemi | Toraks | Temel | `fma:7098` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| ventriculus sinister (Left ventricle) | Dolaşım sistemi | Toraks | Temel | `fma:7101` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| lobus thymi (Lobe of thymus) | Lenfatik sistem | Toraks | Temel | `fma:71193` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Yemek borusu (Esophagus) | Sindirim sistemi | Toraks | Temel | `fma:7131` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
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
| ventriculus lateralis (Lateral ventricle) | Sinir sistemi | Baş | Temel | `fma:78448` | var (sağ ✓, sol ✓) | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Üçüncü ventrikül (Third ventricle) | Sinir sistemi | Baş | Temel | `fma:78454` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| aquaeductus mesencephali (Cerebral aqueduct) | Sinir sistemi | Baş | Temel | `fma:78467` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Dördüncü ventrikül (Fourth ventricle) | Sinir sistemi | Baş | Temel | `fma:78469` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| canalis centralis (Central canal of spinal cord) | Sinir sistemi | Sırt | Temel | `fma:78497` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Beyin sapı (Brainstem) | Sinir sistemi | Baş | Temel | `fma:79876` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| truncus pulmonalis (Pulmonary trunk) | Dolaşım sistemi | Toraks | Temel | `fma:8612` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| aorta thoracica (Descending thoracic aorta) | Dolaşım sistemi | Toraks | Temel | `fma:87217` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Karın zarı (Peritoneum) | Sindirim sistemi | Karın | Temel | `fma:9584` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Prostat (Prostate) | Üreme sistemi | Pelvis ve perine | Temel | `fma:9600` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Böbrek üstü bezleri (Adrenal gland) | Endokrin bezler | Karın | Temel | `fma:9604` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Timüs (Thymus) | Lenfatik sistem | Toraks | Temel | `fma:9607` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| cartilago cricoidea (Cricoid cartilage) | Solunum sistemi | Boyun | Temel | `fma:9615` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Sidik borusu (Ureter) | Üriner sistem | Karın | Temel | `fma:9704` | var (sağ ✓, sol ✓) | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Rahim (uterus) | Üreme sistemi | Pelvis ve perine | Temel | `uberon:0000995` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Vajina (vagina) | Üreme sistemi | Pelvis ve perine | Temel | `uberon:0000996` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Sağ fallop borusu (right uterine tube) | Üreme sistemi | Pelvis ve perine | Temel | `uberon:0001302` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Sol fallop borusu (left uterine tube) | Üreme sistemi | Pelvis ve perine | Temel | `uberon:0001303` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Sağ yumurtalık (Right ovary) | Üreme sistemi | Pelvis ve perine | Temel | `uberon:0002118` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Sol yumurtalık (Left ovary) | Üreme sistemi | Pelvis ve perine | Temel | `uberon:0002119` | var | ? | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| corpus uteri (body of uterus) | Üreme sistemi | Pelvis ve perine | Temel | `uberon:0009853` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| ligamentum latum uteri (broad ligament of uterus) | Üreme sistemi | Pelvis ve perine | Temel | `uberon:0012332` | var | — | ? | ? | summary, description, location | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
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
| Proximal phalanx of big toe | İskelet sistemi | Alt ekstremite | Orta | `fma:43252` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Distal phalanx of big toe | İskelet sistemi | Alt ekstremite | Orta | `fma:32627` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Proximal phalanx of second toe | İskelet sistemi | Alt ekstremite | Orta | `fma:32618` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Middle phalanx of second toe | İskelet sistemi | Alt ekstremite | Orta | `fma:32623` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Distal phalanx of second toe | İskelet sistemi | Alt ekstremite | Orta | `fma:32628` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Proximal phalanx of third toe | İskelet sistemi | Alt ekstremite | Orta | `fma:32619` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Middle phalanx of third toe | İskelet sistemi | Alt ekstremite | Orta | `fma:32624` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Distal phalanx of third toe | İskelet sistemi | Alt ekstremite | Orta | `fma:32629` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Proximal phalanx of fourth toe | İskelet sistemi | Alt ekstremite | Orta | `fma:32620` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Middle phalanx of fourth toe | İskelet sistemi | Alt ekstremite | Orta | `fma:32625` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Distal phalanx of fourth toe | İskelet sistemi | Alt ekstremite | Orta | `fma:32630` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Proximal phalanx of little toe | İskelet sistemi | Alt ekstremite | Orta | `fma:32621` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Middle phalanx of little toe | İskelet sistemi | Alt ekstremite | Orta | `fma:230984` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Distal phalanx of little toe | İskelet sistemi | Alt ekstremite | Orta | `fma:32631` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Sesamoid bone of foot | İskelet sistemi | Alt ekstremite | Orta | `fma:45096` | var (sağ ✓, sol ✓) | — | — | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Os hyoideum (Hyoid bone) | İskelet sistemi | Boyun | Temel | `fma:52749` | var | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Atlas | İskelet sistemi | Boyun | Temel | `fma:12519` | var | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Axis | İskelet sistemi | Boyun | Temel | `fma:12520` | var | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Third cervical vertebra | İskelet sistemi | Boyun | Orta | `fma:12521` | var | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Fourth cervical vertebra | İskelet sistemi | Boyun | Orta | `fma:12522` | var | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Fifth cervical vertebra | İskelet sistemi | Boyun | Orta | `fma:12523` | var | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Vertebra cervicalis VI (Sixth cervical vertebra) | İskelet sistemi | Boyun | Orta | `fma:12524` | var | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Vertebra prominens (Seventh cervical vertebra) | İskelet sistemi | Boyun | Temel | `fma:12525` | var | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Manubrium sterni (Manubrium) | İskelet sistemi | Toraks | Temel | `fma:7486` | var | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Corpus sterni (Body of sternum) | İskelet sistemi | Toraks | Temel | `fma:7487` | var | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Processus xiphoideus (Xiphoid process) | İskelet sistemi | Toraks | Temel | `fma:7488` | var | ? | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Costa prima (First rib) | İskelet sistemi | Toraks | Temel | `fma:7597` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Costa secunda (Second rib) | İskelet sistemi | Toraks | Temel | `fma:7620` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Third rib | İskelet sistemi | Toraks | Temel | `fma:7638` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Fourth rib | İskelet sistemi | Toraks | Temel | `fma:7749` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Fifth rib | İskelet sistemi | Toraks | Temel | `fma:7776` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Sixth rib | İskelet sistemi | Toraks | Temel | `fma:8147` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Seventh rib | İskelet sistemi | Toraks | Temel | `fma:7830` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Eighth rib | İskelet sistemi | Toraks | Temel | `fma:8120` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Ninth rib | İskelet sistemi | Toraks | Temel | `fma:8337` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Tenth rib | İskelet sistemi | Toraks | Temel | `fma:8418` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Eleventh rib | İskelet sistemi | Toraks | Temel | `fma:8499` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Twelfth rib | İskelet sistemi | Toraks | Temel | `fma:8515` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
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
| Proximal phalanx of thumb | İskelet sistemi | El parmakları | Orta | `fma:23918` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Distal phalanx of thumb | İskelet sistemi | El parmakları | Orta | `fma:23945` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Proximal phalanx of index finger | İskelet sistemi | El parmakları | Orta | `fma:23919` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Middle phalanx of index finger | İskelet sistemi | El parmakları | Orta | `fma:23933` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Distal phalanx of index finger | İskelet sistemi | El parmakları | Orta | `fma:23946` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Proximal phalanx of middle finger | İskelet sistemi | El parmakları | Orta | `fma:23920` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Middle phalanx of middle finger | İskelet sistemi | El parmakları | Orta | `fma:23934` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Distal phalanx of middle finger | İskelet sistemi | El parmakları | Orta | `fma:23947` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Proximal phalanx of ring finger | İskelet sistemi | El parmakları | Orta | `fma:23921` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Middle phalanx of ring finger | İskelet sistemi | El parmakları | Orta | `fma:23935` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Distal phalanx of ring finger | İskelet sistemi | El parmakları | Orta | `fma:23948` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Proximal phalanx of little finger | İskelet sistemi | El parmakları | Orta | `fma:23922` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Middle phalanx of little finger | İskelet sistemi | El parmakları | Orta | `fma:23936` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |
| Distal phalanx of little finger | İskelet sistemi | El parmakları | Orta | `fma:23949` | var (sağ ✓, sol ✓) | — | ? | ? | — | doğrulanmış | Taslak / Taslak / Taslak / Taslak |

## Kapsam hedefi olmayan yapılar

1633 yapı kaydı henüz bir kapsam hedefine bağlı değil (skeletal: 65, cardiovascular: 690, digestive: 109, respiratory: 112, muscular: 521, reproductive: 17, nervous: 86, articular: 9, sensory: 22, integumentary: 2). Bunlar tamamlanma oranına katılmaz.

## 3B model varlıkları

72 varlık (72 anatomik, 0 şematik), 3812 düğüm; modeli olan yapı: 1627; envanterde karşılığı olmayan düğüm: 0.

## İnsan incelemesi ve otomatik kontroller (ayrı ayrı)

- **İnsan inceleme kayıtları:** 0 — henüz hiçbir içerik anatomi uzmanınca incelenmedi.
- **Otomatik doğrulama (npm run content:validate):** 0 hata, 7 uyarı. Otomatik kontroller uzman incelemesinin yerine geçmez.
