# Aura Compare (Parfümetre) — AI Servisleri & API Kullanım Rehberi

Bu doküman, projede kullanılan tüm Yapay Zekâ (AI) modellerini ve entegrasyonlarını **Çalışma Zamanı (Uygulama İçi)** ve **Çevrimdışı (Scriptler)** olmak üzere iki ana grupta toplar.

---

## 1. Hızlı Özet Tabloları

### A. UYGULAMA İÇİ AI KULLANIMLARI (Kullanıcı Sitedeyken Çalışanlar)

| Modül / Özellik | İlgili Dosya / Servis | Amaç | Birincil Sağlayıcı (Model) | Yedek Sağlayıcı (Fallback) | Maliyet / Kota Tipi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Akıllı Arama Planlayıcı** | `AiSearchPlanner.cs` | Kullanıcı doğal dil aramasını (örn: "hafif kışlık kadın kokusu") veritabanı filtrelerine çevirir. | **Google Gemini** (`gemini-3.5-flash`) | Klasik SQL Arama | Ücretsiz / MemoryCache önbellekli |
| **Parfüm Danışmanı** | `PerfumeAdvisorService.cs` | "Bana Parfüm Öner": Kullanıcı tercihlerinden kişisel parfümör tavsiye mektubu üretir. | **Google Gemini** (`gemini-3.5-flash`) | Kural tabanlı tavsiye | Ücretsiz / Kullanıcı başı günde 1 kota |
| **Karşılaştırma Analizi** | `CompareAiService.cs` | Karşılaştırılan iki parfüm için koku profili, silaj/kalıcılık kıyaslaması ve kazanan üretir. | **OpenAI** (`gpt-4o-mini`) | Google Gemini (`gemini-3.5-flash`) | DB önbellekli (`comparison_comments`) |
| **Topluluk Yorum Özeti** | `AiSummaryJob.cs` / `GeminiSummaryClient.cs` | 10+ kullanıcı yorumuna sahip parfümler için arka planda ortak yorum özeti çıkarır. | **Anthropic Claude** (`claude-opus-5`) | Google Gemini (`gemini-3.5-flash`) | Arka plan kuyruğu (30 dk aralık) |
| **Şişe Fotoğrafı Onayı** | `CatalogController.cs` | Kullanıcının yüklediği görselin gerçek parfüm şişesi olup olmadığını denetler. | **Google Gemini Vision** (`gemini-3.5-flash`) | Admin manuel onayı | Görsel Moderasyonu |

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
   - **Ana Model:** `Gemini 3.5 Flash`.
   - **Yedek / Fallback:** Gemini yanıt vermezse veya kota aşılırsa sistem hata vermez; klasik veritabanı `LIKE / Full-Text` aramasına düşer.
   - **Önbellek:** Yapılan aramalar `IMemoryCache` üzerinde saklanır, aynı sorgu tekrar modele gitmez.

2. **Yapay Zekâ Parfüm Danışmanı (`PerfumeAdvisorService.cs`)**
   - **Tetiklenme:** Kullanıcı "Bana Parfüm Öner" modalından form gönderdiğinde.
   - **Ana Model:** `Gemini 3.5 Flash`.
   - **Kısıtlama:** Kullanıcılar günde 1 kez öneri alabilir (`user_perfume_recommendations`).
   - **Yedek / Fallback:** Gemini çağrısı başarısız olursa veritabanındaki filtrelenmiş aday parfümlerden en yüksek puanlı olan kural tabanlı bir tavsiye şablonuyla sunulur.

3. **Karşılaştırma Analizi (`CompareAiService.cs`)**
   - **Tetiklenme:** Kullanıcı iki parfümü karşılaştırıp "Yapay Zeka Analizi" sekmesini açtığında.
   - **Ana Model:** `OpenAI gpt-4o-mini`.
   - **Yedek / Fallback:** OpenAI anahtarı yoksa veya hata verirse otomatik olarak `Gemini 3.5 Flash`'a geçer.
   - **Kalıcılık:** Üretilen analiz veritabanına (`comparison_comments` tablosuna `is_ai_summary = true`) yazılır. Gelecekteki ziyaretlerde tekrar AI çağrısı yapılmaz.

4. **Yorum Özeti Kuyruğu (`AiSummaryJob.cs` & `GeminiSummaryClient.cs`)**
   - **Tetiklenme:** Bir parfüm 10 veya daha fazla kullanıcı yorumu aldığında arka plan servisi tetiklenir.
   - **Ana Model:** `Anthropic Claude (claude-opus-5)` (eğer `Ai:ApiKey` tanımlıysa).
   - **Yedek / Fallback:** Claude anahtarı yoksa veya istek başarısız olursa `Gemini 3.5 Flash` kullanılır.

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
