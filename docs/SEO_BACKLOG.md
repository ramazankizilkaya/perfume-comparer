# Teknik SEO – Kalan İşler (Backlog)

Bu dosya, 26.09.2026 tarihli teknik SEO denetiminden sonra **yapılmadan bırakılan** işleri
anlatır. Temel altyapı (canonical, `/tr` adres biçimi, dinamik sitemap, gerçek 404, meta
etiketleri, JSON-LD) zaten kuruldu; bu dosyadaki işler onun üzerine inşa edilir.

Her görev birbirinden bağımsızdır; ayrı ayrı bir agent'a verilebilir. G8–G12 sonradan
eklendi (ikinci bir denetim raporundan); numaralar değişmesin diye sona yazıldılar.
Öncelik sırası numara sırası değildir:

**G8 → G9 → G1 → G3 → G4 → G2 → G10 → G5 → G6 → G11 → G12 → G7**

| Görev | Konu | Öncelik | Boyut |
|---|---|---|---|
| G8 | Production build'de site ve API adresi kontrolü | Kritik | Küçük |
| G9 | Blog içeriğinde HTML temizleme (XSS) | Yüksek | Küçük–orta |
| G1 | Nota / akor / koku ailesi sayfaları | Yüksek | Büyük |
| G3 | Marka sayfasında linkle sayfalama | Orta | Küçük–orta |
| G4 | Görsel optimizasyonu | Orta | Orta |
| G2 | Karşılaştırma için temiz adres | Orta | Orta |
| G10 | Anasayfa önbelleği (TTFB) | Orta | Orta, karar gerekli |
| G5 | Kopya içerik analizi | Orta | Analiz küçük |
| G6 | Sitemap bölme | Düşük | Küçük |
| G11 | Global CSS'i küçültme (önce ölçüm) | Düşük | Orta |
| G12 | Küçük temizlikler | Düşük | Küçük |
| G7 | Product şeması eksikleri | Düşük | Karar gerekli |

---

## Başlamadan önce (her görev için zorunlu)

1. `AGENTS.md` dosyasını oku. Oradaki kurallar bu dosyadan önce gelir: cevap uzunluğu,
   commit izni, UI kontrol listesi (1440 / 768 / 375 px, açık ve koyu mod), test ekleme
   zorunluluğu ve mimari doküman senkronizasyonu.
2. Mevcut SEO altyapısını oku. Aşağıdaki dosyalar kuralların kendisidir; yeni kod bunları
   kullanmalı, kendi kopyasını yazmamalı:
   - `src/perfume-comparer-web/src/lib/seo.ts`: `pageMetadata()`, `absoluteUrl()`,
     `jsonLd()`, `SITE_URL`, `NO_INDEX`.
   - `src/perfume-comparer-web/src/lib/urls.ts`: `localeHref`, `perfumeHref`, `brandHref`,
     `blogHref`, `searchHref`, `compareHref`. **İç link asla elle yazılmaz.**
   - `src/perfume-comparer-web/src/proxy.ts`: `/tr` ön eki, 308 yönlendirmeleri, `/en` için 404.
   - `src/perfume-comparer-web/src/app/sitemap.ts` ve backend'deki `SitemapService.cs`.
   - `docs/AGENT_DEEP_ARCHITECTURE.md` → "Teknik SEO Altyapısı" bölümü.
3. Bu Next.js sürümü (16.2) eğitim verindeki sürümden farklıdır. API kullanmadan önce
   `src/perfume-comparer-web/node_modules/next/dist/docs/` altındaki ilgili dokümanı oku.
   Örneğin `middleware` artık `proxy`; metadata sığ birleştirilir, bu yüzden `openGraph`
   her sayfada tam verilmelidir.

### Değişmez kurallar

- Asıl adres biçimi `/tr/...` halidir. Canonical, JSON-LD, sitemap ve iç linklerin hepsi bu
  biçimde olmalı ve hiçbiri yönlendirmeye uğramamalı.
- Sayfa başlıklarına `| Aura Compare` yazılmaz; kök şablon ekler.
- Olmayan kayıt `notFound()` ile 404 döner. API hatasında hata fırlatılır (500); 200 dönen
  "bulunamadı" sayfası yapılmaz.
- `Product.aggregateRating` yalnızca sitenin kendi kullanıcı puanından üretilir, Fragrantica
  puanından asla.
- Backend katmanları korunur: Controller → `Business/Services` → `IUnitOfWork`/Repository.
  Yeni kodda controller içinde EF sorgusu olmaz.
- Katalog verisi uydurulmaz; her şey `scrape_files/` ve veritabanından gelir.
- Kullanıcıya görünen metinler Türkçe olur; tasarım epey.com gibi yoğun ve tablolu kalır.
- Commit ve push yapılmaz; kullanıcı açıkça izin vermeden asla.

### Her görevin "bitti" tanımı

- `cd src/perfume-comparer-web && npm run build` başarılı olmalı. `npm run lint` yeni hata
  getirmemeli (şu an eski kodda 15 hata var; sayı artmamalı).
- Backend değiştiyse `dotnet build` hatasız olmalı. `tests/api-test` altına yeni endpoint
  için Cucumber senaryosu eklenmeli ve `npx cucumber-js` tamamen geçmeli.
- Production build ile (`npx next start -p 3100`) curl kontrolü yapılmalı:
  - Durum kodları doğru olmalı (200 / 308 / 404).
  - `<link rel="canonical">`, `<title>`, `og:url` ve JSON-LD doğru olmalı.
  - Sayfadaki `href` değerlerinin hepsi `/tr` ile başlamalı.
- UI değiştiyse `/browse` ile 4 durumda ekran görüntüsü alınmalı ve yatay taşma olmamalı.
- `docs/AGENT_QUICK_MAP.md` ve `docs/AGENT_DEEP_ARCHITECTURE.md` güncellenmeli.
- Bu dosyada ilgili görevin başına `✅ Tamamlandı (tarih)` yazılmalı.

---

## G1. Nota, akor ve koku ailesi için sunucuda hazırlanan açılış sayfaları

**Öncelik:** Yüksek (en büyük organik trafik fırsatı)
**Tahmini boyut:** Büyük (frontend + küçük backend + sitemap)

### Neden
"Vanilya notalı parfümler" veya "odunsu parfümler" gibi aramalar çok hacimlidir. Bugün bu
listeler sadece `/tr/detayli-arama?note=vanilya` adresinde var. Bu sayfa tarayıcıda
çiziliyor (`app/ara/page.tsx`, `"use client"`), canonical'ı filtresiz arama sayfasına
gidiyor ve başlığı her filtrede aynı. Yani Google bu listeleri hiç indekslemiyor.

### Yapılacaklar
1. Üç yeni rota eklenmeli, hepsi sunucuda hazırlansın (server component):
   - `/tr/nota/[slug]` (örn. `/tr/nota/vanilya`)
   - `/tr/akor/[slug]` (örn. `/tr/akor/odunsu`)
   - `/tr/koku-ailesi/[slug]` (örn. `/tr/koku-ailesi/oryantal`)

   App Router klasörleri ön eksiz olarak kurulmalı (`app/nota/[slug]/page.tsx` vb.).
   `proxy.ts` `/tr/nota/...` adresini zaten `/nota/...` yoluna rewrite eder.
2. **Veri:** Parfüm listesi mevcut `GET /api/perfumes?note=<slug>&page=N&pageSize=24&sort=...`
   ile alınmalı; akor ve aile filtresi de bu uçta var. Sayfa başlığı ve açıklama için
   nota, akor veya ailenin adı gerekiyor:
   - `GET /api/meta/filters` sadece en yaygın 200 notayı döner, oysa veritabanında
     1.415 nota var.
   - Bu yüzden `GET /api/notes/{slug}`, `GET /api/accords/{slug}` ve
     `GET /api/families/{slug}` gibi küçük uçlar eklenmeli (ad, slug, parfüm sayısı,
     varsa açıklama).
   - Olmayan slug için 404 dönmeli.
3. **Sayfalama:** `?sayfa=2` biçiminde gerçek `<a>` linkleri olmalı.
   - Her sayfanın canonical'ı kendisi olmalı; 1. sayfanın canonical'ı parametresiz adres.
   - `?sayfa=1` adresi parametresiz adrese 308 ile yönlenmeli.
   - Geçersiz veya çok büyük sayfa numarası 404 dönmeli.
4. **Metadata:** `pageMetadata()` ile verilmeli. Örnek:
   - Başlık: `Vanilya Notalı Parfümler (1.234 parfüm)`.
   - Açıklama: veriden üretilsin, örneğin en popüler 3 parfümün adı geçsin.
5. **JSON-LD:** `CollectionPage` (veya `ItemList`) ve `BreadcrumbList`
   (Anasayfa → Notalar → Vanilya) eklenmeli.
6. **İçerik:** Sayfada ince içerik olmaması için 1–2 cümlelik nota/aile açıklaması olmalı.
   Koku aileleri için açıklama `Domain/Lookups.cs` içindeki `Description(this FragranceFamily)` metodunda zaten var; notalar için veri yoksa
   açıklama yazılmaz, uydurulmaz. Liste, marka sayfasındaki kart ızgarası stiliyle
   gösterilmeli (`PerfumeCard`).
7. **İç linkler:** Parfüm detayındaki nota chip'leri, akor şeritleri ve koku ailesi linkleri
   bugün `searchHref({ note })` gibi arama sayfasına gidiyor.
   - Bunlar yeni sayfalara yönlendirilmeli (`noteHref`, `accordHref`, `familyHref`
     yardımcıları `lib/urls.ts` içine eklenmeli).
   - Footer'daki "Koku aileleri" linkleri de değiştirilmeli.
   - Katman filtresi (`noteLayer=ust`) gibi kombinasyonlar arama sayfasında kalabilir.
8. **Sitemap:** `SitemapService` en az bir yayındaki parfümü olan nota, akor ve aileleri de
   dönmeli. `sitemap.ts` bunları eklemeli. Toplam adres sayısının 50.000 sınırını
   aşmadığı kontrol edilmeli (bkz. G6).

### Kabul kriterleri
- `curl -s localhost:3100/tr/nota/vanilya` çağrısı 200 dönmeli ve dönen HTML'de şunlar olmalı:
  - Parfüm adları (tarayıcıda JavaScript çalışmadan görünür olmalı)
  - Kendine işaret eden canonical
  - Benzersiz bir title
  - `BreadcrumbList`
- `/tr/nota/olmayan-nota` 404 dönmeli.
- Parfüm detayındaki nota linkleri `/tr/nota/...` adresine gitmeli.
- Sitemap bu sayfaları içermeli; yeni API uçları için Cucumber senaryoları geçmeli.

---

## G2. Karşılaştırma sayfası için temiz ve tekil adres

**Öncelik:** Orta
**Tahmini boyut:** Orta

### Neden
Bugün `/tr/karsilastir?items=a,b`, `?items=b,a`, `?p1=a&p2=b` ve `?parfumler=a,b`
adreslerinin hepsi aynı içeriği gösteriyor. Canonical şu an sıralı `?items=` biçimini
gösteriyor; bu kopyaları azaltıyor ama sorgu parametreli adresler zayıf sinyal verir ve
sitemap'e giremez.

### Yapılacaklar
1. Temiz bir adres biçimi seçilmeli.
   - **Dikkat:** `-vs-` ayırıcısı güvenli değil. Bazı parfüm slug'larında zaten `-vs-`
     geçiyor, örneğin `victoria-s-secret-vs-him-deepwater-edp` ve
     `victoria-s-secret-vs-him-platinum-edp`.
   - Mevcut `GET /api/compare/{p1}-vs-{p2}/ai-analysis` uç noktası da bu yüzden hatalı
     ayrıştırabilir; bu da kontrol edilip düzeltilmeli.
   - Önerilen biçim: `/tr/karsilastir/<slug1>/<slug2>` (iki ayrı segment), slug'lar
     alfabetik sıralı.
2. Eski biçimler (`?items=`, `?p1=`, `?parfumler=`) ve sırası ters adres, iki parfümlü
   durumda yeni adrese 308 ile yönlendirilmeli. Üç ve dört parfümlü karşılaştırmalar
   sorgu parametresiyle kalabilir ve `noindex, follow` almalı.
3. Yeni sayfa sunucuda hazırlanmalı. Başlık marka adını da içermeli (bugün sadece
   "Sauvage vs Light Blue" yazıyor): örneğin `Dior Sauvage vs Dolce&Gabbana Light Blue`.
4. İç linkler yeni adresi kullanmalı: `compareHref()`, `CompareBar`, `CompareClient` içindeki
   `router.replace` ve anasayfadaki popüler karşılaştırma kartları.
5. `GET /api/compare/popular` listesindeki çiftler sitemap'e eklenmeli. Tüm kombinasyonlar
   eklenmez, sadece popüler olanlar.
6. İki parfümden biri yoksa 404 dönmeli.

### Kabul kriterleri
- `/tr/karsilastir?items=b,a` adresi 308 ile `/tr/karsilastir/a/b` adresine gitmeli.
- `/tr/karsilastir/a/b` 200 dönmeli ve kendine işaret eden canonical taşımalı.
- `-vs-` içeren Victoria's Secret slug'larıyla yapılan karşılaştırma doğru çalışmalı.
- AI analiz uç noktası bu slug'larla test edilmeli.

---

## G3. Marka sayfasında linkle çalışan sayfalama

**Öncelik:** Orta
**Tahmini boyut:** Küçük–orta

### Neden
`BrandPerfumesClient.tsx` ilk 24 parfümü sunucudan alıyor; gerisini sadece "Daha fazla
göster" butonu ve sonsuz kaydırma getiriyor. Sitemap bu parfümleri keşfettiriyor, ancak
marka sayfasından parfümlere iç link gücü akmıyor. Büyük markalarda yüzlerce parfüm
etkileniyor.

### Yapılacaklar
1. Marka sayfası `?sayfa=N` parametresini okumalı ve o sayfanın 24 parfümünü sunucuda
   hazırlamalı (`app/marka/[slug]/page.tsx`).
2. Listenin altına gerçek `<a href="/tr/marka/dior?sayfa=2">` linkleriyle numaralı
   sayfalama eklenmeli. "Daha fazla göster" butonu kalabilir; buton, sayfalama linklerinin
   yanında ek kolaylık olarak çalışır.
3. Canonical kuralları G1 ile aynı olmalı:
   - Her sayfa kendine işaret eder.
   - `?sayfa=1` parametresiz adrese 308 ile yönlenir.
   - Aralık dışı sayfa 404 döner.
4. Filtre ve sıralama parametreleri (`?gender=`, `?sort=`) indekslenmemeli. Canonical
   sadece `?sayfa=` parametresini korumalı.
5. `ItemList` JSON-LD'si o sayfadaki parfümleri listelemeli.

### Kabul kriterleri
- `/tr/marka/dior?sayfa=3` 200 dönmeli ve HTML'de 49–72. parfümler yer almalı.
- Sayfalama linkleri JavaScript olmadan da çalışmalı.
- 4 durumda ekran görüntüsü alınmalı; sayfalama 375 px genişlikte taşmamalı.

---

## G4. Görselleri optimize etmek (`next/image` veya eşdeğeri)

**Öncelik:** Orta (Core Web Vitals, yani Google'ın sayfa hızı ölçütleri)
**Tahmini boyut:** Orta (21 `<img>` kullanımı)

### Neden
Hiçbir yerde `next/image` kullanılmıyor ve görsellerin çoğunda `width`/`height` yok. Bu,
sayfa yüklenirken düzen kaymasına (CLS) ve gereğinden büyük görsel indirilmesine yol açıyor.
Lint'te `@next/next/no-img-element` uyarıları bu yüzden var.

### Yapılacaklar
1. `next.config.ts` içinde API görsel alanı `images.remotePatterns` olarak tanımlanmalı.
   Değer `NEXT_PUBLIC_API_BASE` adresinden türetilmeli; localhost sabit yazılmamalı.
2. Öncelik sırası:
   - `PerfumeHeroMedia` (LCP görseli, yani sayfanın en büyük görseli: `priority` verilmeli)
   - `PerfumeCard`
   - Parfüm sayfasındaki `RelatedBlock`
   - `BrandCard`
   - Blog kapakları
3. Kaynak görseller zaten WebP formatında; `sizes` doğru verilmeli (kart ızgarası mobilde
   2 sütun).
4. **`alt` metinleri değişmemeli.** Metinler `AGENTS.md` → "Image SEO & Alt Text
   Guidelines" kurallarına göre zaten doğru.
5. `next/image` bir yerde uygun değilse (örn. kullanıcı yüklemesi önizlemesi), o yerde en az
   `width`, `height` ve `decoding="async"` eklenmeli ve nedeni tek satır yorumla yazılmalı.

### Kabul kriterleri
- Lint'teki `no-img-element` uyarı sayısı belirgin şekilde düşmeli.
- Parfüm detayında hero görseli `fetchpriority="high"` veya `priority` ile yüklenmeli.
- Görsel geçiş sırasında sayfa kaymamalı; 4 durumda ekran görüntüsüyle kontrol edilmeli.

---

## G5. Kopya ve ince içerik analizi (önce analiz, sonra kullanıcı onayı)

**Öncelik:** Orta
**Tahmini boyut:** Analiz küçük; düzeltme büyük olabilir

### Neden
- Parfüm açıklamaları Fragrantica'dan geliyor. `scripts/rephrase_descriptions.js` var,
  ancak kaç parfüme uygulandığı bilinmiyor. Kopya açıklama, Google'da "kopya içerik"
  sinyali verir.
- Parfüm sayfasındaki FAQ blokları `buildEnrichedFaq()` ile şablondan üretiliyor ve
  22 bin sayfada neredeyse aynı cümleleri taşıyor.
- FAQPage zengin sonucu Google'da artık sadece devlet ve sağlık siteleri için gösteriliyor.

### Yapılacaklar
1. **Sadece analiz yapılmalı ve rapor yazılmalı.** Rapor şunları içermeli:
   - Kaç parfümün açıklaması kaynakla birebir veya çok yakın aynı? (`scrape_files/` içindeki
     orijinal metin ile veritabanındaki `description` karşılaştırılmalı.)
   - Kaç parfümde `article`/`faq` zenginleştirmesi var, kaçında yok?
   - Açıklaması veya notası olmayan, çok az veri taşıyan parfüm sayısı nedir?
2. Rapor kullanıcıya sunulmalı ve **onay alınmadan hiçbir toplu yeniden yazma, AI üretimi
   veya scraper çalıştırılmamalı.** Bu işler saatler sürer ve API maliyeti vardır.
3. Onay gelirse seçenekler şunlardır:
   - Kalan açıklamalar yeniden yazılır.
   - Çok ince sayfalara `noindex` verilir veya bu sayfalar sitemap'ten çıkarılır.
   - FAQ şemasının tutulup tutulmayacağına kullanıcı karar verir.

### Kabul kriterleri
- `docs/` altına sayılarla dolu kısa bir rapor yazılmalı; kod değişikliği yapılmamalı.

---

## G6. Sitemap'i 50.000 adres sınırına karşı bölmek

**Öncelik:** Düşük (şu an 22.259 adres var)
**Tahmini boyut:** Küçük

### Neden
Tek bir sitemap dosyası en fazla 50.000 adres alabilir. G1 ve G2 yeni adresler ekleyecek;
katalog da büyüyor.

### Yapılacaklar
1. `app/sitemap.ts` dosyası `generateSitemaps()` ile bölünmeli: parfümler 40.000'lik
   parçalara, geri kalan sayfalar ayrı bir parçaya. Next 16'nın bu API için ürettiği
   adresler (`/sitemap/0.xml` vb.) dokümandan doğrulanmalı.
2. Bölünme sonrası sitemap index dosyası (`/sitemap.xml`) çalışmaya devam etmeli ve
   `robots.ts` içindeki `Sitemap:` satırı doğru dosyayı göstermeli.
3. API yanıtı 2 MB'ı aştığı için Next fetch önbelleğine sığmıyor; önbellek bugün API
   tarafında (`SitemapService`, 1 saat). Bölünme yapılırken `GET /api/sitemap` sayfalı hale
   getirilebilir (`?part=`), böylece her parça küçük kalır.

### Kabul kriterleri
- Her sitemap dosyası 50.000 adresten az içermeli.
- Toplam adres sayısı bölünme öncesiyle aynı kalmalı.
- `robots.txt` doğru adresi göstermeli.

---

## G7. Product şemasının eksikleri (karar gerekiyor)

**Öncelik:** Düşük
**Tahmini boyut:** Küçük, ama önce kullanıcı kararı gerekli

### Neden
Google, Product şemasında `offers`, `review` veya `aggregateRating` alanlarından en az
birini bekler. Fragrantica puanı kaldırıldığı için sitenin kendi kullanıcı puanı olmayan
parfümlerde üçü de yok. Search Console bu parfümler için "geçersiz öğe" uyarısı verecek.
Bu uyarı sıralamayı düşürmez; sadece zengin sonuç çıkmaz.

### Seçenekler (kullanıcıya sorulmalı, kendi başına seçilmemeli)
- **A)** Olduğu gibi bırak; kullanıcı puanı geldikçe zengin sonuç kendiliğinden açılır.
- **B)** Sitedeki kullanıcı yorumlarını (`PerfumeCommentsSection`) `review` olarak şemaya
  ekle. Sadece gerçek, sitede görünen yorumlar eklenir.
- **C)** Satış noktalarından (`PerfumeWhereToBuySection`) gerçek fiyat verisi çekilebiliyorsa
  `offers` ekle. Bugün fiyat verisi yok; **fiyat uydurulmaz.**

---

## G8. Production build'de site ve API adresi kontrolü

**Öncelik:** Kritik (küçük iş, bütün SEO altyapısını korur)
**Tahmini boyut:** Küçük

### Neden
- `lib/seo.ts` içindeki `SITE_URL`, `NEXT_PUBLIC_SITE_URL` tanımlı değilse sessizce
  `https://auracompare.com` adresine düşüyor.
- `lib/urls.ts` içindeki `API_BASE` ise `NEXT_PUBLIC_API_BASE` tanımlı değilse
  `http://localhost:5026` oluyor.
- İki değer de `next.config.ts` üzerinden **build anında koda gömülür**.
- Canlı build sırasında bu değişkenlerden biri eksik veya yanlışsa hata çıkmaz; ama tüm
  canonical, sitemap, OG adresleri ve bütün parfüm görselleri (`og:image`,
  `Product.image`) yanlış domaini veya localhost'u gösterir.

### Yapılacaklar
1. `next.config.ts` içine build başında çalışan bir kontrol eklenmeli.
   - Kontrol **yalnızca canlı (deploy) build'de hata vermeli.** `AGENTS.md`, her commit
     öncesi yerelde `npm run build` çalıştırılmasını istiyor; yerel build localhost ile
     çalışmaya devam etmeli.
   - Canlı build'i ayırt etmek için açık bir değişken kullanılmalı (örn.
     `DEPLOY_ENV=production`). `NODE_ENV` kullanılmamalı, çünkü `next build` onu her
     zaman `production` yapar.
2. Canlı build'de şu durumlarda build hata ile durmalı:
   - `NEXT_PUBLIC_SITE_URL` veya `NEXT_PUBLIC_API_BASE` boş.
   - Değer `localhost` / `127.0.0.1` içeriyor.
   - Değer `https://` ile başlamıyor.
3. Yerel build'de aynı durumlar sadece uyarı olarak yazdırılmalı.
4. `.env.example` dosyasına `DEPLOY_ENV` açıklaması eklenmeli.
5. **Kullanıcı kararı:** Görsellerin API domaini yerine sitenin kendi domaininden
   (`/media/...`) servis edilmesi değerlendirilmeli. Yöntem: Next `rewrites` ile veya
   önde duran reverse proxy (nginx vb.) ile. Faydası şu: görsel adresleri API adresine
   bağlı kalmaz ve görsel araması sinyali kendi domainde toplanır. Bu bir altyapı kararıdır;
   **önce kullanıcıya sorulmalı**, kendi başına uygulanmamalı.

### Kabul kriterleri
- `DEPLOY_ENV=production NEXT_PUBLIC_SITE_URL= npm run build` hata ile durmalı ve hata
  mesajı hangi değişkenin eksik olduğunu Türkçe söylemeli.
- `DEPLOY_ENV=production NEXT_PUBLIC_API_BASE=http://localhost:5026 npm run build` hata
  ile durmalı.
- Değişkenler olmadan yapılan yerel `npm run build` eskisi gibi başarılı olmalı
  (sadece uyarı).

---

## G9. Blog içeriğinde HTML temizleme (XSS)

**Öncelik:** Yüksek (güvenlik açığı; SEO sonucu ağır olabilir)
**Tahmini boyut:** Küçük–orta

### Neden
- Kullanıcılar `POST /api/blogs` ile yazı gönderebiliyor. Yazı `Pending` durumunda admin
  onayına düşüyor.
- `components/RichTextRenderer.tsx` gövdeyi `marked` ile HTML'e çeviriyor ve
  `dangerouslySetInnerHTML` ile **hiç temizlemeden** basıyor. `marked`, metnin içindeki ham
  HTML'i (`<script>`, `onerror=`, `<iframe>`) olduğu gibi geçirir.
- Backend'de de hiçbir temizleme yok (kodda `sanitize`/`HtmlSanitizer` araması boş çıktı).
- Sonuç: Admin fark etmeden zararlı bir yazıyı onaylarsa kalıcı (stored) XSS oluşur.
- Saldırgan sayfaya gizli spam linkleri de ekleyebilir. Bu durumda Google siteyi
  "hacked content" (ele geçirilmiş içerik) olarak işaretleyebilir.
- Kullanıcı linklerinde `rel="nofollow ugc"` da yok. Bu yüzden sitenin link değeri spam
  sitelere akabilir.

### Yapılacaklar
1. `RichTextRenderer` içinde `marked` çıktısı basılmadan önce temizlenmeli.
   - Bileşen hem sunucuda (blog detayı) hem tarayıcıda (editör önizlemesi,
     `/blog/onizleme`) çalışıyor. Bu yüzden iki ortamda da çalışan bir kütüphane
     seçilmeli, örneğin `isomorphic-dompurify` veya `sanitize-html`. Seçim gerekçesi tek
     satır yorumla yazılmalı.
   - İzin listesi, editörün (`RichTextEditor.tsx`) ürettiği öğelerle sınırlı olmalı:
     başlıklar, paragraf, kalın/italik, liste, alıntı, tablo, link, görsel, kod.
   - `script`, `iframe`, `style` etiketleri ve `on*` olay öznitelikleri ile
     `javascript:` adresleri kaldırılmalı.
2. Site dışına giden tüm linklere `rel="nofollow ugc noopener"` eklenmeli. Site içi linkler
   (`/tr/...`) dokunulmadan kalmalı. Bu, `marked` link renderer'ı veya sanitizer hook'u ile
   yapılabilir.
3. **Kullanıcı kararı:** Savunmayı iki katmanlı yapmak için backend'de yazı kaydedilirken de
   temizleme yapılmalı mı? (Örneğin `HtmlSanitizer` NuGet paketi, `BlogController` →
   service katmanı.) Önce kullanıcıya sorulmalı.
4. `scrape_files/articles/` altından gelen editör makaleleri de aynı yoldan geçiyor. Temizleme
   sonrası bu makalelerin görünümü bozulmamalı; 13 makalenin hepsi kontrol edilmeli.

### Kabul kriterleri
- Aşağıdaki gövdeyle test yazısı önizlendiğinde script çalışmamalı ve HTML'de `onerror`,
  `<script>`, `<iframe>` ve `javascript:` kalmamalı:
  `<img src=x onerror=alert(1)><script>alert(2)</script>[tıkla](javascript:alert(3))<iframe src="https://example.com"></iframe>`
- Dış linkler `rel="nofollow ugc noopener"` taşımalı.
- Mevcut 13 blog yazısı temizlik öncesiyle aynı görünmeli (4 durumda ekran görüntüsü).
- Backend'e kayıt aşamasında temizleme eklenirse bunun için Cucumber senaryosu yazılmalı.

---

## G10. Anasayfa önbelleği (sunucu yanıt süresi)

**Öncelik:** Orta
**Tahmini boyut:** Orta; **önce kullanıcı kararı gerekli**

### Neden
- `app/page.tsx` dosyasında `export const dynamic = "force-dynamic"` var ve her istekte
  API'ye `cache: "no-store"` ile 9 paralel çağrı yapılıyor.
- Anasayfa hiç önbelleğe alınmıyor. Her ziyaret tam sunucu render'ı demek; bu da ilk baytın
  gelme süresini (TTFB) ve dolayısıyla LCP'yi kötüleştiriyor.
- Sayfanın bu şekilde olmasının iki nedeni var:
  - Cinsiyet tercihi çerezi (`gender-pref`) sunucuda okunuyor.
  - Listeler bilinçli olarak rastgele (`sort=random`, `randomPool=500`).

### Kullanıcıya sorulacak karar
Önbelleğe alınan bir anasayfa, önbellek süresi boyunca herkese aynı "rastgele" listeyi
gösterir (örneğin 5 dakika). Bu ürün açısından kabul edilebilir mi? Kabul edilmezse bu
görev yapılmaz.

### Yapılacaklar (onay gelirse)
1. Sunucu, çerezden bağımsız olarak varsayılan (tüm cinsiyetler) veriyle anasayfayı
   hazırlamalı ve sayfa `revalidate` ile önbelleğe alınmalı (örn. 300 saniye).
   `force-dynamic` ve `cookies()` kaldırılmalı.
2. Cinsiyet tercihi olan kullanıcı için `HomeFeedClient` listeleri tarayıcıda yeniden
   çekmeli. Bu mantık bileşende zaten var; ilk yüklemede de çalışacak şekilde
   uyarlanmalı.
   - İçeriğin kullanıcının gözü önünde değişmemesi için bir çözüm seçilmeli (skeleton
     veya yumuşak geçiş).
   - Bileşendeki "ilk yüklemede kartları değiştirmeyiz" yorumunun amacı korunmalı.
3. Blog slider'ı (`GET /api/blogs?random=true&take=5`) da aynı önbellekten yararlanabilir.

### Kabul kriterleri
- `curl -w "%{time_starttransfer}"` ile ölçülen anasayfa TTFB'si önce ve sonra
  raporlanmalı; ikinci istek belirgin şekilde hızlı olmalı.
- Cinsiyet tercihi "erkek" olan kullanıcı yine erkek parfümlerini görmeli.
- Anasayfanın HTML'inde parfüm kartları JavaScript olmadan da görünmeli.

---

## G11. Global CSS'i küçültmek (önce ölçüm)

**Öncelik:** Düşük
**Tahmini boyut:** Orta; risk yüksek, bu yüzden ölçüm şartlı

### Neden
`src/app/globals.css` dosyası yaklaşık 7.100 satır ve 147 KB. Her sayfada tamamı yükleniyor
ve render'ı engelliyor (render-blocking). Ancak bölme işi dark mode ve responsive
düzeni kolayca bozabilir. Bu yüzden önce kazancın ölçülmesi gerekiyor.

### Yapılacaklar
1. **Önce ölç:** Parfüm detayı, marka, arama ve anasayfa için Lighthouse (mobil) çalıştırılmalı.
   - Rapor şunları içermeli: "Kullanılmayan CSS" miktarı, gzip sonrası CSS boyutu, FCP
     ve LCP değerleri.
   - Bu adım bitince kullanıcıya rapor verilmeli.
2. Gzip sonrası kullanılmayan CSS kazancı anlamlıysa (örn. 20 KB'tan fazla), sadece belirli
   sayfalara ait bloklar (blog makalesi, karşılaştırma tablosu, admin, editör) CSS
   Module'e veya o sayfanın kendi CSS dosyasına taşınmalı. Ortak token'lar (`:root`,
   `body.dark-mode`) ve temel bileşenler global dosyada kalmalı.
3. Kazanç küçükse görev "gerek yok" notuyla kapatılmalı.

### Kabul kriterleri
- Ölçüm raporu "önce/sonra" sayılarıyla yazılmalı.
- Taşınan her sayfa 4 durumda (1440 / 768 / 375 px, açık ve koyu mod) ekran görüntüsüyle
  kontrol edilmeli; görsel fark olmamalı.

---

## G12. Küçük temizlikler

**Öncelik:** Düşük
**Tahmini boyut:** Küçük (hepsi bir agent'a birlikte verilebilir)

1. **Elle yazılmış `/tr` linkleri:** Proje kuralına göre iç linkler `lib/urls.ts`
   yardımcılarıyla üretilir. İkinci dil açıldığında bu yerler kırılır. Aşağıdaki yerler hâlâ
   elle `"/tr/..."` yazıyor ve helper'lara çevrilmeli:
   - `components/Header.tsx` (11 yer)
   - `components/UserMenu.tsx` (5 yer)
   - `components/LoginPrompt.tsx`
   - `components/PerfumeCommentsSection.tsx`
   - `components/PerfumeReviewModal.tsx`
   - `components/BlogWriteSection.tsx`
   - `app/error.tsx`
   - `app/ara/page.tsx` (2 yer)

   Giriş ve yazılarım gibi sayfalar için `loginHref(next?)` gibi yardımcılar eklenebilir.
   Kontrol komutu: `grep -rn '"/tr' src --include='*.tsx'`. Sonuç sadece `lib/` altını
   göstermeli.
2. **Blog başlığındaki çift sonek:** `app/blog/[slug]/page.tsx` başlığı `"{title} | Blog"`
   olarak veriyor ve kök şablonla birleşince sonuç `"… | Blog | Aura Compare"` oluyor.
   `| Blog` kaldırılmalı.
3. **Proxy'deki nokta kuralı:** `proxy.ts` içindeki `pathname.includes(".")` kontrolü,
   içinde nokta geçen her yolu dil yönlendirmesinden muaf tutuyor. Bugün sorun yok,
   çünkü `SlugHelper.Slugify` noktaları siliyor. Ama ileride nokta içeren bir slug
   sessizce 404 üretir. Kontrol, bilinen dosya uzantılarının listesiyle değiştirilmeli:
   `ico`, `png`, `jpg`, `jpeg`, `webp`, `svg`, `gif`, `txt`, `xml`, `json`, `js`,
   `css`, `map`, `woff`, `woff2`.
   - Kabul: `/robots.txt`, `/sitemap.xml`, `/logo.png` yine 200 dönmeli.
   - Kabul: `/marka/a.b` 308 ile `/tr/marka/a.b` adresine gitmeli.

### Kabul kriterleri
- Yukarıdaki `grep` temiz çıkmalı.
- Blog başlığı `"{title} | Aura Compare"` olmalı.
- Proxy için verilen curl kontrolleri geçmeli.

---

## Kapsam dışı (şimdilik yapılmayacak)

- **İngilizce (`/en`) içerik ve hreflang:** İçerik çevrilmeden açılmamalı. Açılırsa
  `proxy.ts` içindeki 404 kuralı kaldırılmalı, `alternates.languages` ve `hreflang`
  eklenmeli, `<html lang>` dile göre değişmeli.
