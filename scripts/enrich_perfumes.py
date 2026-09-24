#!/usr/bin/env python3
"""
scripts/enrich_perfumes.py

Çekilmiş parfüm verilerini (koku piramidi, topluluk oyları ve kullanıcı yorumları)
büyük dil modeli (Gemini / OpenAI) ile zenginleştirerek her parfüm için:
1. 'article': 300-450 kelimelik SEO uyumlu derinlemesine ürün inceleme makalesi
2. 'faq': Google "People Also Ask" ve FAQPage Schema uyumlu 10 adet detaylı SSS nesnesi
3. 'description' & 'description_enhanced': Fragrantica kopyasını önleyen özgün ve akıcı Türkçe ürün tanıtımı
4. 'concentration' & 'fragranceFamily': Eksik veya belirsiz esans tipi ve koku ailesi sınıflandırması
üretir ve doğrudan ilgili JSON dosyasına yazar.

Kullanım:
    python3 scripts/enrich_perfumes.py afnan            # Sadece 'afnan' markasındaki eksik parfümleri zenginleştirir
    python3 scripts/enrich_perfumes.py afnan 5          # İlk 5 parfümü zenginleştirir (test için)
    python3 scripts/enrich_perfumes.py afnan --force    # Mevcut makale/faq olsa bile üzerine yazar
    python3 scripts/enrich_perfumes.py --all            # Tüm markalardaki eksikleri sırayla işler
    python3 scripts/enrich_perfumes.py --all --parallel # Ollama ve Groq/Bulut servislerini eşzamanlı paralel çalıştırır
    python3 scripts/enrich_perfumes.py afnan --hybrid   # Tek markada Ollama + Groq paralel
"""

import os
import sys
import json
import time
import urllib.request
import ssl
import argparse
import threading
from queue import Queue
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

# Ortak ayar modülü
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import app_settings

GEMINI_API_KEY = app_settings.gemini_api_key()
GEMINI_MODEL = app_settings.setting("Gemini:Model", default="gemini-3.5-flash-lite")
GEMINI_MODELS = [
    "gemini-3.6-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.8-flash",
    "gemini-3-flash-preview",
    GEMINI_MODEL
]
# Tekrarları önle, sırayı koru
GEMINI_MODELS = list(dict.fromkeys([m for m in GEMINI_MODELS if m]))
EXHAUSTED_MODELS = set()
ACTIVE_GEMINI_MODEL_IDX = 0
GROQ_API_KEY = app_settings.groq_api_key()
OPENAI_API_KEY = app_settings.openai_api_key()

def build_enrichment_prompt(perfume_data: dict) -> str:
    name = perfume_data.get("name", "")
    brand = perfume_data.get("brand", "")
    gender = perfume_data.get("targetGender", "")
    family = perfume_data.get("fragranceFamily", "Bilinmiyor")
    conc = perfume_data.get("concentration", "Edp")
    desc = perfume_data.get("description", "")
    
    # Notalar ve akorlar
    accords = ", ".join([a.get("name") for a in perfume_data.get("mainAccords", []) if a.get("name")][:6])
    notes = perfume_data.get("notes", {})
    top = ", ".join(notes.get("top", []))
    mid = ", ".join(notes.get("middle", []))
    base = ", ".join(notes.get("base", []))
    all_n = ", ".join(notes.get("all", []))
    
    # Oylama istatistikleri
    seasons = perfume_data.get("seasons", {})
    longevity = perfume_data.get("longevity", {})
    sillage = perfume_data.get("sillage", {})
    rating = perfume_data.get("rating", {})
    
    # Kullanıcı yorumları
    raw_comments = perfume_data.get("comments", [])
    formatted_comments = []
    for idx, c in enumerate(raw_comments[:12], 1):
        author = c.get("author") or "Kullanıcı"
        sentiment = c.get("sentiment") or ""
        txt = (c.get("text") or "").strip()
        if txt:
            formatted_comments.append(f"Yorum {idx} ({author} - Beğeni Tonu: {sentiment}): \"{txt[:350]}\"")
    
    comments_block = "\n".join(formatted_comments) if formatted_comments else "Gerçek kullanıcı incelemesi bulunamadı (yalnızca istatistiksel oy ve piramit verilerini baz al)."
    
    return f"""Sen lüks koku dünyasında uzmanlaşmış kıdemli bir parfümör, koku editörü ve SEO analistisin.
Aşağıdaki parfümün resmi verilerini, oylama dağılımlarını ve gerçek kullanıcı incelemelerini ve bu parfümle ilgili kendi bilgi dağarcığını da kullanarak sitemiz için zengin bir Türkçe 'Ürün Makalesi' ve 'Sıkça Sorulan Sorular (FAQ)' bloğu hazırla.

[PARFÜM KİMLİĞİ VE TEKNİK VERİLER]
- Parfüm: {name}
- Marka: {brand}
- Cinsiyet: {gender}
- Esans Tipi: {conc}
- Koku Ailesi: {family}
- Ana Akorlar: {accords}
- Koku Piramidi:
  * Üst Notalar: {top or 'Belirtilmemiş'}
  * Orta (Kalp) Notalar: {mid or 'Belirtilmemiş'}
  * Dip Notalar: {base or 'Belirtilmemiş'}
  * Düz Nota Listesi: {all_n or 'Belirtilmemiş'}
- Orijinal Açıklama / Tanıtım: {desc}
- Topluluk Puanı: 5 üzerinden {rating.get('score', '4.0')} ({rating.get('votesCount', '0')} oy)
- Kalıcılık Dağılımı: {json.dumps(longevity, ensure_ascii=False)}
- Yayılım Dağılımı: {json.dumps(sillage, ensure_ascii=False)}
- Mevsim Tercihleri: {json.dumps(seasons, ensure_ascii=False)}

[GERÇEK KULLANICI YORUMLARI VE İNCELEMELERİ]
{comments_block}

[GÖREV VE KURALLAR]
1. 'article' (Detaylı Ürün İnceleme Makalesi):
   - Uzunluk: Yaklaşık 300 - 450 kelime.
   - Format: Markdown alt başlıkları içeren akıcı bir metin:
     `## Koku Profili ve Açılış Notaları`
     `## Kalıcılık, Yayılım ve Performans Değerlendirmesi`
     `## Kimler ve Hangi Ortamlar İçin Uygun?`
     `## Gerçek Kullanıcı Görüşleri ve Genel İzlenim`
   - İçerik: Koku açılışından dip notalara geçiş sürecini, silajını ve kullanıcıların yorumlarında en çok öne çıkan ortak deneyimleri tarafsızca aktar.
   - Anahtar Kelime Uyumu (SEO): "{brand} {name} incelemesi", "{name} notaları", "{name} kalıcılığı" ve "kullanıcı yorumları" gibi arama motoru sorgu öbeklerini alt başlıklarda ve cümle girişlerinde yapaylığa kaçmadan (keyword stuffing yapmadan) akıcı bir üslupla geçir.
   - Dil: Robotik klişelerden uzak, güvenilir, deneyimli bir parfümör diliyle akıcı Türkçe.

2. 'faq' (Sıkça Sorulan Sorular):
   - Arama motorlarında "İlgili Sorular", sesli aramalar ve SSS zengin snippet'ı için aşağıdaki kritik sorulara (veri varsa) düzgün, tam ve doyurucu cümlelerle somut yanıtlar ver:
     1. "{name} hangi markaya aittir?" (Markanın menşei ve kimliğiyle birlikte açıkla)
     2. "{name} hangi yıl piyasaya sürülmüştür ve tasarımcısı (parfümörü) kimdir?" (Mevcut verileri baz alarak belirt)
     3. "{name} parfümünün konsantrasyonu (esans tipi) nedir?" (EDP, EDT vb. farkını ve esans yoğunluğunu açıkla)
     4. "{name} hangi koku ailesine aittir?" (Koku ailesi ve karakterini açıkla)
     5. "{name} parfümünün koku piramidi ve notaları nelerdir?" (Üst, orta, dip notalarını detaylı aktar)
     6. "{name} hangi mevsime ve hava şartlarına uygundur?" (Oylardan ve yorumlardan senaryo vererek açıkla)
     7. "{name} parfümünün kalıcılığı ve yayılımı (silajı) ne kadardır?" (Saat ve yayılım mesafesi ver)
     8. "{name} hangi ortamlarda ve yaş gruplarında tercih edilmelidir?" (Ofis, günlük, gece ayrımı yap)
     9. "{name} hangi parfümlere benzer ve koku karakteri nasıldır?"
     10. "{name} kör alışa (denemeden almaya) uygun bir parfüm müdür?"

3. 'description' (Zenginleştirilmiş Ürün Tanıtım Metni):
   - Orijinal bilgileri (notalar, koku karakteri, çıkış yılı) koruyarak akıcı, özgün, şık bir Türkçe ürün tanıtım paragrafı oluştur.

4. 'concentration' (Esans Tipi):
   - 'Edp', 'Edt', 'Parfum', 'Extrait', 'Edc', 'EauFraiche', 'RollOn' seçeneklerinden en doğrusunu belirle (belirsizse mevcut '{conc}' değerini koru).

5. 'fragranceFamily' (Koku Ailesi):
   - 'Oriental', 'Woody', 'Fresh', 'Floral', 'Citrus', 'Gourmand', 'Aromatic', 'Fougere', 'Leather', 'Other' arasından en uygununu belirle.

Yalnızca aşağıdaki JSON formatında saf çıktı ver (markdown kod bloğu backtick olmadan):
{{
  "article": "...",
  "faq": [
    {{ "question": "...", "answer": "..." }}
  ],
  "description": "...",
  "concentration": "Edp",
  "fragranceFamily": "Gourmand"
}}"""

def call_gemini(prompt: str, model: str | None = None, retries: int = 4) -> dict | None:
    if not GEMINI_API_KEY:
        return None

    if model:
        models_to_try = [model]
    else:
        models_to_try = [m for m in GEMINI_MODELS if m not in EXHAUSTED_MODELS]
        if not models_to_try:
            models_to_try = GEMINI_MODELS
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    for selected_model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{selected_model}:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.3
            }
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )

        quota_exhausted = False
        for attempt in range(1, retries + 1):
            try:
                with urllib.request.urlopen(req, timeout=90, context=ctx) as response:
                    res_data = json.loads(response.read().decode("utf-8"), strict=False)
                    raw_text = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    start_idx = raw_text.find("{")
                    end_idx = raw_text.rfind("}")
                    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                        json_str = raw_text[start_idx:end_idx + 1]
                    else:
                        json_str = raw_text
                    return json.loads(json_str.strip(), strict=False)
            except urllib.error.HTTPError as e:
                err_body = e.read().decode("utf-8", errors="ignore")
                if e.code == 429:
                    if "PerDay" in err_body:
                        print(f"    [Gemini Günlük Kota Doldu]: '{selected_model}' modelinin günlük kotası tükendi.")
                        quota_exhausted = True
                        break
                    
                    wait_time = 10 * attempt
                    try:
                        import re
                        m_wait = re.search(r"retry in ([\d\.]+)s", err_body)
                        if m_wait:
                            wait_time = max(3, int(float(m_wait.group(1))) + 2)
                    except Exception:
                        pass
                    print(f"    [Gemini Hız Limiti ({selected_model})]: {wait_time} saniye bekleniyor (deneme {attempt}/{retries})...")
                    time.sleep(wait_time)
                else:
                    print(f"    [Gemini Hatası ({selected_model}) - Deneme {attempt}/{retries}]: HTTP {e.code}")
                    if attempt < retries:
                        time.sleep(attempt * 2)
            except Exception as e:
                print(f"    [Gemini Hatası ({selected_model}) - Deneme {attempt}/{retries}]: {e}")
                if attempt < retries:
                    time.sleep(attempt * 3)

        if quota_exhausted:
            EXHAUSTED_MODELS.add(selected_model)
            remaining = [m for m in GEMINI_MODELS if m not in EXHAUSTED_MODELS]
            if remaining:
                print(f"    [Model Değiştirildi]: '{selected_model}' devreden çıkarıldı, sıradaki modele geçiliyor -> {remaining[0]}")
            continue

    return None

def call_groq(prompt: str, model: str = "openai/gpt-oss-120b", max_retries: int = 5) -> dict | None:
    if not GROQ_API_KEY:
        return None
    url = "https://api.groq.com/openai/v1/chat/completions"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "Sen parfüm ve SEO uzmanısın. Yalnızca istenen JSON yapısını döndürürsün."},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.3
    }
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    for attempt in range(1, max_retries + 1):
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "User-Agent": "AuraCompare/1.0"
                }
            )
            with urllib.request.urlopen(req, timeout=45, context=ctx) as response:
                res_data = json.loads(response.read().decode("utf-8"), strict=False)
                content = res_data["choices"][0]["message"]["content"].strip()
                s = content.find("{")
                e = content.rfind("}")
                if s != -1 and e != -1 and e > s:
                    content = content[s:e+1]
                return json.loads(content, strict=False)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait_sec = 15 * attempt
                if hasattr(e, "headers"):
                    retry_after = e.headers.get("retry-after")
                    if retry_after:
                        try:
                            ra = int(float(retry_after))
                            if ra > 30:
                                print(f"    [Groq Kotası Doldu]: {ra} saniyelik uzun kota limiti tespit edildi, diğer modele geçiliyor...")
                                return None
                            wait_sec = max(5, ra + 1)
                        except:
                            pass
                    else:
                        reset_tokens = e.headers.get("x-ratelimit-reset-tokens")
                        if reset_tokens:
                            try:
                                if reset_tokens.endswith("ms"):
                                    wait_sec = max(3, int(float(reset_tokens[:-2]) / 1000) + 1)
                                elif reset_tokens.endswith("s"):
                                    wait_sec = max(3, int(float(reset_tokens[:-1])) + 1)
                            except:
                                pass
                if wait_sec > 30:
                    print(f"    [Groq Hız Sınırı]: {wait_sec} saniye bekleme süresi aşıldı, atlanıyor...")
                    return None
                print(f"    [Groq 429 - Hız Sınırı]: {wait_sec} saniye bekleniyor (Deneme {attempt}/{max_retries})...")
                time.sleep(wait_sec)
                continue
            else:
                print(f"    [Groq Hatası]: HTTP {e.code}")
                return None
        except Exception as e:
            print(f"    [Groq Hatası]: {e}")
            return None

    return None


def call_ollama(prompt: str, model: str = "qwen2.5:7b", timeout: int = 180) -> dict | None:
    url = "http://localhost:11434/api/chat"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "Sen parfüm ve SEO uzmanısın. Yalnızca istenen JSON yapısını döndürürsün."},
            {"role": "user", "content": prompt}
        ],
        "format": "json",
        "stream": False,
        "options": {
            "temperature": 0.3
        }
    }
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=timeout) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            content = res_data.get("message", {}).get("content", "").strip()
            s = content.find("{")
            e = content.rfind("}")
            if s != -1 and e != -1 and e > s:
                content = content[s:e+1]
            return json.loads(content, strict=False)
    except Exception as e:
        print(f"    [Ollama Hatası ({model})]: {e}")
        return None


def call_openai(prompt: str, model: str = "gpt-4o-mini", retries: int = 5) -> dict | None:
    if not OPENAI_API_KEY:
        return None
    url = "https://api.openai.com/v1/chat/completions"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "Sen parfüm ve SEO uzmanısın. Yalnızca istenen JSON yapısını döndürürsün."},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.3
    }
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {OPENAI_API_KEY}"
                }
            )
            with urllib.request.urlopen(req, timeout=40, context=ctx) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                content = res_data["choices"][0]["message"]["content"].strip()
                return json.loads(content)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="ignore")
            if "insufficient_quota" in err_body or "credit_balance_exhausted" in err_body:
                print("    [OpenAI Bakiye Hatası]: Hesabınızda bakiye kalmamış. Lütfen platform.openai.com üzerinden bakiye ekleyin.")
                return None
            if e.code == 429:
                wait_time = 2 * attempt
                try:
                    import re
                    m_wait = re.search(r"try again in ([\d\.]+)s", err_body)
                    if m_wait:
                        wait_time = max(1, int(float(m_wait.group(1))) + 1)
                except Exception:
                    pass
                time.sleep(wait_time)
                continue
            else:
                if attempt < retries:
                    time.sleep(attempt * 2)
        except Exception as e:
            if attempt < retries:
                time.sleep(attempt * 2)

    return None

def enrich_single_perfume(
    file_path: str,
    force: bool = False,
    use_ollama: bool = False,
    ollama_model: str = "qwen2.5:7b",
    provider: str | None = None,
    log_prefix: str = ""
) -> bool:
    prefix = f"{log_prefix} " if log_prefix else ""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"    {prefix}[Hata] Dosya okunamadı: {file_path} ({e})")
        return False

    if not force and data.get("article") and data.get("faq") and data.get("description_enhanced"):
        return False  # Zaten zenginleştirilmiş

    prompt = build_enrichment_prompt(data)
    ai_result = None

    if provider == "openai":
        ai_result = call_openai(prompt)
    elif provider == "gemini":
        ai_result = call_gemini(prompt)
    elif provider == "ollama" or (use_ollama and not provider):
        ai_result = call_ollama(prompt, model=ollama_model)
    elif provider == "groq":
        if GROQ_API_KEY:
            ai_result = call_groq(prompt)
        if not ai_result and GEMINI_API_KEY:
            ai_result = call_gemini(prompt)
        if not ai_result and OPENAI_API_KEY:
            ai_result = call_openai(prompt)
    else:
        if GEMINI_API_KEY:
            ai_result = call_gemini(prompt)
        if not ai_result and GROQ_API_KEY:
            ai_result = call_groq(prompt)
        if not ai_result and OPENAI_API_KEY:
            ai_result = call_openai(prompt)
        if not ai_result:
            ai_result = call_ollama(prompt, model=ollama_model)

    if not ai_result or not isinstance(ai_result, dict):
        print(f"    {prefix}[Atlandı] AI yanıtı alınamadı: {data.get('name')}")
        return False

    article = ai_result.get("article", "").strip()
    faq = ai_result.get("faq", [])
    desc_enhanced = (ai_result.get("description") or "").strip()
    concentration = ai_result.get("concentration")
    fragrance_family = ai_result.get("fragranceFamily")

    if not article or not isinstance(faq, list):
        print(f"    {prefix}[Atlandı] Geçersiz AI formatı: {data.get('name')}")
        return False

    data["article"] = article
    data["faq"] = faq
    if desc_enhanced:
        data["description"] = desc_enhanced
        data["description_enhanced"] = desc_enhanced
    if concentration:
        data["concentration"] = concentration
    if fragrance_family:
        data["fragranceFamily"] = fragrance_family

    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"    {prefix}✅ Zenginleştirildi: {data.get('name')} (Makale: {len(article)} krk, SSS: {len(faq)} soru, Açıklama: {'var' if desc_enhanced else 'yok'})")
        return True
    except Exception as e:
        print(f"    {prefix}[Hata] Kaydedilemedi: {file_path} ({e})")
        return False


def run_parallel_hybrid(
    perfume_files: list,
    force: bool = False,
    ollama_model: str = "qwen2.5:7b",
    cloud_delay: float = 2.5,
    ollama_delay: float = 0.5
) -> int:
    """
    Ollama (yerel GPU/CPU) ve Groq (bulut API) modellerini iki eşzamanlı iş parçacığı
    olarak çalıştırır. Her iki servis de kuyruktan bağımsız parfüm çekerek birbirini
    bloklamadan paralel zenginleştirme yapar.
    """
    queue = Queue()
    for pf in perfume_files:
        queue.put(pf)

    total = len(perfume_files)
    success_count = [0]
    processed_count = [0]
    lock = threading.Lock()
    stop_event = threading.Event()

    def ollama_worker():
        while not queue.empty() and not stop_event.is_set():
            try:
                p_file = queue.get_nowait()
            except Exception:
                break
            try:
                with lock:
                    processed_count[0] += 1
                    idx = processed_count[0]
                print(f"[Ollama - {idx}/{total}] İşleniyor: {p_file.name}")
                ok = enrich_single_perfume(
                    str(p_file),
                    force=force,
                    provider="ollama",
                    ollama_model=ollama_model,
                    log_prefix="[Ollama]"
                )
                if ok:
                    with lock:
                        success_count[0] += 1
                    if ollama_delay > 0:
                        time.sleep(ollama_delay)
            except Exception as e:
                print(f"    [Ollama Hatası]: {e}")
            finally:
                queue.task_done()

    def groq_worker():
        while not queue.empty() and not stop_event.is_set():
            try:
                p_file = queue.get_nowait()
            except Exception:
                break
            try:
                with lock:
                    processed_count[0] += 1
                    idx = processed_count[0]
                print(f"[Groq - {idx}/{total}] İşleniyor: {p_file.name}")
                ok = enrich_single_perfume(
                    str(p_file),
                    force=force,
                    provider="groq",
                    log_prefix="[Groq]"
                )
                if ok:
                    with lock:
                        success_count[0] += 1
                    if cloud_delay > 0:
                        time.sleep(cloud_delay)
            except Exception as e:
                print(f"    [Groq Hatası]: {e}")
            finally:
                queue.task_done()

    t_ollama = threading.Thread(target=ollama_worker, name="Worker-Ollama", daemon=True)
    t_groq = threading.Thread(target=groq_worker, name="Worker-Groq", daemon=True)

    t_ollama.start()
    t_groq.start()

    try:
        while t_ollama.is_alive() or t_groq.is_alive():
            t_ollama.join(timeout=0.5)
            t_groq.join(timeout=0.5)
    except KeyboardInterrupt:
        print("\n[Durduruldu] İşlem kullanıcı tarafından durduruldu...")
        stop_event.set()

    return success_count[0]


def run_parallel_provider(
    perfume_files: list,
    provider: str = "openai",
    workers: int = 5,
    force: bool = False,
    delay: float = 0.2
) -> int:
    """
    Belirtilen bulut sağlayıcısı (OpenAI / Gemini / Groq) ile çoklu iş parçacığı
    (worker) kullanarak parfümleri eşzamanlı ve yüksek hızda işler.
    """
    total = len(perfume_files)
    success_count = [0]
    processed_count = [0]
    lock = threading.Lock()

    def process_file(p_file):
        with lock:
            processed_count[0] += 1
            idx = processed_count[0]
        prefix = f"[{provider.upper()}]"
        print(f"{prefix} [{idx}/{total}] İşleniyor: {p_file.name}")
        ok = enrich_single_perfume(
            str(p_file),
            force=force,
            provider=provider,
            log_prefix=prefix
        )
        if ok:
            with lock:
                success_count[0] += 1
        if delay > 0:
            time.sleep(delay)
        return ok

    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = [executor.submit(process_file, pf) for pf in perfume_files]
        for future in as_completed(futures):
            try:
                future.result()
            except Exception as e:
                print(f"    [Worker Hatası]: {e}")

    return success_count[0]


def is_already_enriched(file_path: Path) -> bool:
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return bool(data.get("article") and data.get("faq") and data.get("description_enhanced"))
    except Exception:
        return False


def main():
    parser = argparse.ArgumentParser(description="Parfüm verilerini AI ile zenginleştirme (Makale + SSS).")
    parser.add_argument("brand", nargs="?", default="", help="Hedef marka slug'ı (örn: afnan, dior)")
    parser.add_argument("limit", nargs="?", type=int, default=None, help="İşlenecek maksimum parfüm sayısı")
    parser.add_argument("--all", action="store_true", help="Tüm markaları işle")
    parser.add_argument("--force", action="store_true", help="Var olan makale ve SSS'lerin üzerine yaz")
    parser.add_argument("--ollama", action="store_true", help="Yalnızca yerel Ollama servisini (Qwen 2.5) kullan")
    parser.add_argument("--gemini", action="store_true", help="Yalnızca Gemini bulut modelini kullanır (en hızlı mod)")
    parser.add_argument("--openai", action="store_true", help="Yalnızca OpenAI (GPT-4o-mini) bulut modelini kullanır")
    parser.add_argument("--parallel", "--hybrid", "--ollama-groq", action="store_true", dest="hybrid", help="Ollama ve Groq/Bulut servislerini aynı anda paralel (çift iş parçacığı) çalıştırır")
    parser.add_argument("--model", type=str, default="qwen2.5:7b", help="Ollama model adı (varsayılan: qwen2.5:7b)")
    parser.add_argument("--workers", type=int, default=4, help="Paralel iş parçacığı sayısı (varsayılan: 4)")
    parser.add_argument("--delay", type=float, default=None, help="İstekler arası bekleme süresi saniye cinsinden (varsayılan: OpenAI için 0.5, Gemini için 1.2)")
    args = parser.parse_args()

    if args.delay is not None:
        delay = args.delay
    elif args.openai:
        delay = 0.5
    elif args.gemini:
        delay = 1.2
    elif args.ollama:
        delay = 0.2
    else:
        delay = 3.0

    base_dir = Path(__file__).resolve().parent.parent / "scrape_files" / "perfumes"
    if not base_dir.exists():
        print(f"Hata: Parfüm dizini bulunamadı: {base_dir}")
        sys.exit(1)

    if not args.ollama and not args.hybrid and not GEMINI_API_KEY and not OPENAI_API_KEY and not GROQ_API_KEY:
        print("Uyarı: Gemini, OpenAI veya Groq API anahtarı bulunamadı. Yerel çalıştırmak için --ollama parametresini kullanabilirsiniz.")
        sys.exit(1)

    if args.brand:
        brand_dirs = [base_dir / args.brand.lower().replace("-", "_")]
    elif args.all:
        brand_dirs = sorted([d for d in base_dir.iterdir() if d.is_dir()])
    else:
        print("Lütfen bir marka adı belirtin (örn: python3 scripts/enrich_perfumes.py afnan) veya --all parametresi kullanın.")
        sys.exit(0)

    for b_dir in brand_dirs:
        if not b_dir.exists():
            print(f"Marka dizini bulunamadı: {b_dir.name}")
            continue

        perfume_files = sorted(b_dir.glob("*.json"))
        if args.limit:
            perfume_files = perfume_files[:args.limit]

        # Daha önceden tamamlanmış olanları filtrele (force değilse)
        if not args.force:
            pending_files = [p for p in perfume_files if not is_already_enriched(p)]
            if not pending_files:
                print(f"Marka: {b_dir.name} ({len(perfume_files)} parfüm) -> Tümü zaten zenginleştirilmiş, atlanıyor.")
                continue
        else:
            pending_files = perfume_files

        print(f"\n==================================================")
        print(f"Marka: {b_dir.name} (Toplam: {len(perfume_files)}, İşlenecek: {len(pending_files)})")
        if args.openai:
            print(f"Mod: OpenAI Bulut (GPT-4o-mini, {args.workers}x Paralel)")
        elif args.gemini:
            print(f"Mod: Yalnızca Gemini Bulut (Ücretli / Hızlı Plan)")
        elif args.hybrid:
            print(f"Mod: Paralel Hibrit (1x Ollama [{args.model}] + 1x Groq/Bulut Eşzamanlı)")
        elif args.ollama:
            print(f"Mod: Yerel Ollama ({args.model})")
        else:
            print(f"Mod: Bulut API (Gemini / Groq / OpenAI)")
        print(f"==================================================")

        if args.openai:
            provider_choice = "openai"
        elif args.gemini:
            provider_choice = "gemini"
        else:
            provider_choice = None

        if args.hybrid:
            success_count = run_parallel_hybrid(
                pending_files,
                force=args.force,
                ollama_model=args.model,
                cloud_delay=delay,
                ollama_delay=0.5
            )
        elif provider_choice and args.workers > 1:
            success_count = run_parallel_provider(
                pending_files,
                provider=provider_choice,
                workers=args.workers,
                force=args.force,
                delay=delay
            )
        else:
            success_count = 0
            for idx, p_file in enumerate(pending_files, 1):
                print(f"[{idx}/{len(pending_files)}] İşleniyor: {p_file.name}")
                ok = enrich_single_perfume(
                    str(p_file),
                    force=args.force,
                    use_ollama=args.ollama,
                    ollama_model=args.model,
                    provider=provider_choice
                )
                if ok:
                    success_count += 1
                    if delay > 0:
                        time.sleep(delay)

        print(f"\nTamamlandı: {b_dir.name} -> {success_count} parfüm zenginleştirildi.")


if __name__ == "__main__":
    main()
