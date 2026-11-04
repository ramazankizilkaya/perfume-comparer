# Aura Compare (Parfümetre) — AI Servisleri & API Kullanım Rehberi

Bu doküman, projede kullanılan tüm Yapay Zekâ (AI) modellerini ve entegrasyonlarını **Çalışma Zamanı (Uygulama İçi)** ve **Çevrimdışı (Scriptler)** olmak üzere iki ana grupta toplar.

---

## 1. Hızlı Özet Tabloları

### A. UYGULAMA İÇİ AI KULLANIMLARI (Kullanıcı Sitedeyken Çalışanlar)

| Modül / Özellik | İlgili Dosya / Servis | Amaç | Birincil Sağlayıcı (Model) | Yedek Sağlayıcı (Fallback) | Maliyet / Kota Tipi |
| :--- | :--- | :--- | :--- | :--- | :--- |
Uygulama içindeki bütün AI istekleri **merkezi router'dan** (`Business/Ai/CentralAiRouter.cs`, `IAiClient`) geçer. Sağlayıcı sırası her özellik için aynıdır: **Gemini → Groq → Mistral** (ücretsiz), hepsi yetişmezse **DeepSeek** (ücretli). Router da cevap veremezse özelliğin kendi yerel yedeği devreye girer.

| Modül / Özellik | İlgili Dosya / Servis | Amaç | Router çağrısı | Router cevap veremezse | Maliyet / Kota Tipi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Akıllı Arama Planlayıcı** | `AiSearchPlanner.cs` | Kullanıcı doğal dil aramasını (örn: "hafif kışlık kadın kokusu") veritabanı filtrelerine çevirir. | `GenerateJsonAsync` | Yerel kelime tarayıcısı | MemoryCache önbellekli |
| **Parfüm Danışmanı** | `PerfumeAdvisorService.cs` | "Bana Parfüm Öner": Kullanıcı tercihlerinden kişisel parfümör tavsiye mektubu üretir. | `GenerateJsonAsync` | Kural tabanlı tavsiye | Kullanıcı başı günde 1 kota |
| **Karşılaştırma Analizi** | `CompareAiService.cs` | Karşılaştırılan iki parfüm için koku profili ve kullanım önerisi yazar. | `GenerateTextAsync` | Analiz gösterilmez | DB önbellekli (`comparison_comments`) |
| **Topluluk Yorum Özeti** | `AiSummaryJob.cs` / `AiSummaryClient.cs` | Yeterli yoruma sahip parfümler için arka planda ortak yorum özeti çıkarır. | `GenerateJsonAsync` | Özet bir sonraki turda denenir | Arka plan kuyruğu (30 dk aralık) |
| **Şişe Fotoğrafı Onayı** | `CatalogController.cs` | Kullanıcının yüklediği görselin gerçek parfüm şişesi olup olmadığını denetler. | `GenerateJsonAsync` + görsel (yalnızca Gemini) | Fotoğraf "onay bekliyor" olarak saklanır | Görsel Moderasyonu |

**Kota ve hata yönetimi:** Anahtar ya da model hatası (401/402/403, 404 ya da Gemini'nin 400 "API key expired") Error logu yazar ve sağlayıcıyı 10 dk atlar. Kota hatası (429) sağlayıcıyı `Retry-After` süresi kadar, bilgi yoksa 60 sn atlar. Zaman aşımı ve 5xx 30 sn atlar. Bozuk JSON sıradaki sağlayıcıya geçer. `<Sağlayıcı>:RequestsPerMinute` verilirse dakikalık sınır dolunca sağlayıcı 429 beklemeden atlanır. Anlık durum: `GET /api/admin/ai-status`.

---

### B. SCRİPT AI KULLANIMLARI (Geliştirici Terminalden Çalıştırdığında)

| Script / Araç | Dosya | Amaç | Birincil Sağlayıcı (Model) | Yedek Sağlayıcı (Fallback Zinciri) | Maliyet / Çalışma Şekli |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Açıklama Yeniden Yazma** | `scripts/rephrase_descriptions.js` | 24.500+ ham parfüm açıklamasını zenginleştirip Türkçeleştirir ve validasyondan geçirir. | **DeepSeek** (`deepseek-chat`) | Mistral -> Gemini -> Groq -> OpenAI | Ücretli (DeepSeek) / Paralel Worker (Default: 5) |
| **Parfüm Zenginleştirme** | `scripts/enrich_perfumes.py` | Parfüm detaylarına SEO makalesi, SSS (FAQ) ve edebi tanıtım ekler. | **Google Gemini** (`gemini-3.5-flash`) | Groq (`llama-3.3-70b-versatile`) -> OpenAI | Ücretsiz Kademe / Hibrit mod (`--hybrid`) |
| **Marka Hikayesi (Bio)** | `scripts/scrape_brands.py` | Fragrantica'dan çekilen ham marka verisinden Türkçe edebi marka hikayesi üretir. | **Google Gemini** (`gemini-3.6-flash`) | Ham Fragrantica bio'su | Ücretsiz / Marka başına 1 çağrı |

---

## 2. Detaylı Kullanım ve Fallback Akışları

### GRUP 1: UYGULAMA İÇİ (Canlı Sistem)

1. **Akıllı Arama Planlayıcı (`AiSearchPlanner.cs`)**
   - **Tetiklenme:** Kullanıcı sitedeki header arama kutusuna 2 kelimeden uzun serbest arama terimi yazdığında.
   - **Sağlayıcı:** Merkezi router (Gemini → Groq → Mistral → DeepSeek).
   - **Yedek / Fallback:** Router cevap veremezse sistem hata vermez; yerel kelime tarayıcısına düşer.
   - **Önbellek:** Yapılan aramalar `IMemoryCache` üzerinde saklanır, aynı sorgu tekrar modele gitmez.

2. **Yapay Zekâ Parfüm Danışmanı (`PerfumeAdvisorService.cs`)**
   - **Tetiklenme:** Kullanıcı "Bana Parfüm Öner" modalından form gönderdiğinde.
   - **Sağlayıcı:** Merkezi router (Gemini → Groq → Mistral → DeepSeek).
   - **Kısıtlama:** Kullanıcılar günde 1 kez öneri alabilir (`user_perfume_recommendations`).
   - **Yedek / Fallback:** Router cevap veremezse veritabanındaki filtrelenmiş aday parfümlerden en yüksek puanlı olan kural tabanlı bir tavsiye şablonuyla sunulur.

3. **Karşılaştırma Analizi (`CompareAiService.cs`)**
   - **Tetiklenme:** Kullanıcı iki parfümü karşılaştırıp "Yapay Zeka Analizi" sekmesini açtığında.
   - **Sağlayıcı:** Merkezi router, düz metin modu (Gemini → Groq → Mistral → DeepSeek).
   - **Yedek / Fallback:** Router cevap veremezse analiz gösterilmez ve veritabanına bir şey yazılmaz.
   - **Kalıcılık:** Üretilen analiz veritabanına (`comparison_comments` tablosuna `is_ai_summary = true`) yazılır. Gelecekteki ziyaretlerde tekrar AI çağrısı yapılmaz.

4. **Yorum Özeti Kuyruğu (`AiSummaryJob.cs` & `AiSummaryClient.cs`)**
   - **Tetiklenme:** Bir parfüm `Ai:MinComments` kadar kullanıcı yorumu aldığında arka plan servisi tetiklenir.
   - **Sağlayıcı:** Merkezi router (Gemini → Groq → Mistral → DeepSeek). Anthropic Claude artık kullanılmaz.
   - **Yedek / Fallback:** Router cevap veremezse özet bir sonraki turda yeniden denenir.

---

### GRUP 2: SCRİPTLER (Terminal Araçları)

1. **Parfüm Açıklamaları AI Rephrase (`rephrase_descriptions.js`)**
   - **Çalıştırma:** `node scripts/rephrase_descriptions.js --concurrency 5`
   - **İşleyiş:** 2 aşamalı pipeline (1. Aşama: Yazım, 2. Aşama: Validasyon).
   - **Öncelik ve Fallback:**
     1. `DeepSeek (deepseek-chat)`: Ücretli bakiye tanımlı, yüksek hız ve eşzamanlılık için birincildir.
     2. `Mistral (mistral-small-latest)`: DeepSeek kotası veya geçici ağ hatasında 1. yedek.
     3. `Google Gemini (gemini-3.5-flash)`: 2. yedek.
     4. `Groq (llama-3.3-70b-versatile)`: 3. yedek.
     5. `OpenAI (gpt-4o-mini)`: Son güvence fallback.

2. **Parfüm SEO ve Tanıtım Zenginleştirici (`enrich_perfumes.py`)**
   - **Çalıştırma:** `python3 scripts/enrich_perfumes.py <marka> --delay 4.0`
   - **İşleyiş:** Parfüm için SEO odaklı makale, alt başlıklar ve SSS listesi oluşturur.
   - **Sağlayıcı:** Birincil `Google Gemini`. `--hybrid` parametresi verilirse `Groq` ve `OpenAI` modellerini yedek olarak dener.

3. **Marka Bilgisi ve Hikayesi (`scrape_brands.py`)**
   - **Çalıştırma:** `python3 scripts/scrape_brands.py`
   - **İşleyiş:** Markanın Fragrantica'daki ham metnini baş editör diliyle Türkçe biyografiye çevirir.
   - **Sağlayıcı:** `Google Gemini (gemini-3.6-flash)`. Anahtar yoksa ham metni doğrudan kaydeder.
