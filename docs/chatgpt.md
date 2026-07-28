Bence bu fikir, "bir parfüm kataloğu" olmaktan ziyade Türkiye'nin Fragrantica + Akakçe + Parfüm karşılaştırma motoru olmalı.

Şu an Türkiye'de bunun tam karşılığı yok. Fragrantica bilgi açısından çok güçlü ama Türkçe değil ve fiyat karşılaştırması yok. Akakçe fiyat veriyor ama parfüm bilgisi çok zayıf. Trendyol ve Hepsiburada satış odaklı. Sen bunların arasını dolduruyorsun.

Bence en önemli konu şu:

Bu proje aslında bir CRUD projesi değil. Bu proje bir SEO + Data Engineering + Search Engine projesi.

Kod yazmak toplam işin belki %25'i olacak.

PERFUME HUB
Teknik Yol Haritası

(TR Pazarı)

1. Proje Amacı

Kullanıcıların Google üzerinden yaptığı aşağıdaki aramalarda ilk sayfaya çıkabilen,

Dior Sauvage

Dior Sauvage yorum

Dior Sauvage EDT mi EDP mi

Dior Sauvage muadilleri

En kalıcı erkek parfümleri

Bergamot kokan parfümler

Yazlık erkek parfümleri

30 yaş erkek parfüm önerisi

gibi binlerce sorguda trafik alabilen bir platform.

Platformun amacı

bilgi vermek
karşılaştırma yapmak
fiyat göstermek
kullanıcı yorumlarını toplamak
affiliate gelir üretmek
2. MVP

İlk versiyonda kesinlikle yapılacaklar

5000-10000 parfüm datası
ürün sayfası
arama
filtreleme
karşılaştırma
kullanıcı yorumları
favoriler
fiyat gösterimi
blog
SEO

Bunlar olmadan canlıya çıkmamak daha mantıklı.

3. Kullanıcı Hikayeleri
3.1 Ürün Sayfası

Her parfümün kendine ait URL'si olacak.

/parfum/dior/sauvage-edp

Sayfada

ürün resmi
marka
seri
çıkış yılı
cinsiyet
konsantrasyon

EDT

EDP

Parfum

Extrait

EDC

Cologne

vb.

notalar

Üst

Orta

Alt

kalıcılık
fark edilirlik
kullanım zamanı
yaş grubu
mevsim
AI özeti
kullanıcı yorumları
puan
benzer parfümler
muadiller
fiyatlar
favorilere ekle
karşılaştırmaya ekle
fiyat alarmı
3.2 Breadcrumb

Örnek

Anasayfa

>

Erkek

>

EDP

>

Dior

>

Sauvage EDP

Hover edildiğinde

EDP

↓

EDT
Parfum
Extrait
Cologne

Marka

↓

Dior Homme

Sauvage EDT

Sauvage Elixir

Fahrenheit

Homme Intense

Bu SEO açısından da çok faydalı.

3.3 Karşılaştırma

En fazla

4 ürün

yan yana.

Karşılaştırılacak

nota
kalıcılık
fark edilirlik
kullanıcı puanı
fiyat
sezon
yaş grubu
3.4 AI Özeti

Yorumlardan otomatik üretilecek.

Örnek

Kullanıcıların %72'si kalıcılığı başarılı buluyor.

En çok beğenilen nota Ambroxan.

Yaz kullanımında daha başarılı olduğu düşünülüyor.

Tatlı bulan kullanıcı oranı %18.

Bu özet belli aralıklarla yeniden oluşturulacak.

3.5 Blog

Blog yazıları tamamen SEO için.

Kategori

Parfüm Rehberi

İncelemeler

Karşılaştırmalar

İlk 10 Listeleri

Nota Rehberleri

Kullanıcılar da yazı yazabilecek.

Admin onayıyla yayınlanacak.

4. Arama

Arama kutusu

dio

↓

Dior Sauvage

Dior Homme

Dior Fahrenheit

Fuzzy search olacak.

Yanlış yazımı anlayacak.

savuj

↓

Sauvage

Türkçe karakter desteği

ş

s

ı

i

eşdeğer kabul edilmeli.

Bence PostgreSQL Full Text Search başlangıç için yeterli. Trafik büyürse Elasticsearch/OpenSearch'e geçilebilir.

5. Filtreleme

Çok hızlı olmalı.

Filtreler

Marka
Cinsiyet
Tip
Fiyat
Çıkış yılı
Nota
Üst nota
Alt nota
Kalıcılık
Yayılım
Kullanıcı puanı
Mevsim
Yaş grubu
6. Kullanıcı Sistemi

Google Login

Daha sonra

Apple

Facebook

eklenebilir.

Kullanıcı

yorum yapabilir
puan verebilir
favori oluşturabilir
fiyat alarmı kurabilir
karşılaştırma listesi oluşturabilir
7. Admin Panel

Mutlaka gerekli.

Buradan

marka ekleme
parfüm ekleme
fiyat düzeltme
yorum moderasyonu
blog moderasyonu
AI özetini yeniden üretme
scraper çalıştırma

yapılmalı.

8. Mimari
Backend

.NET 9

ASP.NET Core

Minimal API

EF Core

PostgreSQL

Redis

Hangfire

Frontend

Burada kritik nokta SEO.

Ben Blazor Server veya Blazor WebAssembly'i ana site için önermem.

Google artık JavaScript render edebiliyor olsa da, SEO yarışında Next.js, Nuxt veya Astro gibi SSR/SSG çözümleri hâlâ avantaj sağlıyor.

Ben olsam:

Backend

.NET API

Frontend

Next.js

SSR

ISR

Static Generation

kombinasyonu.

Bu yapı SEO açısından daha güvenli.

Blazor'u sadece Admin Panel için kullanabilirsin.

9. SEO Planı

Bu proje tamamen SEO üzerine kurulu.

Teknik SEO
sitemap.xml
image sitemap
robots.txt
canonical URL
OpenGraph
Twitter Card
Schema.org
Product schema
Review schema
Breadcrumb schema
FAQ schema
Organization schema
WebSite schema
SearchAction schema
İç SEO

Her ürün

1000+ kelime.

AI destekli açıklama.

Her marka

Dior Parfümleri

sayfası.

Her nota

Amber Kokulu Parfümler

sayfası.

Her mevsim

Yazlık Erkek Parfümleri

Her yaş

20 Yaş Erkek Parfümleri

Her kategori

En Kalıcı Parfümler

En İyi Ofis Parfümleri

Kışlık Kadın Parfümleri

Yani sadece ürün sayfaları değil, filtre kombinasyonlarından değerli landing page'ler de oluşturulmalı.

10. Veri Toplama

Bu aslında projenin en büyük işi.

Toplanacak

marka
ürün
görsel
notalar
açıklama
çıkış yılı
konsantrasyon
kullanıcı puanı
fiyat
satıcı
hacim
muadil

Kaynaklar

resmi marka siteleri
yetkili satıcılar
açık veri kaynakları
lisans ve kullanım şartlarına dikkat edilerek yapılacak web scraping
AI agent ile doğrulama

Veri pipeline'ı:

Kaynak keşfi.
Scraping/API ile ham veri toplama.
Normalizasyon (isim, nota, marka eşleştirme).
İnsan onayı gerektiren kayıtları işaretleme.
Veritabanına alma.
11. Veri Bakımı

Her gece çalışan görevler.

Kontrol

fiyat değişti mi
yeni ürün geldi mi
stok değişti mi
yeni yorum oluştu mu

Haftalık

yeni marka
yeni seri

Aylık

AI özetlerini yeniden oluştur.

Belirli kaynaklarda RSS, e-posta bülteni veya resmi duyurular varsa bunlar da takip edilerek yeni ürünler yakalanabilir.

12. Veritabanı Taslağı

Temel tablolar:

Brand
Perfume
PerfumeVariant
Concentration
Note
PerfumeNote
NoteType
Season
AgeGroup
PerfumeSeason
PerfumeAgeGroup
Retailer
RetailerPrice
User
Review
Favorite
ComparisonList
SimilarPerfume
DupeRelation
Blog
BlogComment
PriceAlert
Tag
SearchKeyword
ScrapeSource
ScrapeJob
ScrapeHistory

Bir parfümün farklı hacimleri (50 ml, 100 ml, 150 ml) ve farklı konsantrasyonları (EDT, EDP vb.) ayrı varlıklar olarak modellenmeli.

13. Çoklu Dil

İlk sürüm

Türkçe

Ama tüm metinler

Localization

altyapısıyla geliştirilmeli.

URL yapısı ileride şu şekilde genişleyebilmeli:

/tr/
/en/
/de/
14. Gelir Modeli

Google Ads başlangıç için uygun olabilir ama tek gelir kaynağı olmamalı. Aşırı reklam kullanıcı deneyimini ve SEO metriklerini olumsuz etkileyebilir.

Daha sürdürülebilir seçenekler:

Affiliate linkleri (Trendyol, Hepsiburada, Amazon TR, Boyner, Sephora vb. programlar varsa)
Sponsorlu ürün tanıtımları (etiketlenmiş)
Premium üyelik (reklamsız kullanım, gelişmiş karşılaştırmalar, fiyat geçmişi)
Fiyat alarmı ve özel bildirimler
API erişimi (B2B)
Marka kampanyaları
E-posta bülteni sponsorluğu

Bence gelir sırası:

Affiliate
Sponsorlu içerik
Premium üyelik
Reklam
15. Yol Haritası

Faz 1 (2-4 hafta): Gereksinim analizi, veri modeli, UI/UX tasarımı, teknoloji seçimi.

Faz 2 (4-8 hafta): Veri toplama altyapısı ve ilk veri setinin oluşturulması.

Faz 3 (6-10 hafta): Backend API, kullanıcı sistemi, admin paneli.

Faz 4 (6-8 hafta): Frontend, ürün sayfaları, arama, filtreleme, karşılaştırma.

Faz 5 (3-4 hafta): SEO optimizasyonları, Schema.org, performans, Core Web Vitals.

Faz 6 (Sürekli): İçerik üretimi, yeni veri kaynakları, AI özellikleri ve gelir optimizasyonu.

Samimi Değerlendirmem

Fikri beğendim çünkü insanların gerçekten aradığı bir problemi çözüyor; "hangi parfüm nasıl kokuyor, ne kadar kalıcı, muadili ne ve en ucuza nerede bulunur?" sorularını tek yerde cevaplıyor.

Ancak burada en büyük risk teknik tarafta değil. En büyük risk veri ve içerik. Güçlü bir yazılımcı bu sistemi birkaç ay içinde geliştirebilir; fakat 10.000 kaliteli parfüm kaydı, doğru nota bilgileri, fiyatlar, muadil ilişkileri ve SEO dostu içerikler oluşturmak çok daha uzun sürecektir. Bu nedenle projeyi önce veri platformu, sonra web uygulaması olarak düşünmeni öneririm.

Bir diğer önemli konu, ilk günden "her şeyi yapan" bir ürün geliştirmeye çalışmamak. Eğer önce sağlam bir veri tabanı, mükemmel ürün sayfaları, hızlı arama ve güçlü SEO ile çıkarsan, zaman içinde AI özetleri, fiyat geçmişi, kişisel öneriler ("Bunu beğendiysen şunları da seversin"), koleksiyon yönetimi ve gelişmiş filtreler gibi özellikleri eklemek çok daha kolay olur.

Bu fikrin beni en çok heyecanlandıran kısmı ise SEO potansiyeli. Doğru bilgi mimarisiyle yalnızca ürün sayfaları değil, marka, nota, mevsim, yaş grubu ve "en iyi" listeleri üzerinden on binlerce indekslenebilir sayfa üretilebilir. Bu da zamanla ciddi bir organik trafik oluşturabilir.

Ben olsaydım projeyi tek cümlede şöyle konumlandırırdım:

"Türkiye'nin en kapsamlı parfüm bilgi, karşılaştırma ve fiyat keşif platformu."

Bu konumlandırma hem ürün vizyonunu netleştirir hem de sonraki özelliklerin (AI önerileri, fiyat alarmı, mobil uygulama, koleksiyon yönetimi vb.) doğal bir şekilde aynı ekosisteme eklenmesini sağlar.