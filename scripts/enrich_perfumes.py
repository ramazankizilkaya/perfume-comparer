#!/usr/bin/env python3
"""
scripts/enrich_perfumes.py

Çekilmiş parfüm verilerini (koku piramidi, topluluk oyları ve kullanıcı yorumları)
büyük dil modeli (Gemini / OpenAI) ile zenginleştirerek her parfüm için:
1. 'article': 300-450 kelimelik SEO uyumlu derinlemesine ürün inceleme makalesi
2. 'faq': Google "People Also Ask" ve FAQPage Schema uyumlu 5 adet SSS nesnesi üretir
ve ilgili JSON dosyasına yazar.

Kullanım:
    python3 scripts/enrich_perfumes.py afnan            # Sadece 'afnan' markasındaki eksik parfümleri zenginleştirir
    python3 scripts/enrich_perfumes.py afnan 5          # İlk 5 parfümü zenginleştirir (test için)
    python3 scripts/enrich_perfumes.py afnan --force    # Mevcut makale/faq olsa bile üzerine yazar
    python3 scripts/enrich_perfumes.py --all            # Tüm markalardaki eksikleri sırayla işler
"""

import os
import sys
import json
import time
import urllib.request
import ssl
import argparse
from pathlib import Path

# Ortak ayar modülü
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import app_settings

GEMINI_API_KEY = app_settings.gemini_api_key()
GEMINI_MODEL = app_settings.setting("Gemini:Model", default="gemini-3.5-flash-lite")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

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

Yalnızca aşağıdaki JSON formatında saf çıktı ver (markdown kod bloğu backtick olmadan):
{{
  "article": "...",
  "faq": [
    {{ "question": "...", "answer": "..." }}
  ]
}}"""

def call_gemini(prompt: str, model: str | None = None, retries: int = 3) -> dict | None:
    if not GEMINI_API_KEY:
        return None
    selected_model = model or GEMINI_MODEL
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{selected_model}:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.3
        }
    }
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )

    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=90, context=ctx) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                text = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
                if text.startswith("```json"):
                    text = text[7:]
                if text.startswith("```"):
                    text = text[3:]
                if text.endswith("```"):
                    text = text[:-3]
                return json.loads(text.strip())
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="ignore")
            print(f"    [Gemini Hatası ({selected_model}) - Deneme {attempt}/{retries}]: HTTP {e.code}")
            if attempt < retries:
                time.sleep(attempt * 5)
        except Exception as e:
            print(f"    [Gemini Hatası ({selected_model}) - Deneme {attempt}/{retries}]: {e}")
            if attempt < retries:
                time.sleep(attempt * 3)
    return None

def call_openai(prompt: str, model: str = "gpt-4o-mini") -> dict | None:
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
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {OPENAI_API_KEY}"
            }
        )
        with urllib.request.urlopen(req, timeout=30) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            content = res_data["choices"][0]["message"]["content"].strip()
            return json.loads(content)
    except Exception as e:
        print(f"    [OpenAI Hatası]: {e}")
        return None

def enrich_single_perfume(file_path: str, force: bool = False) -> bool:
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"    [Hata] Dosya okunamadı: {file_path} ({e})")
        return False

    if not force and data.get("article") and data.get("faq"):
        return False  # Zaten zenginleştirilmiş

    prompt = build_enrichment_prompt(data)
    ai_result = None

    if GEMINI_API_KEY:
        ai_result = call_gemini(prompt)
    if not ai_result and OPENAI_API_KEY:
        ai_result = call_openai(prompt)

    if not ai_result or not isinstance(ai_result, dict):
        print(f"    [Atlandı] AI yanıtı alınamadı: {data.get('name')}")
        return False

    article = ai_result.get("article", "").strip()
    faq = ai_result.get("faq", [])

    if not article or not isinstance(faq, list):
        print(f"    [Atlandı] Geçersiz AI formatı: {data.get('name')}")
        return False

    data["article"] = article
    data["faq"] = faq

    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"    ✅ Zenginleştirildi: {data.get('name')} (Makale: {len(article)} krk, SSS: {len(faq)} soru)")
        return True
    except Exception as e:
        print(f"    [Hata] Kaydedilemedi: {file_path} ({e})")
        return False

def main():
    parser = argparse.ArgumentParser(description="Parfüm verilerini AI ile zenginleştirme (Makale + SSS).")
    parser.add_argument("brand", nargs="?", default="", help="Hedef marka slug'ı (örn: afnan, dior)")
    parser.add_argument("limit", nargs="?", type=int, default=None, help="İşlenecek maksimum parfüm sayısı")
    parser.add_argument("--all", action="store_true", help="Tüm markaları işle")
    parser.add_argument("--force", action="store_true", help="Var olan makale ve SSS'lerin üzerine yaz")
    args = parser.parse_args()

    base_dir = Path(__file__).resolve().parent.parent / "scrape_files" / "perfumes"
    if not base_dir.exists():
        print(f"Hata: Parfüm dizini bulunamadı: {base_dir}")
        sys.exit(1)

    if not GEMINI_API_KEY and not OPENAI_API_KEY:
        print("Uyarı: Gemini veya OpenAI API anahtarı bulunamadı. Lütfen appsettings.Local.json veya GEMINI_API_KEY ortam değişkenini kontrol edin.")
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

        print(f"\n==================================================")
        print(f"Marka: {b_dir.name} ({len(perfume_files)} parfüm)")
        print(f"==================================================")

        success_count = 0
        for idx, p_file in enumerate(perfume_files, 1):
            print(f"[{idx}/{len(perfume_files)}] İşleniyor: {p_file.name}")
            ok = enrich_single_perfume(str(p_file), force=args.force)
            if ok:
                success_count += 1
                time.sleep(1.0)  # Rate limit koruması

        print(f"\nTamamlandı: {b_dir.name} -> {success_count} parfüm zenginleştirildi.")

if __name__ == "__main__":
    main()
