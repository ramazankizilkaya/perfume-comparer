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
│   │   ├── Controllers/             # İnce REST controller'lar (Catalog, Search, Compare, Blog, Auth, Admin)
│   │   ├── Business/Services/       # İş mantığı (SearchService, PerfumeService, BrandService, AuthService vb.)
│   │   ├── Data/                    # EF Core DbContext, Repository, UnitOfWork, SeedService
│   │   └── Domain/Entities/         # Veri modelleri (Perfume, Brand, Note, Accord, Comment vb.)
│   │
│   └── perfume-comparer-web/        # Next.js 15 (App Router, TypeScript, React) (:3000)
│       ├── src/middleware.ts        # Çoklu dil (/tr/ prefix) rewrite & 307 redirect ara katmanı
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
3. **Çoklu Dil Rotaları:** Rotalar `/tr/` öneki taşır (`/tr`, `/tr/detayli-arama`, `/tr/parfum/...`). `/ara` istekleri `/tr/detayli-arama` rotasına yönlendirilir.
4. **Backend Güvenliği (`X-Requested-With`):** Tüm `POST`, `PUT`, `DELETE` isteklerinde `X-Requested-With: XMLHttpRequest` başlığı zorunludur. Eksikse 400 döner.
5. **Mağaza Logoları:** `public/stores/` altındaki orijinal marka imajları kullanılır; yapay kutu veya küçültmelerle bozulmaz.
6. **Responsive & SEO:** Mobil (375px), Tablet (768px), Desktop (1440px) ve Light/Dark mode tam uyumludur. Her görselde SEO alt etiketi zorunludur.
7. **Mimari Senkronizasyon Kuralı:** Her mimari, rota, güvenlik veya tasarım değişikliğinde bu dosya ve `AGENT_DEEP_ARCHITECTURE.md` derhal güncellenir.
8. **Arama & Sıralama (Top 100):** Mobilde 2 sütunlu kompakt kartlar, sonuçlar kaydırılırken sayfa tepesinde yapışkan tek satır olarak yüzen (floating sticky) filtre barı, açılır-kapanır (expand/collapse) filtre dropdown paneli, "Daha Fazla Göster" sayfalama ve sıralamalarda Top 100 listeleme mantığı geçerlidir.
9. **Yapay Zekâ Karşılaştırma Analizi:** Karşılaştırma sayfasında iki parfüm kıyaslandığında `GET /api/compare/{p1Slug}-vs-{p2Slug}/ai-analysis` üzerinden koku profili, performans ve editör tavsiyesi üretilir. Üretilen analiz PostgreSQL `comparison_comments` tablosuna `is_ai_summary = true` olarak kaydedilir; tekrarlayan istekler doğrudan veritabanından döner.
10. **Doğrudan Uygulama Kuralı (Kullanıcı Kuralı):** Bir istek veya düzeltmede teknik engel, yan etki veya konuşulması gereken açık bir husus yoksa tekrar "uygulayayım mı?" diye sormadan doğrudan uygulanır, test edilir ve raporlanır.
11. **Kullanıcı Filtreleri & Menü:** Kullanıcı menüsünde (avatar dropdown) 'Favorilerim', 'Yorum Yazdıklarım' ve 'Puanladıklarım' bağlantıları yer alır (`/tr/detayli-arama?userFilter=favorites|comments|ratings`). Detaylı arama sayfasında bu filtreler yalnızca oturum açmış kullanıcılara gösterilir; `GET /api/perfumes?userFilter=...` ve `POST /api/perfumes/{slug}/favorite` üzerinden kullanıcının kendi favori, yorum veya puan kayıtlarıyla filtreleme yapılır.

Daha fazla derin teknik detay (DB tabloları, endpoint imzaları, proxy çalışma mekanizması) için [AGENT_DEEP_ARCHITECTURE.md](file:///Users/ramazankizilkaya/Documents/wip/perfume-comparer/docs/AGENT_DEEP_ARCHITECTURE.md) dosyasına bakın.
