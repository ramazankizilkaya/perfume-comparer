# Aura Compare — Derinlemesine Teknik Mimari ve Çalışma Mekanizması

Bu dosya, backend, frontend, veri tabanı ve kazıyıcı boru hattının (scraper pipeline) tüm detaylarını içeren kapsamlı mimari referans belgesidir.

---

## 1. Veri Tabanı Mimarisi (PostgreSQL: `perfume_comparer`)

Veri tabanı ilişkiseldir ve veriler `scripts/import_data.py` tarafından `COPY` komutlarıyla diske yazılır.

### Ana Tablolar ve İlişkiler:
- **`brands`**: Marka bilgileri (`id`, `name`, `slug`, `country`, `bio`, `logo_path`, `perfume_count`, `website`, `parent_company`).
- **`perfumes`**: Parfüm kartı (`id`, `brand_id` [FK], `name`, `slug`, `gender`, `concentration`, `fragrance_family`, `release_year`, `description`, `image_path`, `avg_rating`, `rating_count`, `user_avg_rating`, `user_rating_count`, `longevity`, `sillage`, `seasons`, `gender_voting`, `price_voting`, `article`, `faq`).
- **`notes` & `perfume_notes`**: Notalar tablo olarak tutulur (`~1300` nota). Ara tabloda katman (`layer`: `Top`, `Middle`, `Base` veya piramitsizler için `All`) saklanır.
- **`accords` & `perfume_accords`**: Koku akorları (`~100` akor). Ara tabloda `width` (baskınlık yüzdesi) tutulur.
- **`perfume_alternatives`**: Muadil ve benzer kokular tablosu (`perfume_id`, `alt_perfume_id` veya metin referansı, `kind`: `reminds` veya `also_likes`).
- **`blogs` & `blog_posts`**: SEO ve rehber yazıları.
- **`comments` & `perfume_ratings`**: Kullanıcı yorumları, oyları ve fotoğraf yüklemeleri.

---

## 2. Backend Mimarisi (.NET 9 + EF Core)

Layered architecture (SoC) kesin olarak uygulanır:
- **`Controllers/`**: Çok incedir. Yalnızca HTTP isteklerini karşılar, model validation yapar ve Service çağırır. Controller içinde asla doğrudan DbContext / EF sorgusu yazılmaz.
- **`Business/Services/`**: İş mantığı, DTO dönüşümleri, filtreleme algoritmaları bu katmandadır.
  - `PerfumeService`: Parfüm detay, arama, filtreleme ve özetleme.
  - `CompareService`: İki veya daha fazla parfümün yan yana koku piramidi, akor farkı, kalıcılık ve silaj karşılaştırma mantığı.
  - `CompareAiService`: İki parfümün teknik piramidi ve verilerini OpenAI (fallback: Gemini) ile profesyonel Türkçe karşılaştırma analizine dönüştürür; sonucu PostgreSQL `comparison_comments` tablosunda `is_ai_summary = true` olarak önbelleğe alır. Tekrarlayan istekler doğrudan veritabanından 0 ms gecikmeyle döner.
  - `BrandService`: Marka listeleme ve marka içi popülerlik.
  - `SearchService`: Çok kriterli (akor, nota, cinsiyet, fiyat, marka) arama motoru.
- **`Data/`**: `ApplicationDbContext`, `Repository<T>`, `UnitOfWork`.
- **`Data/SeedService.cs`**: Yalnızca test kullanıcıları, bloglar ve yorumları seed eder; kataloğa dokunmaz.
- **Medya Sunumu**: `Program.cs` içinde `UseStaticFiles` ile `scrape_files/` klasörü doğrudan `/media/...` altında static olarak sunulur.

### Güvenlik ve Başlık Kuralları (`Program.cs`):
- **`X-Requested-With: XMLHttpRequest` Zorunluluğu**:
  Backend güvenlik ara yazılımı, tüm `POST`, `PUT`, `DELETE` isteklerinde (antiforgery-token ve rate-limit-check hariç) `X-Requested-With: XMLHttpRequest` başlığını zorunlu tutar. Bu başlık bulunmadığında Kestrel anında `HTTP 400 Bad Request` yanıtı döner (`{"message":"Geçersiz veya eksik istemci başlığı..."}`). İstemcideki tüm `fetch` çağrılarında ve curl testlerinde bu başlık mutlaka yer almalıdır.
- **Rate Limiting & Antiforgery**:
  API isteklerinde ani yüklenmeleri sınırlayan IP bazlı rate limit ve durum değiştiren isteklerde antiforgery token doğrulaması devrededir.

---

## 3. Frontend Mimarisi (Next.js 15 App Router + React + TypeScript)

- **Tasarım İlkesi**: epey.com bilgi yoğunluğu. Geniş tablolar, spec-sheet kutuları, yoğun veriler, 0 serif font.
- **Çoklu Dil & Rota Yapısı (`/tr/` Prefix & Middleware)**:
  - `src/middleware.ts`: Dil öneki bulunmayan tüm rotaları (`/`, `/ara`, `/detayli-arama`, `/marka`, `/parfum/...`) `/tr/...` rotasına yönlendirir. `/ara` isteklerini kalıcı (301) olarak `/tr/detayli-arama` rotasına yönlendirir; `/detayli-arama` isteklerini ise App Router'daki `/ara` sayfasına dahili olarak rewrite eder.
  - Next.js rewrite mimarisi sayesinde mevcut App Router klasör hiyerarşisi bozulmadan `x-locale` başlığıyla dinamik servis sağlanır.
  - Rota üreticileri (`src/lib/urls.ts`): `perfumeHref`, `brandHref`, `compareHref` ve `localeHref` her zaman `/tr/` önekiyle URL üretir.
  - Sözlük Altyapısı: `src/lib/i18n.ts` üzerinden `src/lib/i18n/dictionaries/` altındaki `tr.json` ve `en.json` sözlüklerini yükler.
- **Sayfa Rotaları**:
  - `/tr` -> Anasayfa beslemesi (Blog hero, Keşfet, Popülerler, Karşılaştırmalar, Markalar).
  - `/tr/detayli-arama` (App Router dahili: `/ara`) -> Kapsamlı filtreleme, arama ve sıralama motoru. Breadcrumb sabit "Detaylı arama"dır.
  - `/tr/marka` & `/tr/marka/[slug]` -> Marka indeksi ve marka vitrini.
  - `/tr/parfum/[...segments]` -> Parfüm detay sayfası (Büyük şişe, notalar, akor barları, oylama dağılımları, satış noktaları).
  - `/tr/karsilastir` -> 2'li, 3'lü, 4'lü spec-sheet parfüm kıyaslama tablosu.
  - `/tr/blog` & `/tr/blog/[slug]` -> SEO rehber makaleleri.
  - `/tr/giris` -> Google ve Geliştirici girişi (mock dev-login).
- **State Yönetimi (`src/lib/stores.ts` & `clientStore.ts`)**:
  - `useGenderPref`: Erkek, Kadın, Unisex filtre tercihi (localStorage senkronize).
  - `useCompare`: Karşılaştırma sepetine eklenen parfümler (`compare-basket`).
  - `useFavorites`: Favorilere eklenen parfümler (`favorites`).
  - `useAuth`: JWT ve oturum durumu (`auth-session`). `signInDev` ve `signInGoogle` isteklerinde `X-Requested-With: XMLHttpRequest` başlığı gönderilir.
- **Görseller & Alt Etiketleri**: Her `<img>` etiketinde katı SEO kuralı geçerlidir (marka, ürün, amaç formatı).
- **İlk Yükleme ve Skeleton Mekanizması**:
  `HomeFeedClient.tsx` ilk açılışta sunucu verisini (SSR) doğrudan korur, sayfa açılışında kartların tekrar değişmesi (flicker) engellenmiştir. Cinsiyet filtresi değiştirildiğinde ise `.perfume-card-skeleton` shimmer animasyonu gösterilir.
- **Arama Sayfası Filtre ve URL Senkronizasyonu (`/tr/detayli-arama`)**:
  - Filtre seçimlerinde sayfa adresi `window.history.replaceState` üzerinden güncellenir; Next.js'in `:3000` portuna attığı dahili `_rsc` istekleri engellenerek tekil `:5026/api/perfumes` veri isteği sağlanır.
  - **Mobil Arama ve Filtre Deneyimi**:
    - **Yüzen Yapışkan Bar (Floating Sticky Bar)**: Mobilde sonuçlar kaydırılırken filtre ve sıralama araç çubuğu sayfa tepesinde (`top: 53px`) tek satır halinde yapışkan kalarak yüzer. "Filtreler" butonuna tıklandığında filtre grupları bu yüzen çubuğun hemen altından dropdown biçiminde açılır (`expand/collapse`) ve kapatıldığında tekrar tek satırlı yüzen bara döner.
    - **Tekil Arama ve Header Temizliği**: `/tr/detayli-arama` rotasında `Header.tsx` içerisindeki global `.header-search-strip` gizlenerek mükerrer arama kutusu engellenir ve dikey alan tasarrufu sağlanır. Arama kutularına `autoComplete="off"`, `autoCorrect="off"`, `autoCapitalize="none"`, `spellCheck={false}` eklenerek tarayıcının yerleşik koyu renkli otomatik doldurma kutusunun arama deneyimini kapatması engellenir.
    - **Sonuç Kartları**: Mobilde 2 sütunlu kompakt düzende ve optimize edilmiş görsel en-boy oranıyla listelenir.
  - **Filtre İçi Arama & Hafıza**: Marka, Nota ve Akor gruplarında yerel arama kutusu bulunur. Filtre grupları filtre seçiminden bağımsız olarak varsayılan kapalı gelir; yalnızca kullanıcının elle açıp kapattığı tercihler `localStorage` (`aura_filter_groups_open`) içinde saklanır.
  - **Sayfalama**: 48'den fazla sonuç olduğunda listenin altında "Daha Fazla Göster" butonu sonraki sayfaları dinamik olarak ekler.
  - **Top 100 Sıralama Mimarisi**: Sıralama seçeneklerinden biri seçildiğinde backend sonuçları `Take(100)` ile en iyi 100 parfümle sınırlar; "rating" sıralamasında tek oylu rastgele parfümleri engellemek için `RatingCount >= 10` eşiği uygulanır.
  - **Kullanıcı Filtreleri & Menü Mimarisi**:
    - Kullanıcı profil dropdown'ında `Favorilerim`, `Yorum Yazdıklarım`, `Puanladıklarım` ve `Yazılarım` (`/blog/yazilarim`) linkleri yer alır. Giriş yapmamış kullanıcılar için menüde `Favorilerim` ve `Giriş Yap` seçenekleri sunulur.
    - Detaylı arama sayfasında (`ara/page.tsx`), "Sıralama & Liste" bölümü altında `Favorilerim` herkes tarafından, `Yorum Yazdıklarım` ve `Puanladıklarım` ise yalnızca oturum açmış kullanıcılara gösterilir. Aktif filtre rozetleri tek tip `.active-filter-badge` stiliyle listelenir.
    - Backend tarafında `GET /api/perfumes` endpoint'i `userFilter` parametresi aldığında Authorization JWT'sinden gelen `userId` veya anonim `favSlugs` üzerinden veritabanında `Favorite`, `PerfumeComment` ve `Rating` tablolarını sorgulayarak ilgili kullanıcının kayıtlarını filtreler; ayrıca `POST /api/perfumes/{slug}/favorite` uç noktası üzerinden favori ekleme/çıkarma işlemi veritabanında kalıcı tutulur.
    - `POST /api/blogs` ve `GET /api/blogs/my` uç noktaları güvenlik gereği `X-Requested-With: XMLHttpRequest` başlığı ve JWT token ile doğrulanır; yazılar yazarın kullanıcı ID'siyle ilişkilendirilir.
  - **Genişletilmiş Blog, Görüntülenme Sayacı ve Zengin Metin Mimarisi**:
    - **Genişletilmiş Detay Düzeni (`/tr/blog/[slug]`)**: Dar kart görünümü yerine 1000px genişlikte modern, epey/editoryal bilgi portalı düzenine geçilmiştir. Makale başında okuma süresi ve görüntülenme sayısı (`ViewCount`) rozeti yer alır.
    - **Dinamik Görüntülenme Sayacı (`ViewCount`)**: `blog_posts` tablosuna `view_count` sütunu eklenmiştir. `GET /api/blogs/{slug}` her çağrıldığında bu sayaç PostgreSQL veritabanında asenkron olarak 1 artırılır; frontend ise önbellek bayatlamasını önlemek için `{ cache: "no-store" }` ile güncel sayıyı anlık gösterir.
    - **Zengin Metin Editörü ve Ayrı Sayfada Önizleme (`RichTextEditor`, `/blog/onizleme`)**: Makale yazma ekranında kalın, italik, H2/H3, liste, alıntı kutusu, tablo şablonu, bağlantı ve resim ekleme araç çubuğu sunulur. "Anlık Önizleme" sekmesi içeriği editör içinde render ederken; "Ayrı Sayfada Önizle" butonu taslağı `sessionStorage`'a kaydederek `/blog/onizleme` sayfasında canlı makale görünümünde ve uyarı şeridiyle (`TASLAK ÖNİZLEME`) gösterir.
    - **Makale Tohumlama (`scrape_files/articles/` & `seed_articles.json`)**: `scrape_files/articles/` altındaki 13 zengin prod makalesi (`Kokunun 6000 Yıllık Yolculuğu`, `Parfüm Lügatı`, `Muadil Parfüm Pazarı`, `Francis Kurkdjian`, `Drakkar Noir` vb.) formatlanarak `seed_articles.json` dosyasına dönüştürülmüş; eski örnek test kayıtları veritabanından tamamen silinmiştir. İlgili kapak görselleri WebP formatına çevrilerek hem backend `wwwroot/blog_backgrounds/` hem de frontend `public/blog_backgrounds/` altına yerleştirilmiştir.
    - **Anasayfa Blog Slider'ı**: Anasayfa hero slider'ında (`BlogSlider.tsx`) kullanıcılara her ziyarette `GET /api/blogs?random=true&take=5` uç noktası üzerinden rastgele 5 prod makalesi gösterilir (`displayBlogs.slice(0, 5)`). Slayt göstergeleri (dots ve `current / 5` sayacı) tam 5 makaleye kilitlidir.

---

## 4. Satış Noktaları ve Mağaza Logoları Mimarisi (`PerfumeWhereToBuySection.tsx`)

- **Görsel Standartları**:
  `shopping_brand_images/` klasöründeki orijinal marka imajları doğrudan `public/stores/` altında sunulur. Logolar yapay renkli kutular veya aşırı küçülten tuval dolgularıyla bozulmaz; 88x88px (mobilde 74x74px) kare kart içinde doğal ve okunabilir boyutta ortalanır.
- **Muadil Satıcı Linkleme Kuralı**:
  Muadil açık parfüm satıcıları (Bargello, MAD, Loris, Muscent, D&P, David Walker, Emre Geldi, Tutaste) arama parametresi (`?q=...`) desteklemediğinden veya 404 hatası verdiğinden doğrudan resmi anasayfalarına yönlendirilir:
  - D&P Perfumum: `https://dpperfumum.com.tr/`
  - David Walker: `https://www.e-davidwalker.com/`
  - Emre Geldi: `https://www.emregeldiparfums.com/`
  - Tutaste: `https://www.ozelparfum.com/`
  - Diğer muadiller: `https://muscent.com/`, `https://www.madparfum.com/`, `https://www.bargello.com.tr/`, `https://www.lorisparfum.com/`.
- **Yetkili Satıcı ve Pazaryeri Linkleri**:
  Beymen, Sephora, Boyner, Sevil, Trendyol, Hepsiburada, N11, Çiçeksepeti, PttAVM, Akakçe ve Cimri ilgili parfüm için arama sorgulu dinamik linkleri kullanır.

---

## 5. Scraper ve Anti-Blocking Mimarisi (`scripts/scrape_perfumes.py`)

Fragrantica IP engeli koyduğunda HTTP 400 döner. Scraper 3 ardışık hata gördüğünde şu eskalasyon basamaklarını işletir:
1. **Tier 1 (NordVPN Rotation)**: `nordvpn://connect` deeplinki tetiklenerek sistem VPN IP'si yenilenir.
2. **Tier 2 (SOCKS5 Proxy Relay)**: VPN yetersiz kalırsa `NordSocksRelay` (lokal unauthenticated SOCKS5 -> Nord authenticated proxy) üzerinden IP değiştirir.
3. **Tier 3 (Cooldown)**: 20s -> 60s artan bekleme süresi uygular.
4. **Zenginleştirme Ayrımı**: Veri kazıma (`scrape_perfumes.py`) esnasında yapay zeka servisine bağlanılmaz; yapay zeka zenginleştirmesi bağımsız çalışan `scripts/enrich_perfumes.py` üzerinden 4 saniyelik güvenli kota aralığıyla yürütülür.
