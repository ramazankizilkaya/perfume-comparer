# Parfüm Bilgi ve Karşılaştırma Platformu — Yol Haritası

Bu doküman, TR pazarına yönelik parfüm bilgi ve karşılaştırma uygulamasının ürün isterlerini, eksik kalan teknik detayları ve fazlara bölünmüş yol haritasını içerir.

---

## 1. Ürün Özeti

Kullanıcılar Google'da bir parfüm aradığında sitemizin ilgili parfüm sayfası arama sonuçlarında çıkar. Kullanıcı bu sayfada parfümün tüm bilgilerini, kullanıcı yorumlarını, muadillerini ve güncel fiyat linklerini görür. Site tamamen organik trafiğe dayalı çalışır. Bu nedenle SEO, projenin en kritik bileşenidir.

Hedef kitle: TR pazarındaki parfüm meraklıları, muadil (dupe) arayanlar ve fiyat karşılaştırması yapanlar.

---

## 2. Fonksiyonel İsterler ve Teknik Detayları

### 2.1 Parfüm Detay Sayfası

Orijinal isterlere ek teknik detaylar:

| İster | Teknik Detay |
|---|---|
| Görsel | WebP formatında, birden fazla boyutta (thumbnail, kart, detay) sunulur. CDN üzerinden servis edilir. `alt` metni SEO için parfüm adını içerir. |
| Temel bilgiler | Ad, marka, tip (EDT/EDP/EDC/Extrait/Roll-on), cinsiyet, çıkış yılı, notalar (üst/orta/alt olarak üçe ayrılmış), mevsim uygunluğu, yaş grubu uygunluğu. Tümü yapılandırılmış veri olarak DB'de tutulur. |
| Breadcrumb | `Anasayfa > Erkek > EDP > Marka > Model` yapısında olur. Her seviye gerçek bir `<a>` linkidir. Hover'da açılan dropdown, JS ile sonradan yüklenir ama linkler HTML'de crawl edilebilir kalır. `BreadcrumbList` schema.org markup'ı eklenir. |
| Yorum ve puanlama | Google OAuth ile giriş yapan kullanıcılar yorum yazar ve 1-5 (veya 1-10) puan verir. Yorumlar spam filtresinden geçer. İlk yorumlar admin onayıyla, güvenilir kullanıcıların yorumları otomatik yayınlanır. |
| Muadil linkleri | Muadil ilişkisi DB'de parfümden parfüme (self-referencing) many-to-many olarak tutulur. Benzerlik skoru ve kaynak bilgisi de saklanır. Muadil sayfaları ayrıca kendi SEO landing sayfaları olur ("X parfümünün muadilleri"). |
| Fiyat linkleri | Fiyatlar affiliate feed'lerden veya scraper'dan gelir. Her fiyat kaydında mağaza, boyut (ml), fiyat, stok durumu ve son kontrol tarihi bulunur. Linkler affiliate parametreli olur ve `rel="sponsored nofollow"` taşır. |
| Favorilere ekle | Giriş yapmış kullanıcı için DB'ye yazılır. Giriş yapmamış kullanıcı için buton, login akışını tetikler. |
| Karşılaştırma listesi | Giriş gerektirmez. Liste localStorage'da tutulur. Karşılaştırma sayfası 2-4 parfümü yan yana tablo olarak gösterir. Giriş yapmış kullanıcıda liste hesaba senkronize edilir. |
| AI yorum özeti | Bir arka plan işi (batch job), yorumları LLM'e (ör. Claude Haiku) gönderir ve yapılandırılmış özet üretir: en beğenilen notalar, kalıcılık algısı, fark edilirlik, öne çıkan şikayetler. Özet her N yeni yorumda bir yeniden üretilir. Yorum sayısı azken özet gösterilmez. |
| Fiyat düşünce haber ver | Kullanıcı e-posta ile abone olur. Günlük fiyat güncellemesi sonrası fiyatı düşen ürünler için e-posta kuyruğa atılır. Abonelikten çıkma linki zorunludur (KVKK + spam mevzuatı). |

### 2.2 Filtreleme (Anasayfa)

- Filtreler: cinsiyet, marka, tip, çıkış yılı, notalar, mevsim, yaş grubu, puan aralığı, fiyat aralığı.
- Filtre sonuç sayfaları URL'e yansır: `/parfumler?cinsiyet=erkek&tip=edp&nota=oud`. Böylece paylaşılabilir ve geri tuşuyla çalışır.
- **SEO için kritik:** En çok aranan filtre kombinasyonları statik URL'li kategori sayfalarına dönüştürülür: `/erkek-parfumleri`, `/erkek-edp-parfumleri`, `/oud-notali-parfumler`. Bu sayfalar kendi title, description ve açıklama metnine sahip olur. Uzun kuyruk aramaların çoğu bu sayfalardan gelir. Sonsuz filtre kombinasyonlarının index şişkinliği yaratmaması için sadece seçili kombinasyonlar index'e açılır, gerisi `noindex` olur.
- Filtreleme sonuçları sayfalanır (pagination). `rel="canonical"` kuralları tanımlanır.

### 2.3 Arama

- Arama kutusu anlık öneri (autocomplete) gösterir: parfüm adı, marka ve nota bazlı eşleşme.
- Yazım hatası toleransı (fuzzy matching) zorunludur. "Sovage", "Dior Savage" gibi hatalı yazımlar doğru sonuca gitmelidir.
- Teknoloji kararı:
  - **Faz 1:** PostgreSQL full-text search + `pg_trgm` (trigram) extension. 5-10 bin ürünlük katalog için fazlasıyla yeterlidir ve ek altyapı gerektirmez.
  - **Faz 2 (gerekirse):** Meilisearch veya Typesense. Kurulumu kolaydır, typo toleransı mükemmeldir. Elasticsearch bu ölçek için gereksizdir.

### 2.4 Blog

- SEO amaçlı editoryal içerik: "2026'nın en iyi erkek parfümleri", "X muadili parfümler" gibi yazılar.
- Kullanıcı yazıları: taslak olarak girilir, admin onayından sonra yayınlanır. Basit bir zengin metin editörü (ör. TipTap) yeterlidir.
- Her yazının kendi slug'ı, meta bilgileri ve `Article` schema markup'ı olur.
- Blog yazılarından ürün sayfalarına iç link verilir. Bu, SEO'nun önemli bir parçasıdır.

### 2.5 Çoklu Dil Altyapısı

- Site sadece Türkçe açılır ama altyapı baştan çoklu dile hazır kurulur.
- UI metinleri: `.resx` kaynak dosyaları (veya frontend'de i18n JSON).
- İçerik metinleri (parfüm açıklaması, kategori açıklaması): DB'de translation tablolarında `culture` kolonu ile tutulur.
- URL yapısı: Türkçe varsayılan dilde prefix'siz kalır (`/parfum/...`). Yeni dil eklendiğinde `/en/perfume/...` yapısı ve `hreflang` etiketleri devreye girer.
- Slug'lar dile özgü tutulur (translation tablosunda saklanır).

---

## 3. Teknoloji Seçimi

### 3.1 Blazor ve SEO Gerçeği

Kısa cevap: **Blazor, .NET 8 ve sonrasındaki "Static SSR" modu ile SEO açısından sorunsuzdur.** Ancak koşulları vardır.

- **Blazor Server / WebAssembly (eski interaktif modlar):** SEO için risklidir. İçerik JS/SignalR ile yüklenir. Bunları herkese açık içerik sayfalarında kullanma.
- **Blazor Static SSR (.NET 8+):** Sayfa sunucuda tam HTML olarak render edilir. Googlebot klasik bir HTML sayfası görür. SEO açısından Next.js SSR'dan farkı yoktur.
- Doğru mimari: Tüm içerik sayfaları (parfüm detay, kategori, blog) Static SSR olur. İnteraktif parçalar (arama autocomplete, filtre paneli, karşılaştırma butonu) "interactive island" olarak eklenir veya küçük vanilla JS ile çözülür.

### 3.2 Karar

İki geçerli seçenek vardır:

| | Seçenek A: Blazor (Static SSR) | Seçenek B: Next.js + .NET API |
|---|---|---|
| Artı | Tek dil, tek repo, tek deploy. Mevcut .NET bilgisi doğrudan kullanılır. Geliştirme hızı yüksek. | SEO tooling ekosistemi çok güçlü (next-sitemap, image optimization, ISR). İş ilanı/topluluk desteği geniş. |
| Eksi | SEO tooling'ini (sitemap, og image, structured data) elle yazmak gerekir. Interactive island disiplini şart. | İki ayrı codebase, iki deploy, context switch maliyeti. |

**Öneri:** Seçenek A (Blazor Static SSR). Tek kişilik/küçük ekip için tek stack'in hız avantajı, Next.js'in tooling avantajından daha değerlidir. Sitemap ve structured data üretimi .NET'te birer günlük iştir. Tek kural: herkese açık hiçbir sayfa client-side render'a bırakılmaz.

### 3.3 Teknoloji Yığını

- **Backend + Frontend:** .NET 9, Blazor Static SSR + minimal interactive islands
- **DB:** PostgreSQL 16+ (`pg_trgm`, `unaccent` extension'ları ile)
- **ORM:** EF Core (karmaşık filtre sorguları için gerekirse Dapper)
- **Background jobs:** Hangfire (fiyat güncelleme, AI özet, e-posta kuyruğu, sitemap yenileme)
- **Auth:** ASP.NET Identity + Google OAuth (external login)
- **Cache:** İlk fazda in-memory + output caching; büyüyünce Redis
- **E-posta:** Amazon SES veya Resend (fiyat alarmı ve bildirimler)
- **Görsel depolama:** S3 uyumlu depolama (Cloudflare R2 ucuz ve çıkış trafiği bedava)
- **CDN + WAF:** Cloudflare (ücretsiz plan başlangıç için yeterli)
- **Hosting:** Hetzner VPS + Docker Compose (aylık ~10-20 €) veya Azure App Service
- **Monitoring:** Sentry (hata takibi) + Uptime Kuma + Google Search Console

---

## 4. Veritabanı Şeması

Normalize edilmiş çekirdek şema:

```
brand
  id, name, slug, country, description, logo_url

concentration            -- EDT, EDP, EDC, Extrait, Roll-on...
  id, name, slug

perfume
  id, brand_id (FK), name, slug, gender (enum: erkek/kadın/unisex),
  concentration_id (FK), release_year, description,
  avg_rating (denormalize, trigger/job ile güncellenir),
  rating_count, image_path, is_published, created_at, updated_at

note                     -- bergamot, oud, vanilya...
  id, name, slug, category (odunsu/çiçeksi/baharatlı...)

perfume_note
  perfume_id (FK), note_id (FK), layer (enum: üst/orta/alt), PK(perfume_id, note_id, layer)

season / perfume_season          -- N:N, uygunluk skoru (0-100) kolonu opsiyonel
age_group / perfume_age_group    -- N:N

perfume_equivalent       -- muadil ilişkisi, self-referencing N:N
  perfume_id (FK), equivalent_perfume_id (FK), similarity_score, source, note

app_user
  id, email, display_name, google_subject_id, avatar_url, role, created_at

rating
  user_id (FK), perfume_id (FK), score, UNIQUE(user_id, perfume_id)

comment
  id, perfume_id (FK), user_id (FK), body, status (pending/approved/rejected), created_at

review_summary           -- AI özeti
  perfume_id (PK/FK), summary_json (jsonb), comment_count_at_generation, generated_at

favorite
  user_id (FK), perfume_id (FK), created_at, PK(user_id, perfume_id)

retailer                 -- Trendyol, Hepsiburada, Sephora TR, Gratis...
  id, name, slug, base_url, affiliate_network, logo_url

price_offer              -- güncel fiyatlar
  id, perfume_id (FK), retailer_id (FK), size_ml, price, currency,
  product_url, affiliate_url, in_stock, last_checked_at

price_history            -- fiyat alarmı ve grafik için
  id, price_offer_id (FK), price, recorded_at

price_alert
  id, user_id (FK), perfume_id (FK), created_at, is_active, last_notified_at

blog_post
  id, author_user_id (FK), title, slug, body, excerpt, cover_image,
  status (draft/pending/published/rejected), published_at, created_at

-- Çoklu dil için translation tabloları
perfume_translation (perfume_id, culture, description, slug)
category_translation, blog_post_translation (benzer yapı)
```

İndeksleme notları:
- `perfume.slug`, `brand.slug` üzerinde unique index.
- Filtre sorguları için `perfume(gender, concentration_id, release_year)` composite index.
- Arama için `perfume.name` ve `brand.name` üzerinde `gin_trgm_ops` index.
- `price_offer(perfume_id, retailer_id, size_ml)` unique index.

---

## 5. SEO Planı

SEO bu projenin can damarıdır. Plan dört başlıkta toplanır.

### 5.1 Teknik SEO

- Tüm içerik sayfaları sunucuda render edilir (Static SSR).
- URL yapısı: `/parfum/{marka-slug}/{model-slug}`, `/marka/{marka-slug}`, `/erkek-parfumleri` vb. Kısa, Türkçe, tireli slug'lar.
- Sitemap index + alt sitemap'ler (parfümler, markalar, kategoriler, blog). Hangfire job'ı ile günlük yenilenir ve Search Console'a bildirilir.
- `robots.txt`, canonical etiketleri, pagination kuralları.
- Structured data (JSON-LD): `Product` + `AggregateRating` + `Offer` (fiyatlar), `BreadcrumbList`, `Article` (blog), `FAQPage` (uygunsa). Bu markup'lar arama sonuçlarında yıldızlı ve fiyatlı zengin snippet çıkarır. Tıklama oranını ciddi artırır.
- Core Web Vitals: görsellerde lazy loading + `width/height` attribute, kritik CSS inline, JS minimum. Hedef: LCP < 2,5 sn, CLS < 0,1.
- OG ve Twitter card etiketleri. Parfüm sayfaları için otomatik üretilen OG görseli (görsel + ad + puan).

### 5.2 İçerik SEO'su

- **Programatik sayfalar:** Her parfüm sayfası bir landing page'dir. Sayfa başlığı şablonu: "{Marka} {Model} — Notaları, Kalıcılığı, Muadilleri ve Fiyatları". Her sayfada benzersiz, şablondan üretilmemiş görünen bir açıklama paragrafı bulunur. AI ile üretilip insan tarafından kontrol edilebilir.
- **Muadil sayfaları:** "X muadili" TR'de çok yüksek hacimli bir arama kalıbıdır. Her popüler parfüm için ayrı muadil sayfası açılır: `/parfum/{marka}/{model}/muadilleri`.
- **Kategori sayfaları:** Seçili filtre kombinasyonları için statik landing sayfaları (bkz. 2.2).
- **Blog:** Haftada 2-3 yazı hedeflenir. Anahtar kelime araştırması Google Keyword Planner + Search Console verisiyle yapılır.
- **İç linkleme:** Breadcrumb, muadil linkleri, "aynı markanın diğer parfümleri", "benzer notalı parfümler" blokları hem UX hem SEO için iç link ağını örer.

### 5.3 Otorite ve Ölçüm

- Search Console ve GA4 baştan kurulur.
- Backlink stratejisi: parfüm forumları, ekşi sözlük gibi mecralarda doğal görünürlük, kadın/erkek yaşam tarzı bloglarıyla içerik iş birliği.
- İlk 6 ay boyunca haftalık Search Console taraması: index kapsamı, ortalama pozisyon, tıklama oranı.

### 5.4 Beklenti Yönetimi

Yeni bir domain'in Google'da güven kazanması 6-12 ay sürer. İlk 3 ayda anlamlı trafik beklenmemelidir. Uzun kuyruk (az aranan, az rekabetli) sorgular önce gelir. "Dior Sauvage" gibi ana sorgular en son gelir.

---

## 6. UI / UX İlkeleri

- **Tarz:** İçerik odaklı, temiz, bol beyaz alanlı bir tasarım. Referanslar: Fragrantica'nın bilgi yoğunluğu + Akakçe/Cimri'nin fiyat karşılaştırma netliği + modern e-ticaret estetiği (Sephora, Notino).
- **Mobil öncelikli:** TR'de parfüm aramalarının büyük çoğunluğu mobilden gelir. Tasarım önce mobil için yapılır.
- Parfüm kartı: görsel, ad, marka, tip, puan yıldızı, en düşük fiyat. Tek bakışta karar verdiren bilgi seti.
- Notalar piramit veya etiket bulutu olarak görselleştirilir. Mevsim/yaş uygunluğu küçük grafiklerle (bar/ikon) gösterilir.
- Renk paleti nötr tutulur (koyu metin, açık zemin). Parfüm görselleri renkli olduğu için arayüz sade kalmalıdır.
- Karanlık mod ilk fazda gerekmez.
- Reklam alanları tasarıma baştan yerleştirilir. Sonradan eklenen reklam, layout shift (CLS) yaratır ve SEO'ya zarar verir.
- Erişilebilirlik: kontrast oranları, klavye navigasyonu, `aria` etiketleri.

---

## 7. Veri Toplama (İlk Yükleme)

### 7.1 Kapsam Hedefi

Açılış için gerçekçi hedef: TR pazarında satılan ve aranan **3.000-5.000 parfüm**. Fragrantica'nın 80 bin+ kaydını kopyalamaya çalışmak hem gereksiz hem risklidir. TR'de aranmayan ürün trafik getirmez.

### 7.2 Veri Kaynakları ve Yöntem

| Veri | Kaynak | Yöntem |
|---|---|---|
| Katalog (ad, marka, tip, yıl, cinsiyet) | Marka resmi siteleri, TR perakendeci katalogları (Sephora, Gratis, Watsons, Trendyol), Wikipedia/Wikidata | Scraper + agentic AI normalizasyonu |
| Notalar, mevsim/yaş uygunluğu | Marka açıklamaları + LLM ile çıkarım + topluluk verisi | Agentic AI + insan kontrolü |
| Görseller | Affiliate feed görselleri (kullanım hakkı feed sözleşmesinde verilir) veya marka basın kitleri | Feed'den otomatik indirme |
| Fiyatlar | Affiliate network ürün feed'leri (XML/CSV), yoksa scraper | Otomatik, günlük |
| Muadil verisi | Muadil marka katalogları (Bargello, Golden Scent tarzı markalar muadillerini kendileri ilan eder), forumlar, sosyal medya listeleri | Scraper + LLM eşleştirme + insan onayı |

### 7.3 Pipeline Mimarisi

```
[Scraper'lar] → raw_data (jsonb staging tablosu)
      ↓
[LLM normalizasyon] → aday kayıt (marka eşleştirme, nota standardizasyonu, dil temizliği)
      ↓
[Dedup + validasyon] → aynı parfümün farklı kaynaklardan gelen kayıtları birleştirilir
      ↓
[Admin onay ekranı] → insan kontrolü (özellikle ilk 500 popüler ürün elle doğrulanır)
      ↓
[Yayın] → perfume tablosu, is_published = true
```

- Scraper'lar Playwright/HttpClient ile .NET içinde yazılır. Rate limiting ve polite crawling kurallarına uyulur.
- LLM normalizasyonu için Claude Haiku yeterli ve ucuzdur. Girdi: ham scrape verisi. Çıktı: şemaya uygun JSON.
- Admin onay ekranı basit bir Blazor sayfasıdır: yan yana kaynak verisi ve normalize edilmiş kayıt, onayla/düzelt/reddet butonları.

### 7.4 Hukuki Not

- Fragrantica ve Parfumo'nun içeriğini (özellikle görsellerini ve editoryal metinlerini) kopyalamak telif ihlalidir ve ToS'larına aykırıdır. Bu siteler yapıyı anlamak için referans alınır, veri kaynağı olarak kullanılmaz.
- Nota listeleri gibi olgusal veriler telif korumasına girmez ama derleme (database) hakları tartışmalıdır. Güvenli yol: birden fazla kaynaktan olgusal veri toplayıp kendi metinlerini üretmektir.
- Görsellerde en güvenli kaynak affiliate feed'leridir. Feed sözleşmesi görsel kullanım iznini içerir.

---

## 8. Veri Bakımı (Sürekli Operasyon)

Tüm bakım işleri Hangfire üzerinde zamanlanmış job'lar olarak çalışır:

| Job | Sıklık | İş |
|---|---|---|
| Fiyat güncelleme | Günlük (gece) | Affiliate feed'leri indir, `price_offer` güncelle, `price_history`'ye yaz, düşen fiyatlar için alarm kuyruğunu doldur |
| Fiyat alarmı e-postaları | Günlük (sabah) | Kuyruktaki alarmları e-posta olarak gönder |
| Yeni ürün tespiti | Haftalık | Perakendeci feed'lerinde/kataloglarında sistemde olmayan ürünleri bul, admin onay kuyruğuna at |
| Yeni çıkan parfüm takibi | Haftalık | Marka siteleri ve sektör kaynakları taranır (agentic AI ile), yeni çıkışlar admin kuyruğuna düşer |
| Muadil güncelleme | Aylık | Muadil marka katalogları yeniden taranır, yeni eşleşmeler admin onayına gider |
| AI yorum özeti | Günlük | N+ yeni yorum almış parfümlerin özetleri yeniden üretilir |
| Kırık link kontrolü | Haftalık | Stokta olmayan / 404 dönen mağaza linkleri işaretlenir |
| Sitemap yenileme | Günlük | Sitemap üret, Search Console'a ping at |
| Ortalama puan yenileme | Saatlik | Denormalize `avg_rating` alanlarını güncelle |

Ek olarak kullanıcı katkısı bir bakım kanalıdır: her sayfaya "hata bildir / eksik bilgi bildir" linki konur. Bildirimler admin kuyruğuna düşer.

---

## 9. Para Kazanma Modeli

### 9.1 Gerçekçi Sıralama

1. **Affiliate (ana gelir):** Bu site yapısı affiliate için idealdir. Kullanıcı zaten satın alma niyetiyle fiyat linkine tıklar. TR'de kanallar: Trendyol Ortaklık Programı, Hepsiburada Affiliate, Amazon TR Ortaklık, Admitad/Gelirortakları üzerinden Sephora/Watsons/Gratis. Kozmetikte komisyonlar %3-10 arasındadır.
2. **Google AdSense (ikincil gelir):** Bu tarz bilgi siteleri için uygundur ve kullanıcılar makul yoğunlukta reklamdan kaçmaz. Ancak TR trafiğinin RPM'i düşüktür (1.000 gösterim başına yaklaşık 0,5-2 $). AdSense tek başına geçim kaynağı olmaz. Kural: içerik alanını boğmayan, sayfa başına 2-3 reklam birimi. Agresif reklam hem kullanıcıyı kaçırır hem Core Web Vitals'ı bozar.
3. **E-posta listesi:** Fiyat alarmı aboneleri zamanla değerli bir varlığa dönüşür. Haftalık "fiyatı düşenler" bülteni hem trafiği geri getirir hem affiliate geliri üretir.
4. **İleri aşama:** Sponsorlu içerik (niş parfüm markaları), muadil markalarla doğrudan anlaşmalar, premium özellikler.

### 9.2 Sıra

İlk 6 ay gelir beklenmez ve reklam konulmaz. Trafik oturmadan konulan reklam, kullanıcı deneyimini ve SEO'yu baltalar. Affiliate linkleri ise ilk günden konur çünkü kullanıcıya zaten değer katar (fiyat karşılaştırma).

---

## 10. Hukuk ve Uyum

- **KVKK:** Aydınlatma metni, açık rıza (e-posta aboneliği), veri saklama politikası, kullanıcı verisi silme akışı. Google login kullanıldığı için veri işleme envanteri basit kalır.
- **Çerez onayı:** AdSense ve GA4 için onay yönetimi (Google Consent Mode v2) gerekir.
- **Telif:** Bkz. 7.4. Görsel ve metin kaynakları belgelenir.
- **E-ticaret mevzuatı:** Site satış yapmadığı için ETBİS vb. yükümlülükler doğmaz. Ticari elektronik ileti (fiyat alarmı e-postası) için İYS kapsamı kontrol edilir; onaylı abonelik akışı bu riski karşılar.

---

## 11. Fazlara Bölünmüş Yol Haritası

Süre tahminleri tek geliştirici ve yarı zamanlı çalışma varsayımıyla verilmiştir. Tam zamanlı çalışmada süreler yaklaşık yarıya iner.

### Faz 0 — Temel ve Karar (1-2 hafta)
- Domain, hosting, Cloudflare, repo, CI/CD kurulumu
- DB şemasının kesinleşmesi ve migration'ların yazılması
- 20-30 parfümlük elle girilmiş örnek veri seti
- Tasarım sisteminin (renk, tipografi, kart bileşenleri) belirlenmesi

### Faz 1 — Veri Pipeline'ı (4-6 hafta, Faz 2 ile kısmen paralel)
- Affiliate network başvuruları (onay süreçleri haftalar alabilir, **ilk gün başvurulur**)
- Scraper altyapısı + staging tabloları
- LLM normalizasyon adımı
- Admin onay ekranı
- Hedef: yayında 3.000+ onaylı parfüm, 1.000+ fiyat kaydı, 300+ muadil eşleşmesi

### Faz 2 — Herkese Açık MVP (6-8 hafta)
- Parfüm detay sayfası (görsel, bilgiler, notalar, breadcrumb, fiyat linkleri, muadiller)
- Kategori/filtre sayfaları ve statik SEO landing sayfaları
- Arama (PostgreSQL FTS + trigram, autocomplete)
- Teknik SEO paketi: sitemap, structured data, canonical, OG, robots
- Search Console + GA4 kurulumu
- **Bu fazın sonunda site yayına alınır.** Login, yorum ve blog olmadan da site değer üretir ve Google index'lemeye başlar. Index yaşı kazanmak için erken çıkış kritiktir.

### Faz 3 — Kullanıcı Özellikleri (4-6 hafta)
- Google OAuth login
- Puanlama ve yorumlar + moderasyon ekranı
- Favoriler ve karşılaştırma listesi (localStorage + hesap senkronu)
- Fiyat alarmı + e-posta altyapısı
- AI yorum özeti job'ı (yorum hacmi oluştukça devreye girer)

### Faz 4 — İçerik ve Gelir (4 hafta + sürekli)
- Blog altyapısı + admin onaylı kullanıcı yazıları
- İlk 10-15 editoryal yazı
- Affiliate linklerin tamamlanması
- 6. aydan itibaren trafiğe göre AdSense entegrasyonu

### Faz 5 — Otomasyon ve Ölçek (sürekli)
- Bölüm 8'deki tüm bakım job'larının devreye alınması
- Search Console verisiyle içerik boşluğu analizi ve yeni landing sayfaları
- Gerekirse Meilisearch/Typesense'e geçiş
- İkinci dil hazırlığı (talep oluşursa)

**Toplam:** Yayına çıkış (Faz 2 sonu) yaklaşık 3-4 ay. Tam özellik seti yaklaşık 6-7 ay.

---

## 12. Riskler ve Önlemler

| Risk | Etki | Önlem |
|---|---|---|
| SEO trafiğinin geç gelmesi | Motivasyon ve gelir gecikmesi | Uzun kuyruk + muadil sayfalarına öncelik, erken yayına çıkış, 12 aylık sabır planı |
| Fragrantica/Parfumo ile rekabet | Ana sorgularda sıralama alamama | TR'ye özgü değer: TL fiyat karşılaştırma, muadil içeriği, Türkçe yorumlar |
| Telif/ToS ihlali | Hukuki risk, AdSense banı | Affiliate feed görselleri, kendi metinleri, olgusal veri derlemesi |
| Scraper kırılganlığı | Bayat fiyat verisi | Feed öncelikli mimari, kırık kaynak alarmları, `last_checked_at` şeffaflığı |
| Veri kalitesi (yanlış nota, yanlış muadil) | Güven kaybı | İnsan onay katmanı, kullanıcı hata bildirimi, popüler ürünlerde elle doğrulama |
| Kapsam şişmesi | MVP'nin gecikmesi | Faz 2 kapsamı sabitlenir; blog ve kullanıcı özellikleri sonraya bırakılır |
| Tek kişiye bağımlılık | Bakım yükü | Otomasyon öncelikli tasarım, admin kuyruğu ile haftalık toplu iş |

---

## 13. Başarı Metrikleri

- 3. ay: 1.000+ index'lenmiş sayfa, ilk organik tıklamalar
- 6. ay: aylık 10-30 bin organik oturum, ilk affiliate gelirleri
- 12. ay: aylık 100 bin+ organik oturum, muadil sorgularında ilk sayfa sıralamaları, AdSense + affiliate ile anlamlı gelir
