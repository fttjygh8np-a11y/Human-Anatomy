# Anatomi 3B

Tıp öğrencileri için Türkçe arayüzlü, kaynak temelli, etkileşimli 3B insan anatomisi öğrenme
uygulaması. Tarayıcıda çalışır; sunucu gerektirmez (statik site).

> **Durum:** Uygulama çalışır durumdadır ancak içerik **uzman incelemesinden geçmemiştir**
> (0 onaylı yapı). Adlar ve açıklamalar kaynaklıdır, fakat "doğrulanmadı" durumundadır. Neyin
> tamamlandığı, neyin eksik olduğu ve neyin doğrulama beklediği [docs/durum.md](docs/durum.md)
> belgesinde yazılıdır.

## Özellikler (özet)

- BodyParts3D tabanlı tüm vücut modeli (2246 yapıda anatomik 3B model). Ayrıca ayrı bir görünüm
  olarak HRA kadın üreme organları modeli.
- Seçim, çoklu seçim, gizleme, izolasyon, saydamlık, sistem katmanları, geri al/yinele.
- Sanal diseksiyon (adım adım kaldırma), sagittal/koronal/aksiyal yüzey kırpma kesiti.
- Türkçe/Latince/İngilizce adlarla arama ve yapı ağacı. Bilgi kartında kaynak ve inceleme
  durumu gösterilir.
- Kısa sınav, aralıklı tekrar, rehberli dersler, notlar, favoriler, kayıtlı görünümler,
  karşılaştırma ve hata bildirimi.
- Kullanıcı verileri yalnızca tarayıcıda (IndexedDB) saklanır; dışa aktarılabilir, içe
  aktarılabilir ve silinebilir.
- Klavye ile kullanım, metin modu (3B olmadan), tema, yazı boyutu ve hareketi azaltma seçenekleri.

## Gereksinimler

- **Node.js 24** (`package.json` `engines`). Node 22.18 ve üzeri de TypeScript betiklerini
  çalıştırır; bu depo Node 22.22 ile de test edildi.
- npm 10+
- Model indirmek için internet erişimi (ilk kurulumda yaklaşık 140 MB).
- E2E testleri için Chromium (Playwright).

Vekil sunucu (proxy) arkasındaysanız Node'un `fetch` işlevinin vekili kullanması için
betikleri `NODE_USE_ENV_PROXY=1` ile çalıştırın:

```sh
NODE_USE_ENV_PROXY=1 npm run setup
```

## Kurulum ve çalıştırma

```sh
npm ci
npm run setup      # modelleri indirir ve derler, içeriği derler
npm run dev        # http://localhost:5173
```

`npm run setup` şu adımları sırayla çalıştırır:

1. `models:fetch`: BodyParts3D 4.0 arşivini (137 MB) `vendor/bodyparts3d/` altına indirir,
   boyut ve sha256 değerlerini `vendor/bodyparts3d/manifest.json` dosyasına kaydeder.
2. `models:build`: OBJ parçalarından sistem başına sıkıştırılmış GLB dosyalarını
   `public/models/bp3d/` altına üretir (yaklaşık 44 MB).
3. `models:hra`: HRA kadın üreme organları GLB'lerini indirip dönüştürür.
4. `content:build`: `content/` klasörünü doğrular ve `public/data/*.json` paketini yazar.

Modeller indirilmeden de uygulama açılır; bu durumda 3B görünüm "Model yüklenemedi" duyurusu
verir, metin modu ve arama çalışmaya devam eder.

## Komutlar

| Komut | Görev |
|---|---|
| `npm run dev` | Geliştirme sunucusu (önce `content:build`) |
| `npm run build` | İçerik + tür denetimi + üretim derlemesi (`dist/`) |
| `npm run preview` | `dist/` klasörünü yerelde sunar |
| `npm run typecheck` / `npm run lint` | TypeScript ve ESLint denetimi |
| `npm test` | Birim testleri (Vitest) |
| `npm run test:e2e` | Uçtan uca ve erişilebilirlik testleri (Playwright + axe) |
| `npm run perf` | Performans ölçümü → `docs/raporlar/performans.md` |
| `npm run content:validate` | İçeriği yazmadan doğrular (`-- --strict` uyarıları da hata sayar) |
| `npm run content:build` | İçeriği derler → `public/data/` |
| `npm run content:inventory` | BodyParts3D öğe listesinden yapı envanteri taslaklarını üretir |
| `npm run content:terms` | TA2 (Latince) ve TDK/Wikidata (Türkçe) ad adaylarını çeker |
| `npm run content:relations` | Wikidata'dan anatomik ilişkileri çeker |
| `npm run report:coverage` | Kapsam raporu → `docs/raporlar/kapsam.md` |
| `npm run report:inventory` | Sistem × bölge envanter raporu → `docs/raporlar/envanter.md` |

## Testler

```sh
npm run typecheck && npm run lint && npm test
npm run build && npm run test:e2e
```

E2E testleri `/opt/pw-browsers/chromium` veya `CHROMIUM_PATH` ortam değişkeniyle verilen
Chromium'u kullanır. `E2E_SKIP_BUILD=1` hazır `dist/` klasörünü yeniden derlemeden test eder.
Sonuçlar: [docs/raporlar/test.md](docs/raporlar/test.md).

## Dağıtım

Derleme çıktısı (`dist/`) herhangi bir statik barındırma hizmetinde yayımlanabilir.

- **GitHub Pages:** `.github/workflows/pages.yml` modelleri indirir, derler ve yayımlar. Depo
  ayarlarında Pages kaynağı olarak "GitHub Actions" seçilmelidir.
- **Alt dizinde yayın:** Uygulama kök dizinde değilse `VITE_BASE` ortam değişkenini verin, ör.
  `VITE_BASE=/Human-Anatomy/ npm run build`.
- **Önbellek:** `public/models/*.glb` ve `public/data/*.json` dosyaları büyüktür; sunucuda
  sıkıştırma (gzip/brotli) ve uzun süreli önbellek önerilir. İçerik sürümü
  `public/data/manifest.json` içindedir.
- `.github/workflows/ci.yml` her gönderimde tür denetimi, lint, birim testleri, içerik doğrulaması
  ve derlemeyi çalıştırır.

## Belgeler

| Belge | İçerik |
|---|---|
| [docs/gereksinimler.md](docs/gereksinimler.md) | Ürün gereksinimleri |
| [docs/durum.md](docs/durum.md) | Tamamlanan, eksik ve doğrulama bekleyen işler |
| [docs/mimari.md](docs/mimari.md) | Mimari ve veri modeli |
| [docs/icerik-rehberi.md](docs/icerik-rehberi.md) | Yeni yapı, model, ders ve soru ekleme |
| [docs/uzman-inceleme.md](docs/uzman-inceleme.md) | Uzman inceleme süreci |
| [docs/model-katalogu.md](docs/model-katalogu.md) | Model dosyaları, kaynakları ve lisansları |
| [docs/kaynakca.md](docs/kaynakca.md) | Anatomik içerik kaynakçası |
| [docs/raporlar/](docs/raporlar/) | Kapsam, envanter, test ve performans raporları |

## Lisanslar

- 3B modeller: BodyParts3D (DBCLS) ve HRA (HuBMAP), **CC BY 4.0**. Atıflar uygulamada ve
  [docs/model-katalogu.md](docs/model-katalogu.md) belgesinde yer alır.
- Açıklama metinleri OpenStax *Anatomy and Physiology 2e* kaynağından kendi sözcüklerimizle
  yazılmış özetlerdir. Kaynak **CC BY-NC-SA 4.0** lisanslıdır; ticari kullanım öncesinde hukuki
  değerlendirme gerekir.
- Wikidata verileri CC0'dır. TA2 ve TDK adları tekil terim olarak atıfla kullanılır; bu
  kaynakların lisans koşulları doğrulanmadı (bkz. [docs/kaynakca.md](docs/kaynakca.md)).
- Yazı tipi: Inter (`@fontsource-variable/inter`), **SIL Open Font License 1.1**; uygulamayla
  birlikte yerel olarak sunulur.
- Uygulama kaynak kodunun lisansı henüz belirlenmedi.
