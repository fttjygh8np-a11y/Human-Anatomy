# Performans ölçümü

> **Önemli uyarı — bu sayılar gerçek cihazlar hakkında bir şey söylemez.** Ölçüm, GPU'suz bir
> kapsayıcıda (container) başsız Chromium ile yapıldı; WebGL **SwiftShader yazılım işleyicisiyle, yani CPU üzerinde**
> çalıştı. Yazılım işlemede kare süreleri gerçek bir GPU'ya göre kat kat uzundur ve CPU çekirdek
> sayısına bağlıdır. Gereksinimlerdeki (docs/gereksinimler.md §11) **"belirlenen referans cihazda
> en az 30 FPS" hedefi henüz gerçek donanımda ölçülmedi**; bu rapor o hedefin karşılandığını
> göstermez. Rapor yalnızca ölçüm altyapısının çalıştığını gösterir ve aynı ortamda yapılan
> değişikliklerin önce/sonra karşılaştırması için bir taban değer verir.

Oluşturma: 2026-09-25T11:19:55.278Z · commit `4b86b64` · `npm run perf` (scripts/perf/measure.ts)

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
| İlk bayt (HTML) | 7 ms |
| DOMContentLoaded | 109 ms |
| İlk kullanılabilir görünüm (yapı ağacı çizildi; arama ve bilgi kartı kullanılabilir) | 479 ms |
| İlk 3B kare (model içeren ilk kare) | 984 ms |
| Varsayılan modellerin tamamı yüklendi (skeletal, 7 model) | 1.097 ms |
| Sistem geçişi: muscular açıldı → 9 model yüklendi ve çizildi | 1.778 ms |

## Etkileşim sırasında kare süreleri

`engine.runOrbitBenchmark(5.000)` (5,0 sn): kamera hedef çevresinde 360° döner, her animasyon karesi çizilir.

| Sahne | Model | Kare | FPS | p50 kare (ms) | p95 kare (ms) | En uzun (ms) | Çizim çağrısı | Üçgen |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| skeletal | 7 | 46 | 8,9 | 116,6 | 180,0 | 250,1 | 47 | 149.156 |
| skeletal + muscular | 9 | 14 | 2,5 | 466,7 | 516,6 | 516,6 | 147 | 672.188 |

## Bellek

| Durum | JS yığını (kullanılan / ayrılan) | Geometri | Doku |
| --- | --- | --- | --- |
| Varsayılan modeller yüklendikten sonra | 34,6 MB / 55,6 MB | 47 | 1 |
| muscular açıldıktan ve ölçümden sonra | 27,4 MB / 94,1 MB | 184 | 1 |

GPU belleği tarayıcıdan okunamadığı için ölçülmedi.

### Kısa kararlılık denetimi

muscular sistemi üç kez kapatılıp yeniden açıldı (modeller boşaltılıp yeniden yüklendi). Geometri sayısının
sabit kalması, boşaltılan GPU kaynaklarının temizlendiğini gösterir. Bu, saatler süren kullanımın yerine geçmez.

| Döngü | Geometri | JS yığını |
| --- | --- | --- |
| 1 | 184 | 34,7 MB |
| 2 | 184 | 45,3 MB |
| 3 | 184 | 34,1 MB |

## İndirme boyutları

Resource Timing'e göre aktarılan (sıkıştırılmış) ve açılmış boyutlar; ilk ziyaret, önbellek boş.

| Tür | Dosya | Aktarılan | Açılmış |
| --- | --- | --- | --- |
| HTML belgesi | 1 | 1,2 kB | 0,9 kB |
| JavaScript | 6 | 321,4 kB | 1.148,4 kB |
| CSS | 1 | 2,3 kB | 6,2 kB |
| İçerik verisi (data/*.json) | 12 | 415,4 kB | 8.861,2 kB |
| 3B modeller (GLB) | 43 | 8.609,2 kB | 25.472,1 kB |
| **Toplam** | 63 | **9.349,4 kB** | 35.488,8 kB |

<details>
<summary>Dosya başına</summary>

| Dosya | Tür | Aktarılan | Açılmış | Süre |
| --- | --- | --- | --- | --- |
| `/` | belge | 1,2 kB | 0,9 kB | 109 ms |
| `/assets/three-DEG8szKu.js` | js | 180,5 kB | 708,8 kB | 56 ms |
| `/assets/react-Dy-GIXkn.js` | js | 66,3 kB | 213,7 kB | 37 ms |
| `/assets/vendor-Cg9C1mOW.js` | js | 33,4 kB | 115,8 kB | 37 ms |
| `/assets/index-BHMMFjz-.js` | js | 23,9 kB | 67,9 kB | 37 ms |
| `/assets/ViewerCanvas-D32GK4GY.js` | js | 16,4 kB | 41,5 kB | 13 ms |
| `/assets/rolldown-runtime-CbXtAM7H.js` | js | 0,9 kB | 0,6 kB | 15 ms |
| `/assets/index-kzHKDUlZ.css` | css | 2,3 kB | 6,2 kB | 26 ms |
| `/data/assets.json` | veri | 216,2 kB | 1.747,0 kB | 102 ms |
| `/data/structures.json` | veri | 173,1 kB | 3.388,8 kB | 100 ms |
| `/data/relations.json` | veri | 11,9 kB | 163,8 kB | 37 ms |
| `/data/scope.json` | veri | 3,8 kB | 43,4 kB | 63 ms |
| `/data/sources.json` | veri | 3,6 kB | 9,1 kB | 34 ms |
| `/data/lessons.json` | veri | 2,8 kB | 9,1 kB | 50 ms |
| `/data/taxonomy.json` | veri | 2,0 kB | 4,8 kB | 35 ms |
| `/data/manifest.json` | veri | 0,9 kB | 1,0 kB | 35 ms |
| `/data/questions.json` | veri | 0,3 kB | 0,0 kB | 49 ms |
| `/data/reviews.json` | veri | 0,3 kB | 0,0 kB | 52 ms |
| `/data/assets.json` | veri | 0,3 kB | 1.747,0 kB | 12 ms |
| `/data/assets.json` | veri | 0,3 kB | 1.747,0 kB | 8 ms |
| `/models/bp3d/skeletal.head.glb` | model | 1.164,1 kB | 1.163,8 kB | 42 ms |
| `/models/bp3d/skeletal.thorax.glb` | model | 770,8 kB | 770,6 kB | 39 ms |
| `/models/bp3d/muscular.other.glb` | model | 761,1 kB | 760,8 kB | 51 ms |
| `/models/bp3d/muscular.neck.glb` | model | 754,3 kB | 754,0 kB | 51 ms |
| `/models/bp3d/muscular.lower_limb.glb` | model | 750,6 kB | 750,3 kB | 51 ms |
| `/models/bp3d/muscular.back.glb` | model | 714,4 kB | 714,1 kB | 47 ms |
| `/models/bp3d/muscular.thorax.glb` | model | 679,5 kB | 679,2 kB | 54 ms |
| `/models/bp3d/muscular.upper_limb.glb` | model | 645,0 kB | 644,7 kB | 67 ms |
| `/models/bp3d/muscular.abdomen.glb` | model | 641,7 kB | 641,4 kB | 24 ms |
| `/models/bp3d/muscular.head.glb` | model | 594,1 kB | 593,8 kB | 44 ms |
| `/models/bp3d/skeletal.lower_limb.glb` | model | 372,5 kB | 372,2 kB | 22 ms |
| `/models/bp3d/skeletal.upper_limb.glb` | model | 344,4 kB | 344,1 kB | 38 ms |
| `/models/bp3d/skeletal.abdomen.glb` | model | 172,7 kB | 172,4 kB | 18 ms |
| `/models/bp3d/skeletal.neck.glb` | model | 130,1 kB | 129,8 kB | 16 ms |
| `/models/bp3d/muscular.pelvis_perineum.glb` | model | 87,2 kB | 86,9 kB | 34 ms |
| `/models/bp3d/skeletal.back.glb` | model | 18,8 kB | 18,5 kB | 15 ms |
| `/models/bp3d/muscular.abdomen.glb` | model | 0,3 kB | 641,4 kB | 15 ms |
| `/models/bp3d/muscular.back.glb` | model | 0,3 kB | 714,1 kB | 23 ms |
| `/models/bp3d/muscular.head.glb` | model | 0,3 kB | 593,8 kB | 31 ms |
| `/models/bp3d/muscular.lower_limb.glb` | model | 0,3 kB | 750,3 kB | 34 ms |
| `/models/bp3d/muscular.neck.glb` | model | 0,3 kB | 754,0 kB | 36 ms |
| `/models/bp3d/muscular.other.glb` | model | 0,3 kB | 760,8 kB | 39 ms |
| `/models/bp3d/muscular.pelvis_perineum.glb` | model | 0,3 kB | 86,9 kB | 19 ms |
| `/models/bp3d/muscular.thorax.glb` | model | 0,3 kB | 679,2 kB | 25 ms |
| `/models/bp3d/muscular.upper_limb.glb` | model | 0,3 kB | 644,7 kB | 28 ms |
| `/models/bp3d/muscular.abdomen.glb` | model | 0,3 kB | 641,4 kB | 13 ms |
| `/models/bp3d/muscular.back.glb` | model | 0,3 kB | 714,1 kB | 42 ms |
| `/models/bp3d/muscular.head.glb` | model | 0,3 kB | 593,8 kB | 41 ms |
| `/models/bp3d/muscular.lower_limb.glb` | model | 0,3 kB | 750,3 kB | 42 ms |
| `/models/bp3d/muscular.neck.glb` | model | 0,3 kB | 754,0 kB | 42 ms |
| `/models/bp3d/muscular.other.glb` | model | 0,3 kB | 760,8 kB | 42 ms |
| `/models/bp3d/muscular.pelvis_perineum.glb` | model | 0,3 kB | 86,9 kB | 37 ms |
| `/models/bp3d/muscular.thorax.glb` | model | 0,3 kB | 679,2 kB | 42 ms |
| `/models/bp3d/muscular.upper_limb.glb` | model | 0,3 kB | 644,7 kB | 42 ms |
| `/models/bp3d/muscular.abdomen.glb` | model | 0,3 kB | 641,4 kB | 23 ms |
| `/models/bp3d/muscular.back.glb` | model | 0,3 kB | 714,1 kB | 24 ms |
| `/models/bp3d/muscular.head.glb` | model | 0,3 kB | 593,8 kB | 23 ms |
| `/models/bp3d/muscular.lower_limb.glb` | model | 0,3 kB | 750,3 kB | 23 ms |
| `/models/bp3d/muscular.neck.glb` | model | 0,3 kB | 754,0 kB | 23 ms |
| `/models/bp3d/muscular.other.glb` | model | 0,3 kB | 760,8 kB | 23 ms |
| `/models/bp3d/muscular.pelvis_perineum.glb` | model | 0,3 kB | 86,9 kB | 19 ms |
| `/models/bp3d/muscular.thorax.glb` | model | 0,3 kB | 679,2 kB | 22 ms |
| `/models/bp3d/muscular.upper_limb.glb` | model | 0,3 kB | 644,7 kB | 22 ms |

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
