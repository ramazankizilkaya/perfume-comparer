# Parfümetre (Aura Compare) — Hızlı Mimari ve Sistem Haritası (Ön Bilgi Özeti)

Bu dosya, yapay zeka ajanlarının (LLM/Agent) projeyi saniyeler içinde kavraması için hazırlanmış hızlı referans indeksidir.

---

## 1. Projenin Amacı ve Özeti
- **Aura Compare:** Fragrantica TR verileri üzerine kurulu, epey.com tarzı bilgi yoğunluklu (tabular, sans-serif, veri odaklı) bir parfüm karşılaştırma ve inceleme portalıdır.
- **Veri Kaynağı:** Kesinlikle sahte/mock katalog verisi yoktur. Tüm markalar ve parfümler `scripts/scrape_perfumes.py` ile `scrape_files/` altına çekilir ve `scripts/import_data.py` ile PostgreSQL'e aktarılır.
- **Esans Tipi:** Fragrantica esans tipini vermez; tek kural `scripts/concentration.py` içindedir: parfüm adından okunur, adda yoksa boş kalır ve adreste konsantrasyon parçası olmaz (`/tr/parfum/erkek/dior/dior-sauvage`). Asla "Edp" gibi varsayılan yazılmaz; `enrich_perfumes.py` de AI tahmini yazmaz.

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
│       ├── src/app/                 # Sayfa rotaları (/tr, /tr/detayli-arama [dahili: /ara], /tr/marka, /tr/parfum, /tr/karsilastir, /tr/blog, /tr/blog/yazilarim, /tr/gizlilik-politikasi; giriş sayfa değil `LoginModal` penceresidir)
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
    ├── AGENT_DEEP_ARCHITECTURE.md   # Derinlemesine teknik mimari dokümantasyonu
    └── AI_API_USAGE.md              # AI servisleri ve fallback matrisi rehberi
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
2. **Renk Kontrastı:** Tüm renkler CSS token (`--page`, `--surface`, `--ink`, `--ink-soft`, `--line`, `--accent`, `--accent-contrast`, `--logo-paper`, `--header-h`) üzerinden yürür. Hard-coded renk yasaktır. Karanlık mod sınıfı ilk boyamadan önce `layout.tsx` içindeki satır içi script ile eklenir. Marka/parfüm adları CSS ile büyük harfe çevrilmez (Türkçe `i` → `İ` sorunu). Anasayfa blog şeridi 190-200px'tir; otomatik geçiş hover/odak/azaltılmış hareket durumunda durur ve elle gezinmeden sonra kalıcı durur.
3. **Çoklu Dil Rotaları:** Asıl (canonical) adres biçimi `/tr/...` halidir (`/tr`, `/tr/detayli-arama`, `/tr/parfum/...`). Ön eksiz adresler ve `/ara` kalıcı (308) olarak `/tr/...` adresine yönlenir; `/en/...` henüz çeviri olmadığı için 404 döner. İç linkler, canonical, JSON-LD ve sitemap adresleri sadece `src/lib/urls.ts` (`localeHref`, `perfumeHref`, `brandHref`, `blogHref`, `searchHref`) ile üretilir; elle `/ara`, `/blog` gibi ön eksiz link yazılmaz.
4. **Backend Güvenliği (`X-Requested-With`, Rate Limiting, Admin, Üretim Doğrulaması):** Tüm `POST`, `PUT`, `DELETE` isteklerinde `X-Requested-With: XMLHttpRequest` başlığı zorunludur. IP bazlı rate limit dakikada 300 istek ile devrededir (IP, `UseForwardedHeaders` sonrası gerçek ziyaretçi IP'sidir; `X-Internal-Key` = `Api:InternalKey` taşıyan Next.js sunucu istekleri muaftır); statik medya ve görseller (`/media`, `/blog_backgrounds`, `/health`, `/openapi`) bu sınırlamadan tamamen muaftır. `/api/admin/*` Admin rolü ister (401/403; rol `Auth:AdminEmails` ya da Development'ta dev-login `admin:true`). Ücretli AI uçları yeni model çağrısı için giriş ya da IP başına 10 sn'de 5 sınırı uygular (`AiRequestGate`); önbellekteki sonuçlar herkese serbesttir. Development dışında `Auth:Secret` (≥32 bayt, varsayılan değil), `Google:ClientId`, `Api:InternalKey` ve `Cors:AllowedOrigins` yoksa API açılmaz (Facebook `Facebook:AppId`+`AppSecret` isteğe bağlıdır: `POST /api/auth/facebook`, ayarsızsa 401); `DevCors`, dev-login ve OpenAPI yalnızca Development'tadır, canlıda `Cors:AllowedOrigins` kullanılır. `/media` yalnızca görsel uzantılarını sunar (JSON/txt 404), tüm yanıtlar `nosniff` taşır, fotoğraf yükleme sadece JPEG/PNG/WebP'yi (magic bytes) kabul eder ve kullanıcı fotoğrafları `Media:UserPhotosRoot` (repo dışı, gitignored) klasörüne yazılır. `EnsureSchemaAsync` her ortamda açılışta çalışır.
5. **Mağaza Logoları:** `public/stores/` altındaki orijinal marka imajları kullanılır; yapay kutu veya küçültmelerle bozulmaz.
6. **Responsive & SEO:** Mobil (375px), Tablet (768px), Desktop (1440px) ve Light/Dark mode tam uyumludur. Her görselde SEO alt etiketi zorunludur. Site adı **Parfümetre** (`SITE_NAME`), varsayılan adres `https://parfumetre.com`; "Aura Compare" kullanıcıya görünen hiçbir yerde kullanılmaz. Her herkese açık sayfa metadata'sını `pageMetadata()` ile verir (kökte canonical yoktur; sayfa başlıklarına " | Parfümetre" yazılmaz, şablon ekler). Olmayan parfüm/marka/blog `notFound()` ile gerçek 404, API hatası 500 döner; API 429 verirse `error.tsx` "çok yoğunuz" durumunu gösterir. Sunucu tarafı API çağrıları `lib/api.ts` `apiFetch()` ile yapılır (`X-Internal-Key` ekler). `/tr/detayli-arama` sunucuda render edilir (H1 + ilk 48 sonuç); tek akor/nota/cinsiyet/aile adresleri indekslenir, `q`/sıralama/çoklu filtre adresleri `noindex, follow` alır (kurallar `lib/searchParams.ts`). Karşılaştırma başlığı marka adlarıyla "A vs B karşılaştırması", canonical sıralı slug'lardır. `/sitemap.xml` elle yazılmış route'tur (`app/sitemap.xml/route.ts`): API hatasında 5xx, 45.000 adres üstünde sitemap index. `robots.txt` admin, giriş, önizleme, yazılarım ve `/api/` yollarını engeller. Marka sayfasında SSR numaralı sayfalama (`?sayfa=N`) ve `<BrandPagination />` bulunur (`?sayfa=1` ve `?sayfa=02` gibi standart dışı yazımlar 308 ile yönlenir). Blog yazıları `isomorphic-dompurify` ile XSS'e karşı temizlenir ve dış linkler (host adına göre belirlenir) `rel="nofollow ugc noopener"` alır; `class`/`style` öznitelikleri temizlenir. Üretim build'i (`NODE_ENV=production`, `DEPLOY_ENV` `local` değilken) `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_BASE` (https, localhost değil), `API_INTERNAL_KEY` ve `NEXT_PUBLIC_GOOGLE_CLIENT_ID` yoksa DURUR; yerel deneme build'i için `.env` içine `DEPLOY_ENV=local` yazılır.
7. **Mimari Senkronizasyon Kuralı:** Her mimari, rota, güvenlik veya tasarım değişikliğinde bu dosya ve `AGENT_DEEP_ARCHITECTURE.md` derhal güncellenir.
8. **Arama & Sıralama (Top 100):** Mobilde 2 sütunlu kompakt kartlar, sonuçlar kaydırılırken sayfa tepesinde yapışkan tek satır olarak yüzen (floating sticky) filtre barı, açılır-kapanır (expand/collapse) filtre dropdown paneli, "Daha Fazla Göster" sayfalama ve sıralamalarda Top 100 listeleme mantığı geçerlidir.
9. **Yapay Zekâ Karşılaştırma Analizi:** Karşılaştırma sayfasında iki parfüm kıyaslandığında `GET /api/compare/{p1Slug}-vs-{p2Slug}/ai-analysis` üzerinden koku profili, performans ve editör tavsiyesi üretilir. Üretilen analiz PostgreSQL `comparison_comments` tablosuna `is_ai_summary = true`, `ai_kind = 1` olarak kaydedilir (`AiSummaryJob` yorum özetleri `ai_kind = 0`; ikisi birbirini ezmez); tekrarlayan istekler doğrudan veritabanından döner.
10. **Soru ve Onay Önceliği Kuralı (Genel Kural):** Kullanıcı bir soru sorduğunda veya bir durumu danıştığında hiçbir kod değişikliği yapılmadan doğrudan cevap verilir; yalnızca kullanıcıdan açıkça onay alındıktan sonra kod değişikliği uygulanır.
11. **Kullanıcı Filtreleri & Menü:** Kullanıcı menüsünde (avatar dropdown) 'Favorilerim', 'Yorum Yazdıklarım' ve 'Puanladıklarım' bağlantıları yer alır (`/tr/detayli-arama?userFilter=favorites|comments|ratings`). Detaylı arama sayfasında bu filtreler yalnızca oturum açmış kullanıcılara gösterilir; `GET /api/perfumes?userFilter=...` ve `POST /api/perfumes/{slug}/favorite` üzerinden kullanıcının kendi favori, yorum veya puan kayıtlarıyla filtreleme yapılır.
12. **Genişletilmiş Blog & Zengin Metin Sistemi:** `/blog/[slug]` makale detay sayfası geniş, ferah ve zengin tipografi (`max-width: 1000px`) ile yeniden tasarlandı. Makale üstünde görüntülenme sayısı (`ViewCount`) yer alır ve her ziyarette veritabanında artırılır (`GET /api/blogs/{slug}`). Seed'deki tüm yazıların yazarı tek editör hesabıdır ("Parfümetre Editör", `editor@parfumetre.com`); `POST /api/blogs` giriş ister ve onay/ret admin uçlarıyla (`/api/blogs/pending`, `/api/blogs/{id}/approve|reject`) yapılır. Makale yazarları için markdown destekli `RichTextEditor` (kalın, italik, H2/H3, listeler, alıntı, tablo, link, anlık önizleme) ve canlı görünümü ayrı sekmede/sayfada gösteren `/blog/onizleme` sayfası bulunur. `scrape_files/articles/` altındaki makaleler WebP kapak görselleriyle birlikte PostgreSQL'e tohumlanır (`seed_articles.json`); anasayfa hero slider'ında ise her ziyarette rastgele 5 makale gösterilir (`GET /api/blogs?random=true&take=5`).
13. **Parfüm Değerlendirme, Toast Sistemi & Karşılaştırma Tercihi:** Bir kullanıcı bir parfümü yalnızca bir kez değerlendirebilir (`POST /api/perfumes/{slug}/review` 1-5 puan zorunlu tutar; tekrar değerlendirme girişiminde 400 Bad Request döner). Yorum gövdesi en fazla 4000 karakterdir (400), yorumda yaygın küfür/argo varsa kayıt yapılmadan 400 döner (`ICommentContentFilter`: parfüm yorumu, değerlendirme yorumu ve karşılaştırma yorumu), değerlendirme tek `SaveChanges` ile yazılır, eşzamanlı çift istek 409 döner. Oturumlu istekler `authFetch()` ile yapılır (401'de oturum silinir ve girişe yönlenir); süresi dolmuş token çıkış sayılır. Parfüm görüntülenmesi tarayıcıdan `POST /api/perfumes/{slug}/view` ile IP başına bir kez sayılır. Kullanıcının değerlendirme durumu `GET /api/perfumes/{slug}/my-evaluation` ile sorgulanır ve frontend'de 'Değerlendirildi' pasif butonu gösterilir. Değerlendirme ve yorum kaydedildiğinde global `<ToastContainer />` üzerinden bildirim çıkar. Karşılaştırma sayfasında yorum etiketlerinde parfüm adı marka adıyla birlikte (`{Marka} {Parfüm}`) gösterilir. Tercih oyu yorum formundan ayrılmıştır: 2 parfüm karşılaştırılırken görsel satırının altındaki "Tercihiniz" satırından, giriş ve yorum olmadan verilir (`GET|POST /api/compare/{a}-vs-{b}/votes`, tablo `comparison_votes`, seçmen: kullanıcı id'si ya da tarayıcı kimliği `X-Voter-Id`, çift başına tek oy, POST IP başına 5/10 sn). Karşılaştırma sayfasının altında `recent-perfumes` listesinden "Son gezdikleriniz" bölümü çıkar.
14. **Manifest & Mobil Meta (servis işçisi YOK):** `src/app/manifest.ts` üzerinden dinamik manifest (`/manifest.webmanifest`) ve `src/app/layout.tsx` üzerinden iOS Safari (`appleWebApp`) ve Android tema rengi meta etiketleri yapılandırılmıştır. `public/sw.js` ve `PwaRegister.tsx` kaldırıldı; çevrimdışı önbellekleme yoktur.
15. **Marka Amblemi ve Logo:** Sitenin logosu (`public/logo.png` açık tema, `public/logo-dark.png` koyu tema; ikisi de 800x189 şeffaf PNG), favicon (`public/favicon.ico` ve `src/app/favicon.ico`) ve PWA/ana ekran ikonları (`icon-192.png`, `icon-512.png`, `apple-touch-icon.png`) Parfümetre marka sayfasından üretilmiştir; `<Header />` ve `<Footer />` aynı iki logo dosyasını kullanır. Menü genişlik daraldıkça sondan başlayarak hamburgere taşınır: ≥915px hepsi başlıkta, 850-914px sıkışık (Anasayfa ikonu gizli), 769-849px Markalar ve Rehber hamburgerde, 768px ve altında (telefon) başlıkta yalnızca hamburger düğmesi kalır. Logo 769px ve üstünde 42px yüksektir; telefonda kalan tüm genişliği kullanır. Hamburger menü sayfanın üstünde yüzen karttır (sayfayı itmez, dışına tıklayınca veya Esc ile kapanır); telefonda Anasayfa, cinsiyet tercihi (`MobileGenderOptions`), tema ve hesap seçenekleri (`MobileAccount`) menünün içindedir. Eşikler `globals.css` içinde hesaplanmıştır; menüye bağlantı eklenirse yeniden hesaplanmalıdır.
16. **Playwright & Cucumber UI Test Mimarisi (`tests/ui-tests`):** `ptr-qa-internal-mobile-ui-tests` mimarisine tam uyumlu; `locators.yaml` seçici haritası, `commonFunctions.js`, `store.js` durum yönetimi ve `Scenario Outline` ile her senaryo hem Desktop (1440x900) hem Mobile (375x812) olarak çift cihazda koşar. Sayfalardaki tüm buton/input etkileşimleri test edilir ve işlemler taze tarayıcı örneği (`LaunchNewBrowserAndNavigateToStoredUrl`) üzerinden UI'dan doğrulanır.
17. **Çoklu Cinsiyet Tercihi (Checkbox):** Header'daki cinsiyet tercihi açılır menüsü checkbox destekli çoklu seçime dönüştürülmüş (örn. erkek ve unisex birlikte seçilebilir; "Hepsi" düğmesi yoktur, çoklu seçimde simgeler yan yana küçük gösterilir); parfüm detayındaki mükerrer 100'lük puan rozeti kaldırılarak yalnızca 5'lik yıldız değerlendirmesi bırakılmıştır.
18. **Son Gezdiklerim Slider'ı & Kart Butonları:** Parfüm detay sayfaları ziyaret edildiğinde incelenen ürün `<RecordRecentPerfume />` bileşeni üzerinden `recent-perfumes` localStorage anahtarına kaydedilir (son 20 ürün). Anasayfanın en altına `<HorizontalSlider title="Son Gezdiklerim">` slider'ı eklenmiştir. Kart aksiyon butonlarındaki (favori/karşılaştır) CSS hover çakışması native `title` özniteliğine dönüştürülerek çözülmüştür; kart rozetleri ise orijinal sol (konsantrasyon, koku ailesi) ve sağ (puan) yapısına geri döndürülmüştür.
19. **Yapay Zekâ Parfüm Danışmanı ("Bana Parfüm Öner") & Giriş Penceresi (`LoginModal`, `openLogin()`):** Header'da (hem masaüstü hem mobil menüde) yer alan buton ile açılan interaktif danışmanlık modalı (`<PerfumeAdvisorModal />`). Yalnızca giriş yapmış kullanıcılar faydalanabilir ve günde 1 kez öneri alabilir (`user_perfume_recommendations` tablosu, 24 saatlik kota ve kullanıcı bazlı eşzamanlılık kilidi). Kullanıcıdan cinsiyet, sevdiği parfümler, sevmediği notalar, ortam, mevsim ve serbest metin alınır (metin uzunluk sınırları denetlenir: `FreeText` ≤ 1000, diğerleri ≤ 300, aşımı 400); veritabanımızdan aday parfümler sevilen notalara göre puanlanıp sevilmeyen notalar elenerek filtrelenir ve Gemini AI baş parfümör personasıyla (`IPerfumeAdvisorService`, `POST /api/perfume-advisor/recommend`) veritabanındaki gerçek bir parfümü seçerek 2-3 paragraflık kişiselleştirilmiş tavsiye mektubu üretir. Durum `GET /api/perfume-advisor/status` ile sorgulanır. Sitedeki tüm giriş istekleri (`PerfumeAdvisorModal`, `PerfumeReviewModal`, `LoginPrompt`, `PerfumeCommentsSection`, `UserMenu`, `authFetch` 401) sayfadan ayrılmadan `lib/loginModal.ts` içindeki `openLogin()` ile `LoginModal` penceresini açar; giriş bitince altta açık modal/form kaldığı yerden devam eder.
20. **Ortak Sır ve Ortam Değişkenleri Yönetimi (Tekil `.env` Modeli):** Tüm Frontend, Backend (.NET `Program.cs`), Python kazıma/zenginleştirme (`scripts/app_settings.py`) ve Node.js (`rephrase_descriptions.js`) scriptleri AI anahtarları (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY`), proxy/VPN kimlikleri (`NORD_SERVICE_USER`, `NORD_SERVICE_PASS`) ve sistem ayarlarını depo kökündeki tek bir `.env` dosyasından otomatik yükler.

Daha fazla derin teknik detay (DB tabloları, endpoint imzaları, proxy çalışma mekanizması) için [AGENT_DEEP_ARCHITECTURE.md](file:///Users/ramazankizilkaya/Documents/wip/perfume-comparer/docs/AGENT_DEEP_ARCHITECTURE.md) dosyasına bakın.

