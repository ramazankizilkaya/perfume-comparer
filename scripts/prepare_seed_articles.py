#!/usr/bin/env python3
"""
scripts/prepare_seed_articles.py
Parses, cleans and formats all 13 perfume articles into structured rich Markdown.
Removes legacy seed data prompts, Unsplash disclaimers, chat notes and formatting issues.
Generates `scrape_files/articles/seed_articles.json` for seeding into PostgreSQL.
"""

import os
import json
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTICLES_DIR = os.path.join(BASE_DIR, "scrape_files/articles")
OUTPUT_FILES = [
    os.path.join(BASE_DIR, "scrape_files/articles/seed_articles.json"),
    os.path.join(BASE_DIR, "src/PerfumeComparer/Data/seed_articles.json"),
]

def read_txt(filename):
    p = os.path.join(ARTICLES_DIR, filename)
    with open(p, "r", encoding="utf-8") as f:
        return f.read().strip()

def strip_first_h1_if_matches(text, title):
    lines = text.split("\n")
    if lines and (lines[0].startswith("# ") or lines[0].strip().lower() == title.strip().lower()):
        return "\n".join(lines[1:]).strip()
    return text.strip()

# 1. 6000 Yıllık Yolculuk
def clean_art1():
    text = read_txt("Kokunun 6000 Yıllık Yolculuğu.txt")
    text = re.sub(r"^Kokunun 6000 Yıllık Yolculuğu:[^\n]*\n*", "", text)
    text = re.sub(r"^Kapsam:[^\n]*\n*", "", text)
    text = re.sub(r"parfüm tarihiGrasseChanel No\.5[^\n]*$", "", text).strip()
    
    eras = [
        ("MÖ 3500 – MÖ 1000\nMezopotamya ve Antik Mısır: Kokunun Doğuşu", "## Mezopotamya ve Antik Mısır: Kokunun Doğuşu (MÖ 3500 – MÖ 1000)"),
        ("MÖ 1000 – MS 400\nAntik Yunan ve Roma: Koku Bir Statü Simgesi Oluyor", "## Antik Yunan ve Roma: Koku Bir Statü Simgesi Oluyor (MÖ 1000 – MS 400)"),
        ("8. – 13. Yüzyıl\nİslam Altın Çağı: Distilasyonun Icadı, Parfümün Dönüm Noktası", "## İslam Altın Çağı: Distilasyonun İcadı ve Parfümün Dönüm Noktası (8. – 13. Yüzyıl)"),
        ("14. – 17. Yüzyıl\nRönesans Avrupası: Alkol Bazlı Parfümün Doğuşu", "## Rönesans Avrupası: Alkol Bazlı Parfümün Doğuşu (14. – 17. Yüzyıl)"),
        ("17. – 18. Yüzyıl\nGrasse'ın Yükselişi: Fransa Dünya Başkenti Oluyor", "## Grasse'ın Yükselişi: Fransa Dünya Başkenti Oluyor (17. – 18. Yüzyıl)"),
        ("19. Yüzyıl\nSentetik Devrim: Kimya Parfümeriye Giriyor", "## Sentetik Devrim: Kimya Parfümeriye Giriyor (19. Yüzyıl)"),
        ("20. Yüzyıl\nModa Evleri Sahneye Çıkıyor", "## 20. Yüzyıl: Moda Evleri Sahneye Çıkıyor"),
        ("21. Yüzyıl\nNiş Parfümeri ve Kişiselleşme Çağı", "## 21. Yüzyıl: Niş Parfümeri ve Kişiselleşme Çağı"),
        ("Özetle: Parfümün 6000 Yıllık Rotası", "## Özetle: Parfümün 6000 Yıllık Rotası")
    ]
    for old_h, new_h in eras:
        text = text.replace(old_h, new_h)

    return {
        "title": "Kokunun 6000 Yıllık Yolculuğu: Parfüm Nasıl ve Nerede Doğdu?",
        "slug": "kokunun-6000-yillik-yolculugu",
        "excerpt": "Antik Mısır tapınaklarından Mezopotamya damıtma ocaklarına, Arap simyacılarından modern Grasse atölyelerine parfümün büyüleyici tarihi.",
        "coverImageUrl": "/blog_backgrounds/kokunun-6000-yillik-yolculugu.webp",
        "viewCount": 420,
        "body": text.strip()
    }

# 2. Parfüm Lügatı
def clean_art2():
    text = read_txt("Parfüm Lügatı: Parfüm Dünyasında Bilmeniz Gereken Tüm Terimler.txt")
    text = strip_first_h1_if_matches(text, "Parfüm Lügatı: Parfüm Dünyasında Bilmeniz Gereken Tüm Terimler")
    return {
        "title": "Parfüm Lügatı: Parfüm Dünyasında Bilmeniz Gereken Tüm Terimler",
        "slug": "parfum-lugati-bilmeniz-gereken-tum-terimler",
        "excerpt": "Sillage, maserasyon, koku piramidi, akor ve reformülasyon: Koku dünyasını bir uzman gibi okumanızı sağlayacak kapsamlı A'dan Z'ye terimler sözlüğü.",
        "coverImageUrl": "/blog_backgrounds/parfum-lugati.webp",
        "viewCount": 890,
        "body": text.strip()
    }

# 3. Türkiye'de Muadil Parfüm Pazarı 2026
def clean_art3():
    text = read_txt("Türkiye’de Muadil Parfüm Pazarı 2026: Arz, Talep, Markalar ve Yeni Koku Savaşı.txt")
    text = strip_first_h1_if_matches(text, "Türkiye’de Muadil Parfüm Pazarı 2026: Arz, Talep, Markalar ve Yeni Koku Savaşı")
    return {
        "title": "Türkiye’de Muadil Parfüm Pazarı 2026: Arz, Talep, Markalar ve Yeni Koku Savaşı",
        "slug": "turkiyede-muadil-parfum-pazari-2026",
        "excerpt": "Yüksek enflasyon, değişen tüketici tercihleri ve yükselen yerli butik markalar: Türkiye'deki muadil parfüm sektörünün derinlemesine analizi.",
        "coverImageUrl": "/blog_backgrounds/turkiyede-muadil-parfum-pazari-2026.webp",
        "viewCount": 940,
        "body": text.strip()
    }

# 4. Parfüm Dünyasında 2026 Sonbaharı
def clean_art4():
    text = read_txt("Parfüm Dünyasında 2026 Sonbaharı: Yeni Kokular, Yükselen Trendler ve Değişen Parfüm Kültürü.txt")
    text = strip_first_h1_if_matches(text, "Parfüm Dünyasında 2026 Sonbaharı: Yeni Kokular, Yükselen Trendler ve Değişen Parfüm Kültürü")
    return {
        "title": "Parfüm Dünyasında 2026 Sonbaharı: Yeni Kokular, Yükselen Trendler ve Değişen Parfüm Kültürü",
        "slug": "parfum-dunyasinda-2026-sonbahari",
        "excerpt": "2026 sonbaharında yükselen amber, fındık, dumanlı vanilya akorları ve yeni nesil mevsime geçiş parfümleri rehberi.",
        "coverImageUrl": "/blog_backgrounds/parfum-dunyasinda-2026-sonbahari.webp",
        "viewCount": 570,
        "body": text.strip()
    }

# 5. Unisex Parfüm Fobisi
def clean_art5():
    text = read_txt("Unisex Parfüm FobisiKadın KokusuErkek Kokusu Diye Bir Şey Var mı.txt")
    text = re.sub(r"^Piyasa & Trendler\s*", "", text)
    text = re.sub(r"^Unisex Parfüm Fobisi:[^\n]*\n*", "", text)
    text = re.sub(r"^Güncelleme:[^\n]*\n*", "", text)
    text = re.sub(r"Bu içerik bilgilendirme amaçlıdır.*$", "", text, flags=re.DOTALL)
    text = re.sub(r"unisex parfümcinsiyetsiz[^\n]*", "", text).strip()

    sections = [
        ("\"Kadın Kokusu / Erkek Kokusu\" Ayrımı Aslında Ne Zaman Başladı?", "## \"Kadın Kokusu / Erkek Kokusu\" Ayrımı Aslında Ne Zaman Başladı?"),
        ("\"Unisex Parfüm Fobisi\" Tam Olarak Nedir?", "## \"Unisex Parfüm Fobisi\" Tam Olarak Nedir?"),
        ("2026'da Pazar Ne Diyor?", "## 2026'da Pazar Ne Diyor?"),
        ("Öne Çıkan Yönelimler", "## Öne Çıkan Yönelimler"),
        ("Denemeye Değer Birkaç Unisex Yaklaşım", "## Denemeye Değer Birkaç Unisex Yaklaşım"),
        ("Cinsiyet Etiketine Takılmadan Parfüm Seçmenin 5 Yolu", "## Cinsiyet Etiketine Takılmadan Parfüm Seçmenin 5 Yolu"),
        ("Sık Sorulan Sorular", "## Sıkça Sorulan Sorular")
    ]
    for old_s, new_s in sections:
        text = text.replace(old_s, new_s)

    # Format table properly
    old_table = "Trend\tKarakteri\tKime uygun\nCilt Miski\tYumuşak, sıcak, az sesli\tDoğal & \"parfüm sürmemiş gibi\" koku isteyenler\nTuzlu Gurme\tVanilya/tonka + baharat, aşırı tatlı değil\tSıra dışı, sıcak bir imza koku arayanlar\nModern Oud\tİncelmiş, az dumanlı, zarif\tYoğun oud sevip \"ağır\" bulanlar\nŞeffaf Narenciye-Odun\tFerah açılış, kuru dip\tGünlük ofis/ ofis dışı kullanım"
    new_table = """| Trend | Karakteri | Kime Uygun? |
| :--- | :--- | :--- |
| **Cilt Miski** | Yumuşak, sıcak, az sesli | Doğal & "parfüm sürmemiş gibi" koku isteyenler |
| **Tuzlu Gurme** | Vanilya/tonka + baharat, aşırı tatlı değil | Sıra dışı, sıcak bir imza koku arayanlar |
| **Modern Oud** | İncelmiş, az dumanlı, zarif | Yoğun oud sevip "ağır" bulanlar |
| **Şeffaf Narenciye-Odun** | Ferah açılış, kuru dip | Günlük ofis ve dış mekan kullanımı |"""
    text = text.replace(old_table, new_table)

    # Format bullet points
    text = text.replace("Sosyal onay kaygısı:", "- **Sosyal onay kaygısı:**")
    text = text.replace("Alışkanlık körlüğü:", "- **Alışkanlık körlüğü:**")
    text = text.replace("Pazarlamanın gücü:", "- **Pazarlamanın gücü:**")
    text = text.replace("Büyüme: Unisex", "- **Büyüme:** Unisex")
    text = text.replace("Nesil etkisi: Z", "- **Nesil etkisi:** Z")
    text = text.replace("Perakendede değişim: Mağaza", "- **Perakendede değişim:** Mağaza")

    # Format FAQ
    text = text.replace("Unisex parfüm gerçekten \"nötr\" bir koku mu üretir?\nHayır.", "### Unisex parfüm gerçekten \"nötr\" bir koku mu üretir?\nHayır.")
    text = text.replace("Aynı unisex parfüm herkeste aynı mı kokar?\nHayır,", "### Aynı unisex parfüm herkeste aynı mı kokar?\nHayır,")
    text = text.replace("Unisex parfümler daha mı pahalı?\nGenellikle", "### Unisex parfümler daha mı pahalı?\nGenellikle")

    return {
        "title": "Unisex Parfüm Fobisi: \"Kadın Kokusu\" ve \"Erkek Kokusu\" Efsanesi Neden Çöküyor?",
        "slug": "unisex-parfum-fobisi",
        "excerpt": "Pazarlama stratejileriyle çizilen cinsiyet sınırları neden eriyor? Koku algısının biyolojik ve kültürel kökleri.",
        "coverImageUrl": "/blog_backgrounds/unisex-parfum-fobisi.webp",
        "viewCount": 385,
        "body": text.strip()
    }

# 6. Parfüm ve Ten Uyumu
def clean_art6():
    text = read_txt("parfüm ve ten uyumu.txt")
    text = strip_first_h1_if_matches(text, "Parfüm ve Ten Uyumu: Ten Tipiniz Parfüm Seçimini Gerçekten Etkiler mi?")
    return {
        "title": "Parfüm ve Ten Uyumu: Ten Tipiniz Parfüm Seçimini Gerçekten Etkiler mi?",
        "slug": "parfum-ve-ten-uyumu",
        "excerpt": "Yağlı, kuru ve karma ciltlerde koku moleküllerinin davranışı, pH seviyesinin silaja etkisi ve teninize en uygun parfümü bulma rehberi.",
        "coverImageUrl": "/blog_backgrounds/parfum-ve-ten-uyumu.webp",
        "viewCount": 670,
        "body": text.strip()
    }

# 7. 2026 Parfüm Piyasası Derinlemesine İnceleme
def clean_art7():
    text = read_txt("2026 Parfüm Piyasası Derinlemesine İnceleme: \"Ruj Etkisi\"nden \"Parfüm Etkisine\" — Kendi Koku Kartvizitinizi Nasıl Seçersiniz.txt")
    text = re.sub(r"^2026 Parfüm Piyasası Derinlemesine İnceleme:[^\n]*\n*", "", text)
    text = re.sub(r"^Alt Başlık:[^\n]*\n*", "", text)
    text = re.sub(r"Görsel Önerisi:.*$", "", text, flags=re.DOTALL).strip()
    
    text = text.replace("Giriş: Parfüm, Güzellik Sektörünün En Hızlı Büyüyen Kategorisi", "## Giriş: Parfüm, Güzellik Sektörünün En Hızlı Büyüyen Kategorisi")
    text = text.replace("一、2026 Parfüm Sektöründeki Önemli Gelişmeler", "## 1. 2026 Parfüm Sektöründeki Önemli Gelişmeler")
    text = text.replace("二、Dikkat Çeken Yeni Ürünler ve Trendler", "## 2. Dikkat Çeken Yeni Ürünler ve Trendler")
    text = text.replace("三、Pratik Rehber: Parfüm Nasıl Doğru Seçilir ve Kullanılır", "## 3. Pratik Rehber: Parfüm Nasıl Doğru Seçilir ve Kullanılır")
    text = text.replace("四、2026'da \"Parfüm Etkisi\" Ne Anlama Geliyor", "## 4. 2026'da \"Parfüm Etkisi\" Ne Anlama Geliyor")
    text = text.replace("Sonuç\n", "## Sonuç\n")

    # Format subsections
    subs = [
        "1. Orta Doğu sermayesi lüks parfüm sektörüne hızla giriyor",
        "2. Interparfums, Puma parfüm lisansını aldı",
        "3. Hammadde maliyet baskısı parfüm fiyatlarını yükseltiyor",
        "1. Denim Tears x Comme des Garçons: Tears",
        "2. Yeşil kokuların geri dönüşü: Kriz çağının kokusal yanıtı",
        "3. Arap markalarının küreselleşme atılımı",
        "4. \"Dupe\" kültürünün ana akıma taşınması",
        "1. Konsantrasyon seviyelerini anlamak",
        "2. Doğru uygulama noktaları ve yöntem",
        "3. Kullanım miktarı kontrolü",
        "4. Kendinize uygun parfüm nasıl seçilir",
        "5. Saklama yöntemi"
    ]
    for s in subs:
        text = text.replace(f"\n{s}\n", f"\n### {s}\n")

    return {
        "title": "2026 Parfüm Piyasası İncelemesi: \"Ruj Etkisi\"nden \"Parfüm Etkisine\"",
        "slug": "2026-parfum-piyasasi-ruj-etkisi",
        "excerpt": "Ekonomik belirsizlik dönemlerinde lüks tüketimin sembolü haline gelen parfüm trendi ve kişisel koku kartviziti seçme yöntemleri.",
        "coverImageUrl": "/blog_backgrounds/2026-parfum-piyasasi-ruj-etkisi.webp",
        "viewCount": 490,
        "body": text.strip()
    }

# 8. 2026 Sonbaharında Parfüm Dünyası
def clean_art8():
    text = read_txt("2026 Sonbaharında Parfüm Dünyası: Yeni Çıkanlar, Trendler, Piyasa ve Doğru Kullanım Rehberi.txt")
    text = re.sub(r"^2026 Sonbaharında Parfüm Dünyası:[^\n]*\n*", "", text)
    text = re.sub(r"Yayın için birkaç not:.*$", "", text, flags=re.DOTALL).strip()
    
    # Remove scraping leftovers
    junk = [
        "Fragrance drives beauty sales as consumers seek ‘emotional and functional value’ | Retail Dive +2",
        "Küresel parfüm pazarının, 2026 yılında 63,51 milyar dolara ... +2",
        "Expointurkey\nExpointurkey", "Expointurkey",
        "Isolée\nIsolée", "Isolée",
        "Refinery29\nGrazia Magazine", "FASHION Magazine\nNow Smell This",
        "Wikipedia\nScentbird", "Refinery29\nRefinery29", "Refinery29",
        "MSN\nMSN", "MSN", "Who What Wear", "aol", "Mordor Intelligence"
    ]
    for j in junk:
        text = text.replace(j, "")

    text = text.replace("Piyasa Nabzı: Parfüm Güzellik Sektörünün Yıldızı", "## Piyasa Nabzı: Parfüm Güzellik Sektörünün Yıldızı")
    text = text.replace("Eylül 2026'da Çıkan Yeni Parfümler", "## Eylül 2026'da Çıkan Yeni Parfümler")
    text = text.replace("Sonbahar 2026 Koku Trendleri", "## Sonbahar 2026 Koku Trendleri")
    text = text.replace("Parfüm Kullanım Rehberi: Doğru Seçim, Doğru Uygulama", "## Parfüm Kullanım Rehberi: Doğru Seçim ve Uygulama")
    text = text.replace("Konsantrasyonları Tanıyın", "### Konsantrasyonları Tanıyın")
    text = text.replace("Doğru Uygulama", "### Doğru Uygulama")
    text = text.replace("Kaç Fıs Yeterli?", "### Kaç Fıs Yeterli?")
    text = text.replace("Katmanlama (Layering)", "### Katmanlama (Layering)")
    text = text.replace("Test Etmeden Almayın", "### Test Etmeden Almayın")
    text = text.replace("Saklama Koşulları", "### Saklama Koşulları")
    text = text.replace("Sahte Parfümlere Karşı Dikkat", "### Sahte Parfümlere Karşı Dikkat")
    text = text.replace("Sonuç\n", "## Sonuç\n")

    # Table format
    old_tbl = "Tür\tYaklaşık yağ oranı\tTipik kalıcılık\tKimin için\nEau de Cologne (EDC)\t%2–5\t1–2 saat\tSıcak havalar, spor sonrası\nEau de Toilette (EDT)\t%5–15\t3–5 saat\tGünlük ve ofis kullanımı\nEau de Parfum (EDP)\t%15–20\t5–8 saat\tUzun gün, akşam kullanımı\nParfum / Extrait\t%20–40\t8 saat ve üzeri\tÖzel anlar, soğuk havalar"
    new_tbl = """| Tür | Yaklaşık Yağ Oranı | Tipik Kalıcılık | Kimin İçin? |
| :--- | :--- | :--- | :--- |
| **Eau de Cologne (EDC)** | %2–5 | 1–2 saat | Sıcak havalar, spor sonrası |
| **Eau de Toilette (EDT)** | %5–15 | 3–5 saat | Günlük ve ofis kullanımı |
| **Eau de Parfum (EDP)** | %15–20 | 5–8 saat | Uzun gün, akşam kullanımı |
| **Parfum / Extrait** | %20–40 | 8 saat ve üzeri | Özel anlar, soğuk havalar |"""
    text = text.replace(old_tbl, new_tbl)

    return {
        "title": "2026 Sonbaharında Parfüm Dünyası: Yeni Çıkanlar, Trendler ve Kullanım Rehberi",
        "slug": "2026-sonbahar-parfum-rehberi",
        "excerpt": "Sonbahar mevsiminde parfüm seçiminin incelikleri: Isı değişimi, kıyafet kumaşları ve nota katmanlama tüyoları.",
        "coverImageUrl": "/blog_backgrounds/2026-sonbahar-rehber.webp",
        "viewCount": 315,
        "body": text.strip()
    }

# 9. Drakkar Noir
def clean_art9():
    text = read_txt("Drakkar Noir.txt")
    text = re.sub(r"^Drakkar Noir:[^\n]*\n*", "", text)
    text = re.sub(r"^Kategori: Aromatik Fougère[^\n]*\n*", "", text)
    text = re.sub(r"Drakkar NoirGuy Laroche[^\n]*$", "", text).strip()

    text = text.replace("Kısa Tarihçe\n", "## Kısa Tarihçe\n")
    text = text.replace("Nasıl Kokuyor?\n", "## Nasıl Kokuyor?\n")
    text = text.replace("Kime Uygun?\n", "## Kime Uygun?\n")
    text = text.replace("Kullanım Önerisi\n", "## Kullanım Önerisi\n")
    text = text.replace("Sonuç\n", "## Sonuç\n")

    # Format specs
    old_spec = "Aile\nAromatik Fougère\nCinsiyet\nErkek\nMevsim\nSonbahar / Kış ağırlıklı, çok yönlü\nZaman\nGündüz ve akşam\nSillage\nGüçlü, \"kol mesafesinde\" hissedilir"
    new_spec = """## Temel Özellikler

| Kriter | Değer |
| :--- | :--- |
| **Koku Ailesi** | Aromatik Fougère |
| **Cinsiyet** | Erkek |
| **Mevsim Uyumu** | Sonbahar / Kış ağırlıklı, çok yönlü |
| **Kullanım Zamanı** | Gündüz ve akşam |
| **Yayılım (Sillage)** | Güçlü, kol mesafesinde hissedilir |"""
    text = text.replace(old_spec, new_spec)

    # Format pyramid
    old_pyr = "Koku Piramidi\nÜst Notalar\nNane\nFesleğen\nLavanta\nBergamot\nBiberiye, limon\nKalp Notaları\nKişniş\nPelin otu (absinthe)\nTarçın\nArdıç\nKaranfil, yasemin\nDip Notaları\nKöknar\nSandal ağacı\nMeşe yosunu\nVetiver, deri\nAmber, sedir"
    new_pyr = """## Koku Piramidi

- **Üst Notalar:** Nane, Fesleğen, Lavanta, Bergamot, Biberiye, Limon
- **Kalp Notaları:** Kişniş, Pelin otu (Absinthe), Tarçın, Ardıç, Karanfil, Yasemin
- **Dip Notaları:** Köknar, Sandal ağacı, Meşe yosunu, Vetiver, Deri, Amber, Sedir"""
    text = text.replace(old_pyr, new_pyr)

    # Format pros & cons
    old_procon = "Artıları ve Eksileri\nArtıları\nİkonik, kolayca tanınan koku profili\nGüçlü kalıcılık ve yayılma\nFiyat/performans oranı yüksek\nKış ve soğuk aylarda çok iyi oturuyor\nEksileri\nAçılışı bazılarına \"eski moda\" gelebilir\nSillage'ı yoğun, kalabalık ya da sıcak ortamlarda ağır olabilir\nVintage şişelere göre günümüz formülü daha hafif"
    new_procon = """## Artıları ve Eksileri

| Artıları (+) | Eksileri (-) |
| :--- | :--- |
| İkonik, kolayca tanınan koku profili | Açılışı bazı kullanıcılara nostaljik/eski gelebilir |
| Yüksek kalıcılık ve güçlü yayılım | Çok sıcak havalarda yoğun kaçabilir |
| Fiyat / performans dengesi çok güçlü | Güncel reformülasyon vintage şişelere göre daha hafiftir |
| Sonbahar ve kış aylarında mükemmel performans | |"""
    text = text.replace(old_procon, new_procon)

    return {
        "title": "Drakkar Noir: 1982'den Bugüne Sönmeyen Bir Fougère Efsanesi",
        "slug": "drakkar-noir-1982den-bugune-fougere-efsanesi",
        "excerpt": "80'ler maskülenliğinin simgesi Drakkar Noir'ın lavanta, meşe yosunu ve deri üçgenindeki fujer mirası ve modern dünyadaki yeri.",
        "coverImageUrl": "/blog_backgrounds/drakkar-noir.webp",
        "viewCount": 348,
        "body": text.strip()
    }

# 10. Francis Kurkdjian
def clean_art10():
    body = """Parfüm dünyasında çoğu zaman şişenin üzerindeki moda evinin logosuna odaklanırız: Dior, Jean Paul Gaultier, Burberry, Narciso Rodriguez... Oysa bir kokunun gerçek karakterini, teninizde saatler boyu evrilen akorlarını ve hafızalara kazınan silajını belirleyen asıl güç, perde arkasındaki **"burun"**, yani parfümördür.

Modern parfümeri tarihine baktığımızda, henüz 25 yaşındayken sektörü kökten değiştiren bir kült yaratan ve bugün hem kendi niş eviyle hem de Dior'un Parfüm Kreatif Direktörlüğü koltuğunda sektörü domine eden tek bir isim öne çıkıyor: **Francis Kurkdjian**.

---

## 1. Bir Fenomenin Doğuşu: 25 Yaşında Gelen Kült Devrim

1995 yılında parfüm dünyasına adım atan **Jean Paul Gaultier Le Male**, sadece bir parfüm değil; 90'lar kulüp kültürünü, nane-lavanta tazeliğini vanilya ve tonka fasulyesinin sıcaklığıyla buluşturan fujer (fougère) devrimiydi. Henüz ISIPCA mezunu genç bir yetenek olan Francis Kurkdjian tarafından tasarlanan bu koku, designer erkek parfümerisinin seyrini sonsuza dek değiştirdi.

Kurkdjian’ın dehası, *"kristal berraklığında ferahlık ile teni saran derin sıcaklığı aynı anda hissettirebilmesinde"* yatar. Aşırı bağıran, karmaşık katmanlar yerine; her bir notanın pürüzsüzce parladığı, adeta akustik bir müzik kaydını andıran dengeli formüller kurar.

---

## 2. Designer ve Niş Arasındaki Çizgiyi Silen Eserler

Platformumuzda en çok aranan ve birbirleriyle kıyaslanan Kurkdjian imzalı başyapıtların koku profillerini, silaj ve mevsim uygunluklarını karşılaştırdık:

| Parfüm Adı | Marka / Segment | Baskın Notalar | Koku Ailesi | Kalıcılık / Silaj | En İyi Mevsim / Ortam |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Le Male** | Jean Paul Gaultier (Designer) | Nane, Lavanta, Vanilya, Tarçın | Oryantal Fujer | 8-10 Saat / Yüksek | Sonbahar - Kış / Akşam, Sosyal |
| **Baccarat Rouge 540** | Maison Francis Kurkdjian (Niş) | Safran, Yasemin, Ambergris, Sedir | Amber Çiçeksi | 12+ Saat / Çok Yüksek | 4 Mevsim / İmza Koku, Özel Günler |
| **Grand Soir** | Maison Francis Kurkdjian (Niş) | Benzoin, Amber, Tonka, Vanilya | Sıcak Oryantal | 12+ Saat / Güçlü | Kış / Gece, Şık Davetler |
| **For Her EdT** | Narciso Rodriguez (Designer) | Misk, Afrika Portakal Çiçeği, Osmanthus | Çiçeksi Odunsu Misk | 7-9 Saat / Orta-Yüksek | İlkbahar - Sonbahar / Günlük Lüks |
| **Dioriviera** | Dior Privee (Lüks Designer) | İncir, Gül, Güneş Notaları | Meyvemsi Çiçeksi | 6-8 Saat / Orta | İlkbahar - Yaz / Gündüz, Tatil |

---

## 3. Kurkdjian’ın Moleküler İmzası: Onu Neden Hemen Tanıyoruz?

Bir parfüm platformunda gezinirken *"Benzer Koku Notaları"* filtresini kullandığınızda, Kurkdjian tasarımlarının ortak bazı DNA kodlarına sahip olduğunu fark edersiniz:

- **Şeffaf Misk (Clean Musks):** Çamaşır temizliği hissi veren ama tenle birleştiğinde sıcak bir çekiciliğe bürünen sentetik misk kullanımının ustasıdır. Narciso Rodriguez For Her serisindeki meşhur ten kokusu etkisi bunun en somut örneğidir.
- **Hedione & Ambroxan Dengesi:** Baccarat Rouge 540’ın dünya çapında taklit edilmeye çalışılan "havada asılı kalan tatlı pamuk şekeri ve mineralli sıcak amber" hissi, safran ile modern koku kimyasallarının kusursuz mikro-dozajından doğar.
- **Işıltılı Çiçekler (Luminous Florals):** Ağır, boğucu beyaz çiçekler yerine güneşte kurumuş narenciye çiçekleri ve taze gül yaprakları hissini tercih eder.

---

## 4. Kullanım ve Katmanlama (Layering) Tüyoları

1. **Tene Göre Seçim:** Cildiniz kuruysa ve parfümler hızla uçuyorsa, Kurkdjian'ın reçineli ve amber ağırlıklı kompozisyonları (*Grand Soir* veya *Oud Satin Mood*) doğal yağlarla harika tutunur.
2. **Ofis ve Kapalı Alan Uyarısı:** *Baccarat Rouge 540* ve *Le Male Elixir* gibi yüksek silajlı kokularda 2-3 fıs fazlasıyla yeterlidir. Fazlası koku yorgunluğuna (anosmia) sebep olarak kendi kokunuzu duyamamanıza yol açabilir.
3. **Katmanlama Önerisi:** Temiz narenciye veya ferah incir temalı bir parfümün (*Aqua Universalis* veya *Dioriviera*) üzerine hafifçe sıkılan tek bir fıs *Grand Soir*, kokuya lüks ve kremsi bir derinlik katar.

> **İpucu:** Beğendiğiniz bir designer parfümün ana notalarına en yakın niş alternatifleri bulmak ve kalıcılık skorlarını karşılaştırmak için sitemizin detaylı arama motorunu kullanabilirsiniz."""

    return {
        "title": "Modern Parfümerinin Mimarı Francis Kurkdjian ve İmza Notaları",
        "slug": "modern-parfumerinin-mimari-francis-kurkdjian",
        "excerpt": "Le Male'den Baccarat Rouge 540'a uzanan efsanevi yolculuk: Francis Kurkdjian'ın şeffaf misk, safran ve kristal ferahlık DNA'sı.",
        "coverImageUrl": "/blog_backgrounds/francis-kurkdjian.webp",
        "viewCount": 512,
        "body": body
    }

# 11. Orijinal vs Muadil
def clean_art11():
    body = """Lüks bir designer veya niş parfümün şişesine binlerce lira ödemek yerine, "birebir aynı koku" iddiasıyla onda bir fiyatına satılan muadil (dupe / açık) parfümleri tercih etmek son yılların en popüler trendlerinden biri. Peki bu ürünler nasıl bu kadar ucuza üretilebiliyor? Gerçekten orijinal kokunun yerini tutabilirler mi? Yoksa cildimizi ve sağlığımızı riske mi atıyoruz?

---

## 1. Fiyat Farkının Arkasındaki Temel Dinamikler

Orijinal bir parfümün etiket fiyatı yalnızca içindeki esans sıvısını yansıtmaz:
- **Ar-Ge ve Parfümör Ücretleri:** Dünyaca ünlü burunların aylar hatta yıllar süren formülasyon çalışmaları.
- **Şişe Tasarımı ve Ambalaj:** Özel kesim camlar, manyetik kapaklar ve lüks kutulamalar.
- **Pazarlama ve Reklam:** Global kampanyalar ve marka prestiji.

Muadil üreticileri ise bu devasa maliyetlerin hiçbirine katlanmaz. Gaz kromatografisi (GC-MS) adı verilen kimyasal analiz cihazlarıyla orijinal parfümün koku molekülleri haritalandırılır ve sentetik hammaddelerle benzer bir koku harmanı kopyalanır.

---

## 2. Karşılaştırmalı Analiz: Orijinal vs. Muadil

| Kriter | Orijinal Parfüm | Muadil (Dupe) Parfüm |
| :--- | :--- | :--- |
| **Koku Piramidi** | Üst, kalp ve dip notalar kademeli ve dengeli açılır | Çoğunlukla doğrusal (linear); ilk sıktığınız koku neyse o kalır |
| **Kullanılan Alkol** | Kozmetik sınıfı, saf ve koku nötrleştirilmiş etil alkol | Çoğunlukla ucuz etil alkol, zaman zaman sentetik çözücüler |
| **Kalıcılık** | Doğal reçine, ambergris ve sentetik sabitleyici dengesi | Yüksek oranda sentetik fiksatifler (bazen yapay yağlılık hissi) |
| **IFRA Uyumluluğu** | Uluslararası koku birliği standartlarına %100 uyumlu | Merdiven altı üretimlerde alerjen ve yasaklı madde riski |
| **Ten Uyumu** | Cilt kimyasıyla evrilir, yapaylaşmaz | Bazı ciltlerde saatler sonra metalik veya ekşi kokuya dönebilir |

---

## 3. Sağlık ve Güvenlik: Nelere Dikkat Edilmeli?

Parfüm doğrudan solunan ve cilde nüfuz eden bir kimyasaldır. Sağlık Bakanlığı onaylı ve GMP (İyi Üretim Uygulamaları) sertifikasına sahip kurumsal yerli muadil markalar genellikle güvenlik standartlarını karşılarken; faturasız ve denetimsiz açık parfümler ciddi riskler taşır:

- **Alerjik Kontakt Dermatit:** Ciltte kızarıklık, kaşıntı ve egzama benzeri lezyonlar.
- **Fototoksisite:** Güneşle temas eden parfümlü bölgede kalıcı koyu lekelenmeler.
- **Solunum Hassasiyeti:** Astım ve alerjik rinit hastalarında nefes darlığı ve migren tetiklenmesi.

> **Tavsiye:** Muadil parfüm kullanacaksanız doğrudan teninize değil, kıyafetlerinizin görünmeyen iç kısımlarına sıkmayı tercih edin. Teninizde denemek istediğinizde ise sitemizdeki akor ve nota eşleşmelerine göz atarak güvenli alternatifleri listeleyebilirsiniz."""

    return {
        "title": "Orijinal vs. Muadil Parfüm: Fiyat Uçurumu, Kimyasal Gerçekler ve Sağlık Riskleri",
        "slug": "orijinal-vs-muadil-parfum-gercekler-ve-riskler",
        "excerpt": "Açık ve muadil parfümler orijinalin yerini tutabilir mi? Hammadde kalitesi, IFRA regülasyonları ve ten sağlığı hakkında bilmeniz gereken tüm gerçekler.",
        "coverImageUrl": "/blog_backgrounds/orijinal-vs-muadil-parfum.webp",
        "viewCount": 789,
        "body": body
    }

# 12. CoSTUME NATIONAL
def clean_art12():
    body = """Parfüm endüstrisi çoğunlukla güvenli sularda yüzmeyi sever. Satış rakamlarını garantiye alan tatlı vanilyalar, risksiz mavi (blue) parfümler ve birbirinin kopyası narenciye açılışları reyonları doldururken; bazı koku evleri vardır ki onlar kalabalığa karışmayı açıkça reddeder. İtalyan moda ve niş koku vizyoneri **CoSTUME NATIONAL**, işte bu cüretkâr duruşun en net temsilcilerinden biridir.

Ennio Capasa’nın minimalist, rock'n roll ve asimetrik moda estetiği, parfümeriye tam anlamıyla bir başkaldırı olarak aktarılmıştır.

---

## Markanın İkonik Kokuları ve Karakter Analizleri

### 1. Scent Intense: Karanlık Amber ve Çayın Dansı
CoSTUME NATIONAL denince akla gelen ilk başyapıt. Açılışındaki bergamot ve yeşil çay notaları, yerini hızla koyu, reçineli bir amber ve yasemin birlikteliğine bırakır. Hem androjen hem de manyetik bir çekiciliğe sahiptir. 12 saati aşan kalıcılığıyla tam bir imza kokudur.

### 2. Homme: Baharat Zırhı
Açılışındaki ferah bergamot ve greyfurt sizi yanıltmasın; saniyeler içinde devreye giren devasa kakule, karanfil ve tarçın üçlüsü kokuyu bir anda sıcak, baharatlı bir kalkan haline getirir. Dip notalardaki sandal ağacı ve paçuli ise bu baharat patlamasını inanılmaz bir zarafetle dengeler.

### 3. Soul: Mistik Derinlik
Karanlık, derin ve odunsu bir amber kurgusu. Deri ceketlerin ve serin sonbahar akşamlarının vazgeçilmez tamamlayıcısıdır.

---

## Karşılaştırma Özeti

| Model | Baskın Karakter | Mevsim | Kalıcılık |
| :--- | :--- | :--- | :--- |
| **Scent Intense** | Çay, Amber, Yasemin | Sonbahar - Kış | Çok Yüksek (12+ Saat) |
| **Homme** | Kakule, Karanfil, Paçuli | Kış | Yüksek (10+ Saat) |
| **Soul** | Amber, Deri, Odunsu Notalar | Sonbahar - Kış | Çok Yüksek (12+ Saat) |

Kalabalıkların kullandığı parfümlerden sıkıldıysanız ve girdiğiniz ortamda tarzınızla ayrışmak istiyorsanız, CoSTUME NATIONAL DNA'sı mutlaka radarınızda olmalı."""

    return {
        "title": "Trendlerin Ötesinde Bir Aykırılık: CoSTUME NATIONAL ve Kusursuz Dengesizlik Sanatı",
        "slug": "trendlerin-otesinde-bir-aykirilik-costume-national",
        "excerpt": "Scent Intense ve Cyber Garden gibi kültlerle tanınan İtalyan moda evinin minimalist ve asi koku estetiği.",
        "coverImageUrl": "/blog_backgrounds/costume-national.webp",
        "viewCount": 274,
        "body": body
    }

# 13. Orta Doğu (Arap) Parfümleri
def clean_art13():
    body = """Son yıllarda küresel parfüm dünyasında belirgin bir eksen kayması yaşanıyor. Fransız ve İtalyan koku evlerinin taze, ferah ve güvenli formüllerine alışmış parfümseverler; daha cüretkâr, yoğun silajlı (farkedilirlik) ve karakterli kokuların arayışında rotayı Orta Doğu’ya çevirdi. Özellikle "Arap klonları" (dupe parfümler) ve Orta Doğu niş/tasarımcı markaları; erişilebilir fiyatları, canavarca performansları (beast-mode) ve zengin piramitleriyle hem topluluk forumlarında hem de sosyal medyada en çok tartışılan kategorilerden biri haline geldi.

Peki, Orta Doğu parfümlerini bu kadar çekici kılan ne? Gerçekten sadece batılı popüler kokuların birer “kopyası” mı, yoksa yüzyıllık bir koku mirasının modern bir dışavurumu mu?

---

## 1. Doğu Koku Geleneği: Notaların Dansı

Batı parfümerisi ağırlıklı olarak bergamot, narenciye ve taze çiçeklerin hafifliğiyle açılan bir piramidi tercih ederken; Orta Doğu parfümerisi gücünü sıcak, reçineli ve mistik notalardan alır:

- **Öd (Oud / Agar Ağacı):** Arap koku kültürünün omurgası. Enfekte olmuş agarwood ağacından elde edilen bu koyu, reçineli ve odunsu nota; dumansı, hayvansal ya da vanilya ile yumuşatılarak kremsi profillerde sunulur.
- **Taif Gülü:** Klasik gül notalarından farklı olarak daha ballı, baharatlı ve derin bir karaktere sahiptir; genellikle safran ve öd ile eşleştirilir.
- **Kehribar (Amber), Misk ve Buhur (Bakhoor):** Kokunun tene saatlerce, bazen günlerce tutunmasını sağlayan yoğun ve sıcak baz notalardır.

---

## 2. "Arap Klonları" Neden Bu Kadar Popüler?

Piyasadaki niş parfümlerin (Roja, Creed, BDK, Kilian vb.) astronomik fiyatlara ulaşması, kullanıcıları alternatif arayışlara itti. Tam bu noktada Birleşik Arap Emirlikleri ve bölge merkezli üreticiler devreye girdi.

**Lattafa, Armaf, Afnan, Rasasi, Al Haramain** gibi markalar; yalnızca batılı popüler DNA'ları uygun fiyatla yakalamakla kalmadı, çoğu zaman orijinal kokudan daha güçlü kalıcılık ve yayılım sunarak büyük bir pazar payı elde etti.

> **Formülasyon Farkı:** Orta Doğu regülasyonları ve üretim tercihleri, genellikle yağ konsantrasyonu yüksek (Extrait veya Eau de Parfum) parfümler üretmeye odaklanır. Bu da modern batı parfümlerinde sıkça şikayet edilen reformülasyon ve kalıcılık düşüşlerine karşı güçlü bir alternatif oluşturur.

---

## 3. Doğru Kullanım: Silajı Yönetmek ve "Maceration" (Dinlendirme)

Orta Doğu parfümleri yüksek konsantrasyonları ve zengin moleküler yapıları nedeniyle özel bir kullanım yaklaşımı gerektirir:

### a) Fıs Sayısı ve Ortam Uyumu
Bu kokular genellikle "beast-mode" tabir edilen yüksek farkedilirliğe sahiptir. Kapalı ofis ortamlarında 2-3 fıs fazlasıyla yeterliyken; açık hava veya serin akşam etkinliklerinde 4-5 fısa kadar çıkılabilir. Fazla dozaj koku yorgunluğuna (burun alışması) yol açabilir.

### b) Şişeyi Dinlendirme (Maceration) Sırrı
Yeni açılan bir Arap parfümünün ilk günlerde alkolsü veya beklediğinizden daha keskin kokması normaldir. Birkaç fıs sıktıktan sonra şişeyi güneş görmeyen, serin bir dolapta 3 ila 6 hafta dinlendirmek (oksijenle temas etmesine izin vermek), yağların homojenleşmesini ve notaların yumuşayıp oturmasını sağlar.

### c) Katmanlama (Layering) Sanatı
Geleneksel Arap parfüm kültüründe tek bir kokuyla yetinilmez. Tene önce bir misk veya öd yağı (attar) sürülür, ardından tütsü (bakhoor) dumanı giysilere yedirilir ve en son alkol bazlı parfüm sıkılır. Siz de modern rutininizde vanilyalı veya temiz misk bazlı hafif bir parfümü, ağır bir öd parfümünün üzerine sıkarak kendinize has imza bir koku yaratabilirsiniz.

---

## 4. Editörün Tavsiyesi: Karşılaştırmalı Seçim

| Kategori | Öne Çıkan Karakter | Kimler İçin Uygun? |
| :--- | :--- | :--- |
| **Gourmand & Baharat** | Tarçın, konyak, vanilya, tonka fasulyesi | Sonbahar/kış geceleri ve tatlı, sıcak koku sevenler |
| **Klasik Gül & Öd** | Koyu kırmızı gül, safran, hafif dumansı odunsuluk | Resmi davetler, takım elbise kombinleri ve imza koku arayanlar |
| **Ferah / Meyveli Doğu** | Ananas, elma, huş ağacı, sedir | Dört mevsim günlük kullanım ve yüksek fark edilirlik isteyenler |"""

    return {
        "title": "Çöl Sıcağından Modern Şişelere: Orta Doğu (Arap) Parfümlerinin Yükselişi, Koku DNA'sı ve Katmanlama Sanatı",
        "slug": "orta-dogu-arap-parfumlerinin-yukselisi",
        "excerpt": "Öd, taif gülü ve yoğun silaj: Lattafa, Afnan ve Rasasi gibi Orta Doğu üreticilerinin küresel parfüm pazarını nasıl fethettiğinin anatomisi.",
        "coverImageUrl": "/blog_backgrounds/orta-dogu-arap-parfumleri.webp",
        "viewCount": 634,
        "body": body
    }

def build_all_articles():
    return [
        clean_art1(),
        clean_art2(),
        clean_art3(),
        clean_art4(),
        clean_art5(),
        clean_art6(),
        clean_art7(),
        clean_art8(),
        clean_art9(),
        clean_art10(),
        clean_art11(),
        clean_art12(),
        clean_art13()
    ]

if __name__ == "__main__":
    arts = build_all_articles()
    for out_path in OUTPUT_FILES:
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(arts, f, ensure_ascii=False, indent=2)
        print(f"Successfully generated {len(arts)} clean seed articles in {out_path}")
