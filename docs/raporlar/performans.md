# Performans ölçümü

> **Önemli uyarı — bu sayılar gerçek cihazlar hakkında bir şey söylemez.** Ölçüm, GPU'suz bir
> kapsayıcıda (container) başsız Chromium ile yapıldı; WebGL **SwiftShader yazılım işleyicisiyle, yani CPU üzerinde**
> çalıştı. Yazılım işlemede kare süreleri gerçek bir GPU'ya göre kat kat uzundur ve CPU çekirdek
> sayısına bağlıdır. Gereksinimlerdeki (docs/gereksinimler.md §11) **"belirlenen referans cihazda
> en az 30 FPS" hedefi henüz gerçek donanımda ölçülmedi**; bu rapor o hedefin karşılandığını
> göstermez. Rapor yalnızca ölçüm altyapısının çalıştığını gösterir ve aynı ortamda yapılan
> değişikliklerin önce/sonra karşılaştırması için bir taban değer verir.

Oluşturma: 2026-09-25T16:20:50.412Z · commit `9f56390` · `npm run perf` (scripts/perf/measure.ts)

## Ölçüm ortamı

| Özellik | Değer |
| --- | --- |
| Tarayıcı | Chromium 141.0.7390.37 (başsız) |
| WebGL işleyici | ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver) (Google Inc. (Google)) |
| CPU | Intel(R) Xeon(R) Processor @ 2.10GHz × 4 |
| Bellek | 16.095,7 MB |
| İşletim sistemi | Linux 6.18.44-fc-v37 (x64) |
| Node.js | v22.22.2 |
| Görüntü alanı | 1280×800, cihaz piksel oranı 1 |
| Ağ | yerel sunucu (vite preview, gzip), ağ kısıtlaması yok |
| Adres | `http://localhost:4184/?perf` |

## Yükleme ve geçiş süreleri

Süreler sayfa gezintisinin başlangıcından (performance.now()) itibaren ölçülmüştür.

| Ölçüt | Süre |
| --- | --- |
| İlk bayt (HTML) | 5 ms |
| DOMContentLoaded | 106 ms |
| İlk kullanılabilir görünüm (yapı ağacı çizildi; arama ve bilgi kartı kullanılabilir) | 474 ms |
| İlk 3B kare (model içeren ilk kare) | 5.044 ms |
| Varsayılan modellerin tamamı yüklendi (skeletal, 7 model) | 2.441 ms |
| Sistem geçişi: muscular açıldı → 9 model yüklendi ve çizildi | 2.056 ms |

## Etkileşim sırasında kare süreleri

`engine.runOrbitBenchmark(5.000)` (5,0 sn): kamera hedef çevresinde 360° döner, her animasyon karesi çizilir.

| Sahne | Model | Kare | FPS | p50 kare (ms) | p95 kare (ms) | En uzun (ms) | Çizim çağrısı | Üçgen |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| skeletal | 7 | 12 | 2,0 | 599,9 | 616,7 | 633,4 | 268 | 589.416 |
| skeletal + muscular | 9 | 6 | 0,8 | 1.699,9 | 1.796,7 | 1.816,7 | 667 | 1.744.570 |

## Bellek

| Durum | JS yığını (kullanılan / ayrılan) | Geometri | Doku |
| --- | --- | --- | --- |
| Varsayılan modeller yüklendikten sonra | 27,2 MB / 56,3 MB | 267 | 2 |
| muscular açıldıktan ve ölçümden sonra | 43,1 MB / 96,6 MB | 666 | 2 |

GPU belleği tarayıcıdan okunamadığı için ölçülmedi.

### Kısa kararlılık denetimi

muscular sistemi üç kez kapatılıp yeniden açıldı (modeller boşaltılıp yeniden yüklendi). Geometri sayısının
sabit kalması, boşaltılan GPU kaynaklarının temizlendiğini gösterir. Bu, saatler süren kullanımın yerine geçmez.

| Döngü | Geometri | JS yığını |
| --- | --- | --- |
| 1 | 666 | 34,8 MB |
| 2 | 666 | 33,0 MB |
| 3 | 666 | 63,0 MB |

## İndirme boyutları

Resource Timing'e göre aktarılan (sıkıştırılmış) ve açılmış boyutlar; ilk ziyaret, önbellek boş.

| Tür | Dosya | Aktarılan | Açılmış |
| --- | --- | --- | --- |
| HTML belgesi | 1 | 1,2 kB | 0,9 kB |
| JavaScript | 6 | 327,3 kB | 1.169,8 kB |
| CSS | 1 | 6,3 kB | 23,8 kB |
| İçerik verisi (data/*.json) | 12 | 378,4 kB | 6.584,8 kB |
| 3B modeller (GLB) | 43 | 8.609,2 kB | 25.472,1 kB |
| Diğer | 2 | 130,8 kB | 130,2 kB |
| **Toplam** | 65 | **9.453,1 kB** | 33.381,7 kB |

<details>
<summary>Dosya başına</summary>

| Dosya | Tür | Aktarılan | Açılmış | Süre |
| --- | --- | --- | --- | --- |
| `/` | belge | 1,2 kB | 0,9 kB | 106 ms |
| `/assets/three-R_ZW0Q4u.js` | js | 181,4 kB | 712,5 kB | 68 ms |
| `/assets/react-Dy-GIXkn.js` | js | 66,3 kB | 213,7 kB | 32 ms |
| `/assets/vendor-Cg9C1mOW.js` | js | 33,4 kB | 115,8 kB | 31 ms |
| `/assets/index-CMZmfpKF.js` | js | 28,5 kB | 84,8 kB | 28 ms |
| `/assets/ViewerCanvas-CoesqZQ8.js` | js | 16,8 kB | 42,3 kB | 11 ms |
| `/assets/rolldown-runtime-CbXtAM7H.js` | js | 0,9 kB | 0,6 kB | 13 ms |
| `/assets/index-A3EyKwPK.css` | css | 6,3 kB | 23,8 kB | 21 ms |
| `/data/structures.json` | veri | 178,7 kB | 3.446,8 kB | 86 ms |
| `/data/assets.json` | veri | 172,9 kB | 968,3 kB | 68 ms |
| `/data/relations.json` | veri | 11,9 kB | 163,8 kB | 45 ms |
| `/data/sources.json` | veri | 4,2 kB | 11,0 kB | 26 ms |
| `/data/scope.json` | veri | 3,8 kB | 43,4 kB | 74 ms |
| `/data/lessons.json` | veri | 2,8 kB | 9,1 kB | 45 ms |
| `/data/taxonomy.json` | veri | 2,0 kB | 4,8 kB | 21 ms |
| `/data/manifest.json` | veri | 0,8 kB | 1,0 kB | 12 ms |
| `/data/questions.json` | veri | 0,3 kB | 0,0 kB | 45 ms |
| `/data/reviews.json` | veri | 0,3 kB | 0,0 kB | 63 ms |
| `/data/assets.json` | veri | 0,3 kB | 968,3 kB | 18 ms |
| `/data/assets.json` | veri | 0,3 kB | 968,3 kB | 7 ms |
| `/models/bp3d/skeletal.head.glb` | model | 1.164,1 kB | 1.163,8 kB | 38 ms |
| `/models/bp3d/skeletal.thorax.glb` | model | 770,8 kB | 770,6 kB | 35 ms |
| `/models/bp3d/muscular.other.glb` | model | 761,1 kB | 760,8 kB | 51 ms |
| `/models/bp3d/muscular.neck.glb` | model | 754,3 kB | 754,0 kB | 51 ms |
| `/models/bp3d/muscular.lower_limb.glb` | model | 750,6 kB | 750,3 kB | 53 ms |
| `/models/bp3d/muscular.back.glb` | model | 714,4 kB | 714,1 kB | 42 ms |
| `/models/bp3d/muscular.thorax.glb` | model | 679,5 kB | 679,2 kB | 54 ms |
| `/models/bp3d/muscular.upper_limb.glb` | model | 645,0 kB | 644,7 kB | 66 ms |
| `/models/bp3d/muscular.abdomen.glb` | model | 641,7 kB | 641,4 kB | 35 ms |
| `/models/bp3d/muscular.head.glb` | model | 594,1 kB | 593,8 kB | 45 ms |
| `/models/bp3d/skeletal.lower_limb.glb` | model | 372,5 kB | 372,2 kB | 31 ms |
| `/models/bp3d/skeletal.upper_limb.glb` | model | 344,4 kB | 344,1 kB | 31 ms |
| `/models/bp3d/skeletal.abdomen.glb` | model | 172,7 kB | 172,4 kB | 6 ms |
| `/models/bp3d/skeletal.neck.glb` | model | 130,1 kB | 129,8 kB | 28 ms |
| `/models/bp3d/muscular.pelvis_perineum.glb` | model | 87,2 kB | 86,9 kB | 48 ms |
| `/models/bp3d/skeletal.back.glb` | model | 18,8 kB | 18,5 kB | 27 ms |
| `/models/bp3d/muscular.abdomen.glb` | model | 0,3 kB | 641,4 kB | 42 ms |
| `/models/bp3d/muscular.back.glb` | model | 0,3 kB | 714,1 kB | 43 ms |
| `/models/bp3d/muscular.head.glb` | model | 0,3 kB | 593,8 kB | 41 ms |
| `/models/bp3d/muscular.lower_limb.glb` | model | 0,3 kB | 750,3 kB | 42 ms |
| `/models/bp3d/muscular.neck.glb` | model | 0,3 kB | 754,0 kB | 43 ms |
| `/models/bp3d/muscular.other.glb` | model | 0,3 kB | 760,8 kB | 43 ms |
| `/models/bp3d/muscular.pelvis_perineum.glb` | model | 0,3 kB | 86,9 kB | 31 ms |
| `/models/bp3d/muscular.thorax.glb` | model | 0,3 kB | 679,2 kB | 41 ms |
| `/models/bp3d/muscular.upper_limb.glb` | model | 0,3 kB | 644,7 kB | 43 ms |
| `/models/bp3d/muscular.abdomen.glb` | model | 0,3 kB | 641,4 kB | 15 ms |
| `/models/bp3d/muscular.back.glb` | model | 0,3 kB | 714,1 kB | 13 ms |
| `/models/bp3d/muscular.head.glb` | model | 0,3 kB | 593,8 kB | 12 ms |
| `/models/bp3d/muscular.lower_limb.glb` | model | 0,3 kB | 750,3 kB | 14 ms |
| `/models/bp3d/muscular.neck.glb` | model | 0,3 kB | 754,0 kB | 17 ms |
| `/models/bp3d/muscular.other.glb` | model | 0,3 kB | 760,8 kB | 19 ms |
| `/models/bp3d/muscular.pelvis_perineum.glb` | model | 0,3 kB | 86,9 kB | 21 ms |
| `/models/bp3d/muscular.thorax.glb` | model | 0,3 kB | 679,2 kB | 23 ms |
| `/models/bp3d/muscular.upper_limb.glb` | model | 0,3 kB | 644,7 kB | 25 ms |
| `/models/bp3d/muscular.abdomen.glb` | model | 0,3 kB | 641,4 kB | 41 ms |
| `/models/bp3d/muscular.back.glb` | model | 0,3 kB | 714,1 kB | 43 ms |
| `/models/bp3d/muscular.head.glb` | model | 0,3 kB | 593,8 kB | 42 ms |
| `/models/bp3d/muscular.lower_limb.glb` | model | 0,3 kB | 750,3 kB | 43 ms |
| `/models/bp3d/muscular.neck.glb` | model | 0,3 kB | 754,0 kB | 43 ms |
| `/models/bp3d/muscular.other.glb` | model | 0,3 kB | 760,8 kB | 43 ms |
| `/models/bp3d/muscular.pelvis_perineum.glb` | model | 0,3 kB | 86,9 kB | 35 ms |
| `/models/bp3d/muscular.thorax.glb` | model | 0,3 kB | 679,2 kB | 41 ms |
| `/models/bp3d/muscular.upper_limb.glb` | model | 0,3 kB | 644,7 kB | 41 ms |
| `/assets/inter-latin-ext-wght-normal-DO1Apj_S.woff2` | diğer | 83,4 kB | 83,1 kB | 44 ms |
| `/assets/inter-latin-wght-normal-Dx4kXJAl.woff2` | diğer | 47,4 kB | 47,1 kB | 51 ms |

</details>

## Yeniden üretme

```sh
npm run build          # perf derleme yapmaz
npm run perf           # dist/ için kendi vite preview sunucusunu başlatır (port 4184)
npm run perf -- --url http://localhost:4173/   # çalışan bir sunucuyu ölç
```

## Gerçek cihazda ölçüm (yapılacak)

30 FPS hedefinin doğrulanması için referans cihaz profili tanımlanıp ölçüm gerçek donanımda
tekrarlanmalıdır; örneğin tümleşik GPU'lu orta sınıf bir dizüstü bilgisayar ve orta sınıf bir
Android tablet, güncel Chrome, gerçekçi ağ koşulu (ör. "Fast 4G" kısıtlaması). Bu cihazlarda
uygulama `?perf` ile açılıp tarayıcı konsolunda `await __anatomi.engine.runOrbitBenchmark(10000)`
çalıştırılabilir ya da `npm run perf -- --url <adres> --headed` ile GPU'lu bir makinede aynı betik
kullanılabilir. Sonuçlar cihaz adı ve tarayıcı sürümüyle birlikte bu klasöre eklenmelidir.
