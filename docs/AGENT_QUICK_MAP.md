# Aura Compare — Hızlı Mimari ve Sistem Haritası (Ön Bilgi Özeti)

Bu dosya, yapay zeka ajanlarının (LLM/Agent) projeyi saniyeler içinde kavraması için hazırlanmış hızlı referans indeksidir.

---

## 1. Projenin Amacı ve Özeti
- **Aura Compare:** Fragrantica TR verileri üzerine kurulu, epey.com tarzı bilgi yoğunluklu (tabular, sans-serif, veri odaklı) bir parfüm karşılaştırma ve inceleme portalıdır.
- **Veri Kaynağı:** Kesinlikle sahte/mock katalog verisi yoktur. Tüm markalar ve parfümler `scripts/scrape_perfumes.py` ile `scrape_files/` altına çekilir ve `scripts/import_data.py` ile PostgreSQL'e aktarılır.

---

## 2. Dizin ve Katman Haritası

```
perfume-comparer/
├── src/
│   ├── PerfumeComparer/              # .NET 9 Web API (:5026)
│   │   ├── Controllers/             # İnce REST controller'lar (Catalog, Search, Compare, Blog, Auth, Admin, Sitemap)
│   │   ├── Business/Services/       # İş mantığı (SearchService, PerfumeService, BrandService, AuthService vb.)
│   │   ├── Data/                    # EF Core DbContext, Repository, UnitOfWork, SeedService
│   │   └── Domain/Entities/         # Veri modelleri (Perfume, Brand, Note, Accord, Comment vb.)
│   │
│   └── perfume-comparer-web/        # Next.js 15 (App Router, TypeScript, React) (:3000)
│       ├── src/proxy.ts             # Çoklu dil (/tr/ prefix) rewrite & kalıcı 308 redirect katmanı (Next 16'da middleware'in yeni adı)
│       ├── src/lib/seo.ts           # SEO yardımcıları: SITE_URL, pageMetadata() (title/canonical/OG/Twitter), absoluteUrl, jsonLd
│       ├── src/app/                 # Sayfa rotaları (/tr, /tr/detayli-arama [dahili: /ara], /tr/marka, /tr/parfum, /tr/karsilastir, /tr/blog, /tr/blog/yazilarim, /tr/giris)
│       ├── src/components/          # Tekrar kullanılabilir UI bileşenleri (epey.com tasarım dili)
│       ├── src/lib/                 # API istemcisi, i18n, URL yardımcıları, clientStore, auth ve tercih state'leri
│       └── public/stores/           # Pazaryeri & satıcı orijinal logoları
│
├── scripts/
│   ├── scrape_perfumes.py           # Fragrantica TR kazıyıcı (anti-blocking: VPN rotasyonu + SOCKS5)
│   ├── scrape_brands.py             # Marka URL listelerini çeken script
│   ├── enrich_perfumes.py           # Gemini / OpenAI ile SEO makalesi, FAQ ve açıklama zenginleştirici
│   ├── import_data.py               # scrape_files/ -> PostgreSQL COPY ile hızlı veri aktarımı
│   ├── normalize_store_logos.py     # Mağaza logolarını tuvale normalize eden görsel aracı
│   └── validate_perfumes.js         # Joi şema doğrulayıcı
│
├── scrape_files/
│   ├── brands/                      # Marka listesi JSON'ları
│   └── perfumes/<brand>/            # <perfume>.json + images/<perfume>.webp + report.txt
│
└── docs/
    ├── AGENT_QUICK_MAP.md           # [BU DOSYA] Hızlı sistem haritası
    └── AGENT_DEEP_ARCHITECTURE.md   # Derinlemesine teknik mimari dokümantasyonu
```

---

## 3. Çalıştırma Komutları
- **Tek Komutla Başlatma:** `./start.sh` (Backend `:5026` + Frontend `:3000`)
- **Backend:** `cd src/PerfumeComparer && dotnet run --launch-profile http`
- **Frontend:** `cd src/perfume-comparer-web && npm run dev`
- **Veri Yükleme:** `python3 scripts/import_data.py --reset` (kataloğu temizler ve yükler)
- **Zenginleştirme:** `python3 scripts/enrich_perfumes.py <marka> --delay 4.0`
- **Doğrulama:** `node scripts/validate_perfumes.js <marka>`
- **Testler:** `cd tests/api-test && npm test`
- **Frontend Derleme:** `cd src/perfume-comparer-web && npm run build`

---

## 4. Temel Tasarım ve Mimari Kuralları
1. **epey.com Referansı:** Sans-serif, yoğun bilgi, tablolar, spec-sheet kartları. Magazin tarzı dekoratif boşluk veya devasa görsel blokları yasaktır.
2. **Renk Kontrastı:** Tüm renkler CSS token (`--page`, `--surface`, `--ink`, `--ink-soft`, `--line`, `--accent`) üzerinden yürür. Hard-coded renk yasaktır.
3. **Çoklu Dil Rotaları:** Asıl (canonical) adres biçimi `/tr/...` halidir (`/tr`, `/tr/detayli-arama`, `/tr/parfum/...`). Ön eksiz adresler ve `/ara` kalıcı (308) olarak `/tr/...` adresine yönlenir; `/en/...` henüz çeviri olmadığı için 404 döner. İç linkler, canonical, JSON-LD ve sitemap adresleri sadece `src/lib/urls.ts` (`localeHref`, `perfumeHref`, `brandHref`, `blogHref`, `searchHref`) ile üretilir; elle `/ara`, `/blog` gibi ön eksiz link yazılmaz.
4. **Backend Güvenliği (`X-Requested-With` & Rate Limiting):** Tüm `POST`, `PUT`, `DELETE` isteklerinde `X-Requested-With: XMLHttpRequest` başlığı zorunludur. IP bazlı rate limit dakikada 300 istek ile devrededir; statik medya ve görseller (`/media`, `/blog_backgrounds`, `/health`, `/openapi`) bu sınırlamadan tamamen muaftır.
5. **Mağaza Logoları:** `public/stores/` altındaki orijinal marka imajları kullanılır; yapay kutu veya küçültmelerle bozulmaz.
6. **Responsive & SEO:** Mobil (375px), Tablet (768px), Desktop (1440px) ve Light/Dark mode tam uyumludur. Her görselde SEO alt etiketi zorunludur. Her herkese açık sayfa metadata'sını `pageMetadata()` ile verir (kökte canonical yoktur; sayfa başlıklarına " | Aura Compare" yazılmaz, şablon ekler). Olmayan parfüm/marka/blog `notFound()` ile gerçek 404, API hatası 500 döner. `/sitemap.xml` tüm parfüm, marka ve blog adreslerini `GET /api/sitemap` üzerinden üretir. Marka sayfasında SSR numaralı sayfalama (`?sayfa=N`) ve `<BrandPagination />` bulunur (`?sayfa=1` ve `?sayfa=02` gibi standart dışı yazımlar 308 ile yönlenir). Blog yazıları `isomorphic-dompurify` ile XSS'e karşı temizlenir ve dış linkler (host adına göre belirlenir) `rel="nofollow ugc noopener"` alır; `class`/`style` öznitelikleri temizlenir. Canlı dağıtımda `DEPLOY_ENV=production` build kontrolüyle domain doğrulanır.
7. **Mimari Senkronizasyon Kuralı:** Her mimari, rota, güvenlik veya tasarım değişikliğinde bu dosya ve `AGENT_DEEP_ARCHITECTURE.md` derhal güncellenir.
8. **Arama & Sıralama (Top 100):** Mobilde 2 sütunlu kompakt kartlar, sonuçlar kaydırılırken sayfa tepesinde yapışkan tek satır olarak yüzen (floating sticky) filtre barı, açılır-kapanır (expand/collapse) filtre dropdown paneli, "Daha Fazla Göster" sayfalama ve sıralamalarda Top 100 listeleme mantığı geçerlidir.
9. **Yapay Zekâ Karşılaştırma Analizi:** Karşılaştırma sayfasında iki parfüm kıyaslandığında `GET /api/compare/{p1Slug}-vs-{p2Slug}/ai-analysis` üzerinden koku profili, performans ve editör tavsiyesi üretilir. Üretilen analiz PostgreSQL `comparison_comments` tablosuna `is_ai_summary = true` olarak kaydedilir; tekrarlayan istekler doğrudan veritabanından döner.
10. **Soru ve Onay Önceliği Kuralı (Genel Kural):** Kullanıcı bir soru sorduğunda veya bir durumu danıştığında hiçbir kod değişikliği yapılmadan doğrudan cevap verilir; yalnızca kullanıcıdan açıkça onay alındıktan sonra kod değişikliği uygulanır.
11. **Kullanıcı Filtreleri & Menü:** Kullanıcı menüsünde (avatar dropdown) 'Favorilerim', 'Yorum Yazdıklarım' ve 'Puanladıklarım' bağlantıları yer alır (`/tr/detayli-arama?userFilter=favorites|comments|ratings`). Detaylı arama sayfasında bu filtreler yalnızca oturum açmış kullanıcılara gösterilir; `GET /api/perfumes?userFilter=...` ve `POST /api/perfumes/{slug}/favorite` üzerinden kullanıcının kendi favori, yorum veya puan kayıtlarıyla filtreleme yapılır.
12. **Genişletilmiş Blog & Zengin Metin Sistemi:** `/blog/[slug]` makale detay sayfası geniş, ferah ve zengin tipografi (`max-width: 1000px`) ile yeniden tasarlandı. Makale üstünde görüntülenme sayısı (`ViewCount`) yer alır ve her ziyarette veritabanında artırılır (`GET /api/blogs/{slug}`). Makale yazarları için markdown destekli `RichTextEditor` (kalın, italik, H2/H3, listeler, alıntı, tablo, link, anlık önizleme) ve canlı görünümü ayrı sekmede/sayfada gösteren `/blog/onizleme` sayfası bulunur. `scrape_files/articles/` altındaki makaleler WebP kapak görselleriyle birlikte PostgreSQL'e tohumlanır (`seed_articles.json`); anasayfa hero slider'ında ise her ziyarette rastgele 5 makale gösterilir (`GET /api/blogs?random=true&take=5`).
13. **Parfüm Değerlendirme, Toast Sistemi & Karşılaştırma Tercihi:** Bir kullanıcı bir parfümü yalnızca bir kez değerlendirebilir (`POST /api/perfumes/{slug}/review` 1-5 puan zorunlu tutar; tekrar değerlendirme girişiminde 400 Bad Request döner). Kullanıcının değerlendirme durumu `GET /api/perfumes/{slug}/my-evaluation` ile sorgulanır ve frontend'de 'Değerlendirildi' pasif butonu gösterilir. Değerlendirme ve yorum kaydedildiğinde global `<ToastContainer />` üzerinden bildirim çıkar. Karşılaştırma sayfasında tercih butonlarında ve yorum etiketlerinde parfüm adı marka adıyla birlikte (`{Marka} {Parfüm}`) gösterilir.
14. **PWA (Progressive Web App) Desteği:** `src/app/manifest.ts` üzerinden dinamik manifest (`/manifest.webmanifest`), `public/sw.js` üzerinden servis işçisi (service worker) ve çevrimdışı önbellekleme, `src/components/PwaRegister.tsx` üzerinden istemci kaydı ve `src/app/layout.tsx` üzerinden iOS Safari (`appleWebApp`) ve Android tema rengi meta etiketleri yapılandırılmıştır.
15. **Marka Amblemi ve Logo:** Sitenin logosu ve favicon/PWA ikonları `parfumetre.com` amblem görseli ile güncellenmiş; `<Header />` ve `<Footer />` bileşenlerinde `Parfüm*etre*` başlığı ve logo görseli entegre edilmiştir.
16. **Playwright & Cucumber UI Test Mimarisi (`tests/ui-tests`):** `ptr-qa-internal-mobile-ui-tests` mimarisine tam uyumlu; `locators.yaml` seçici haritası, `commonFunctions.js`, `store.js` durum yönetimi ve `Scenario Outline` ile her senaryo hem Desktop (1440x900) hem Mobile (375x812) olarak çift cihazda koşar. Sayfalardaki tüm buton/input etkileşimleri test edilir ve işlemler taze tarayıcı örneği (`LaunchNewBrowserAndNavigateToStoredUrl`) üzerinden UI'dan doğrulanır.
17. **Çoklu Cinsiyet Tercihi (Checkbox):** Header'daki cinsiyet tercihi açılır menüsü checkbox destekli çoklu seçime dönüştürülmüş (örn. erkek ve unisex birlikte seçilebilir); parfüm detayındaki mükerrer 100'lük puan rozeti kaldırılarak yalnızca 5'lik yıldız değerlendirmesi bırakılmıştır.
18. **Son Gezdiklerim Slider'ı & Kart Butonları:** Parfüm detay sayfaları ziyaret edildiğinde incelenen ürün `<RecordRecentPerfume />` bileşeni üzerinden `recent-perfumes` localStorage anahtarına kaydedilir (son 20 ürün). Anasayfanın en altına `<HorizontalSlider title="Son Gezdiklerim">` slider'ı eklenmiştir. Kart aksiyon butonlarındaki (favori/karşılaştır) CSS hover çakışması native `title` özniteliğine dönüştürülerek çözülmüştür; kart rozetleri ise orijinal sol (konsantrasyon, koku ailesi) ve sağ (puan) yapısına geri döndürülmüştür.

Daha fazla derin teknik detay (DB tabloları, endpoint imzaları, proxy çalışma mekanizması) için [AGENT_DEEP_ARCHITECTURE.md](file:///Users/ramazankizilkaya/Documents/wip/perfume-comparer/docs/AGENT_DEEP_ARCHITECTURE.md) dosyasına bakın.

