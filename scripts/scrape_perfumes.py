"""
Fragrantica TR üzerindeki belirli bir markanın (örn: Afnan, Dior) parfümlerini ve detay verilerini (notalar, oylar, görseller vb.) çeker.
Çekilen her parfümü markanın kendi klasörüne (scrape_files/perfumes/<brand>/) tekil JSON dosyası olarak kaydeder ve işlem sonunda bir sonuç raporu (report.txt) üretir.

Kullanım:
    python scripts/scrape_perfumes.py <brand_name> [max_perfumes]
Örnek:
    python scripts/scrape_perfumes.py afnan
    python scripts/scrape_perfumes.py dior 10
"""

import sys
import os
import json
import time
import re
from playwright.sync_api import sync_playwright

def parse_perfume_page(page, perfume_url):
    print(f"Navigating to {perfume_url}...")
    response = page.goto(perfume_url, wait_until="domcontentloaded", timeout=20000)
    if not response or response.status != 200:
        print(f"Failed to fetch {perfume_url}: status {response.status if response else 'No response'}")
        return None

    page.wait_for_timeout(2500)

    # Scroll down step-by-step to trigger lazy loading of accords, votes, pyramid, reminds section
    for i in range(1, 12):
        page.evaluate(f"window.scrollTo(0, {i} * document.body.scrollHeight / 12)")
        page.wait_for_timeout(300)

    data = page.evaluate(r"""() => {
        const bodyText = document.body.innerText;

        // 1. Name & Target (For who)
        const h1El = document.querySelector('#toptop h1[itemprop="name"]') || document.querySelector('h1[itemprop="name"]') || document.querySelector('h1');
        let perfumeName = '';
        let targetGender = '';

        if (h1El) {
            const spanEl = h1El.querySelector('span');
            if (spanEl) {
                targetGender = spanEl.innerText.trim();
                const clone = h1El.cloneNode(true);
                const cloneSpan = clone.querySelector('span');
                if (cloneSpan) cloneSpan.remove();
                perfumeName = clone.innerText.trim();
            } else {
                perfumeName = h1El.innerText.trim();
                for (let target of ['kadınlar ve erkekler için', 'kadınlar için', 'erkekler için', 'unisex']) {
                    if (perfumeName.includes(target)) {
                        targetGender = target;
                        perfumeName = perfumeName.replace(target, '').trim();
                        break;
                    }
                }
            }
        }

        // 2. Image
        const imgEl = document.querySelector('img[src*="/perfume/"]') || document.querySelector('img[src*="mdimg/perfume"]') || document.querySelector('img[itemprop="image"]');
        const image = imgEl ? imgEl.src : '';

        // 3. Main Accords (Ana akortlar)
        const accordEls = Array.from(document.querySelectorAll('div.accord-bar, div[class*="accord-bar"]'));
        const mainAccords = accordEls.map(el => {
            const style = el.getAttribute('style') || '';
            const widthMatch = style.match(/width:\s*([\d\.]+%)/);
            return {
                name: el.innerText.trim(),
                width: widthMatch ? widthMatch[1] : ''
            };
        }).filter(a => a.name.length > 0);

        if (mainAccords.length === 0) {
            const accordsBox = Array.from(document.querySelectorAll('div')).find(d => d.innerText && d.innerText.includes('ana akortlar'));
            if (accordsBox) {
                const lines = accordsBox.innerText.split('\n').map(s => s.trim()).filter(Boolean);
                const idx = lines.indexOf('ana akortlar');
                if (idx !== -1) {
                    for (let i = idx + 1; i < Math.min(lines.length, idx + 12); i++) {
                        if (lines[i].includes('Akorlara göre') || lines[i].includes('Satılık')) break;
                        mainAccords.push({ name: lines[i], width: '' });
                    }
                }
            }
        }

        // 4. Rating & Vote Count (Puan & Oy)
        const ratingValue = document.querySelector('[itemprop="ratingValue"]')?.innerText.trim() || '';
        const ratingCount = document.querySelector('[itemprop="ratingCount"]')?.innerText.trim() || '';
        
        let scoreStr = ratingValue;
        let votesStr = ratingCount;

        if (!scoreStr) {
            const ratingMatch = bodyText.match(/Parfüm puanı\s*([\d\.\,]+)\s*üzerinden\s*5\s*ile\s*([\d\.\,]+)\s*oy/i);
            if (ratingMatch) {
                scoreStr = ratingMatch[1];
                votesStr = ratingMatch[2];
            }
        }

        // 5. User Feedback Ratings
        const getVoteValue = (label) => {
            const lines = bodyText.split('\n');
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].trim().toLowerCase() === label.toLowerCase()) {
                    if (lines[i+1] && !isNaN(parseFloat(lines[i+1].replace('k', '')))) {
                        return lines[i+1].trim();
                    }
                }
            }
            return '';
        };

        const ratingBreakdown = {
            love: getVoteValue('bayıldım'),
            like: getVoteValue('beğendim'),
            ok: getVoteValue('normal'),
            dislike: getVoteValue('beğenmedim'),
            hate: getVoteValue('nefret')
        };

        // 6. Season & Time of Day
        const seasonBreakdown = {
            winter: getVoteValue('kış'),
            spring: getVoteValue('ilkbahar'),
            summer: getVoteValue('yaz'),
            autumn: getVoteValue('sonbahar'),
            day: getVoteValue('gündüz'),
            night: getVoteValue('gece')
        };

        // 7. Description
        const descEl = document.querySelector('div[itemprop="description"]') || 
                       Array.from(document.querySelectorAll('div p')).find(p => p.innerText.includes('markasının') || p.innerText.includes('parfümü'));
        const description = descEl ? descEl.innerText.trim() : '';

        // 8. Notes Pyramid (Üst, Orta, Alt)
        const parseNotesSection = (sectionName) => {
            const headers = Array.from(document.querySelectorAll('h4, h3, b, div')).filter(el => el.innerText.trim() === sectionName);
            if (headers.length > 0) {
                const parent = headers[0].parentElement;
                if (parent) {
                    const noteEls = Array.from(parent.querySelectorAll('div, span, a'))
                        .map(e => e.innerText.trim())
                        .filter(t => t.length > 1 && t !== sectionName && !t.includes('\n'));
                    return Array.from(new Set(noteEls)).slice(0, 15);
                }
            }
            return [];
        };

        const extractNotesFromText = (marker) => {
            if (!description) return [];
            const regex = new RegExp(marker + ':\\s*([^;\\.]+)', 'i');
            const match = description.match(regex);
            if (match) {
                return match[1].split(',').map(s => s.replace(' ve ', ',').trim()).filter(Boolean);
            }
            return [];
        };

        const topNotes = parseNotesSection('ÜST NOTALAR').length > 0 ? parseNotesSection('ÜST NOTALAR') : extractNotesFromText('Üst notalar');
        const middleNotes = parseNotesSection('ORTA NOTALAR').length > 0 ? parseNotesSection('ORTA NOTALAR') : extractNotesFromText('orta notalar');
        const baseNotes = parseNotesSection('ALT NOTALAR').length > 0 ? parseNotesSection('ALT NOTALAR') : extractNotesFromText('alt notalar');

        // 9. Longevity (Kalıcılık)
        const longevityBreakdown = {
            veryWeak: getVoteValue('çok zayıf'),
            weak: getVoteValue('zayıf'),
            moderate: getVoteValue('orta'),
            longLasting: getVoteValue('uzun süre kalıcı'),
            eternal: getVoteValue('kalıcı') || getVoteValue('son derece kalıcı')
        };

        // 10. Sillage (Yayılım / Fark Edilebilirlik)
        const sillageBreakdown = {
            intimate: getVoteValue('yakın'),
            moderate: getVoteValue('orta'),
            strong: getVoteValue('güçlü'),
            enormous: getVoteValue('çok güçlü')
        };

        // 11. Gender Voting (Cinsiyet Algısı)
        const genderVoting = {
            female: getVoteValue('kadın'),
            moreFemale: getVoteValue('daha kadınsı'),
            unisex: getVoteValue('unisex'),
            moreMale: getVoteValue('daha erkeksi'),
            male: getVoteValue('erkek')
        };

        // 12. Price Value (Fiyat Değer Değerlendirmesi)
        const priceVoting = {
            wayOverpriced: getVoteValue('çok aşırı pahalı'),
            overpriced: getVoteValue('pahalı'),
            fair: getVoteValue('normal'),
            goodValue: getVoteValue('uygun fiyat'),
            greatValue: getVoteValue('mükemmel fiyat')
        };

        // 13. Reminds me of (Bu parfüm bana şunu hatırlatıyor)
        const remindsMeOf = [];
        const bodyLines = bodyText.split('\n').map(l => l.trim()).filter(Boolean);
        const idxReminds = bodyLines.indexOf('Bu parfüm bana şunu hatırlatıyor');
        const idxAlsoLike = bodyLines.indexOf('Bunu beğenenler bunları da beğeniyor');

        if (idxReminds !== -1) {
            const endIdx = idxAlsoLike !== -1 ? idxAlsoLike : bodyLines.length;
            const remindLines = bodyLines.slice(idxReminds + 1, endIdx);
            
            // Extract pairs: BRAND \n Perfume Name
            for (let i = 0; i < remindLines.length - 1; i++) {
                if (remindLines[i] === 'Öner' || remindLines[i] === 'Karşılaştır') continue;
                if (remindLines[i].toUpperCase() === remindLines[i] && remindLines[i].length >= 2 && !remindLines[i].match(/^\d+$/)) {
                    const brand = remindLines[i];
                    const name = remindLines[i+1];
                    if (name && name !== 'Karşılaştır' && name !== 'Öner') {
                        remindsMeOf.push({ brand, name });
                        i++;
                    }
                }
            }
        }

        // 14. People who like this also like (Bunu beğenenler bunları da beğeniyor)
        const peopleAlsoLike = [];
        if (idxAlsoLike !== -1) {
            const endIdx = bodyLines.indexOf('Daha fazla öneri bul') !== -1 ? bodyLines.indexOf('Daha fazla öneri bul') : bodyLines.length;
            const likeLines = bodyLines.slice(idxAlsoLike + 1, endIdx);

            for (let i = 0; i < likeLines.length - 1; i++) {
                if (likeLines[i] === 'Karşılaştır' || likeLines[i] === 'Öner') continue;
                if (likeLines[i].toUpperCase() === likeLines[i] && likeLines[i].length >= 2 && !likeLines[i].match(/^\d+$/)) {
                    const brand = likeLines[i];
                    const name = likeLines[i+1];
                    if (name && name !== 'Karşılaştır' && name !== 'Öner') {
                        peopleAlsoLike.push({ brand, name });
                        i++;
                    }
                }
            }
        }

        return {
            name: perfumeName,
            targetGender: targetGender,
            image: image,
            description: description,
            mainAccords: mainAccords,
            rating: {
                score: scoreStr,
                votesCount: votesStr,
                breakdown: ratingBreakdown
            },
            seasons: seasonBreakdown,
            notes: {
                top: topNotes,
                middle: middleNotes,
                base: baseNotes
            },
            longevity: longevityBreakdown,
            sillage: sillageBreakdown,
            genderVoting: genderVoting,
            priceVoting: priceVoting,
            remindsMeOf: remindsMeOf.slice(0, 15),
            peopleAlsoLike: peopleAlsoLike.slice(0, 15)
        };
    }""")

    return data

def scrape_brand_perfumes(brand_identifier, max_perfumes=None, delay=1.5):
    """
    Given a brand name or slug (e.g. 'giorgio_armani' or 'Xerjoff' or 'dior'),
    loads the brand JSON file, loops through its perfumes, and scrapes each detail page.
    """
    # Standardize brand filename search
    slug = brand_identifier.lower().replace(" ", "_").replace("-", "_")

    # Look for matching file in scrape_files/brands/
    brand_file = f"scrape_files/brands/{slug}_fragrantica_tr.json"
    if not os.path.exists(brand_file):
        brand_file = f"scrape_files/brands/{slug}_fragrantica.json"
    
    if not os.path.exists(brand_file):
        # Search directory for partial match
        brands_dir = "scrape_files/brands"
        matches = [f for f in os.listdir(brands_dir) if slug in f] if os.path.exists(brands_dir) else []
        if matches:
            brand_file = os.path.join(brands_dir, matches[0])
        else:
            print(f"Error: Brand file for '{brand_identifier}' not found in scrape_files/brands/")
            return

    print(f"Loading brand file: {brand_file}")
    with open(brand_file, "r", encoding="utf-8") as f:
        brand_data = json.load(f)

    perfumes_list = brand_data.get("perfumes", [])
    print(f"Found {len(perfumes_list)} perfumes for brand '{brand_data.get('title', brand_identifier)}'")

    if max_perfumes:
        perfumes_list = perfumes_list[:max_perfumes]
        print(f"Limiting to first {max_perfumes} perfumes")

    # Output directory for this brand's perfumes (ensures directory exists)
    out_dir = os.path.join("scrape_files/perfumes", slug)
    os.makedirs(out_dir, exist_ok=True)

    total_count = len(perfumes_list)
    successful_count = 0
    failed_list = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        for idx, item in enumerate(perfumes_list, 1):
            url = item.get("url", "")
            item_name = item.get("name") or url
            # Ensure Turkish URL (.tr)
            tr_url = url.replace("www.fragrantica.com", "www.fragrantica.tr")
            if "/perfume/" in tr_url:
                tr_url = tr_url.replace("/perfume/", "/perfumes/")

            perfume_slug = tr_url.split("/")[-1].replace(".html", "").lower().replace("-", "_")
            out_file = os.path.join(out_dir, f"{perfume_slug}.json")

            # Force re-fetch or use cache
            print(f"\n[{idx}/{len(perfumes_list)}] Scraping perfume: {tr_url}")
            try:
                p_data = parse_perfume_page(page, tr_url)
                if p_data:
                    brand_name = brand_data.get("title", brand_identifier)
                    ordered_data = {
                        "name": p_data.get("name"),
                        "targetGender": p_data.get("targetGender"),
                        "image": p_data.get("image"),
                        "url": tr_url,
                        "brand": brand_name,
                        "description": p_data.get("description"),
                        "mainAccords": p_data.get("mainAccords"),
                        "rating": p_data.get("rating"),
                        "seasons": p_data.get("seasons"),
                        "notes": p_data.get("notes"),
                        "longevity": p_data.get("longevity"),
                        "sillage": p_data.get("sillage"),
                        "genderVoting": p_data.get("genderVoting"),
                        "priceVoting": p_data.get("priceVoting"),
                        "remindsMeOf": p_data.get("remindsMeOf"),
                        "peopleAlsoLike": p_data.get("peopleAlsoLike")
                    }
                    with open(out_file, "w", encoding="utf-8") as out_f:
                        json.dump(ordered_data, out_f, ensure_ascii=False, indent=2)
                    print(f"  --> Saved: {ordered_data['name']} ({ordered_data['rating']['score']}/5 score, {len(ordered_data['mainAccords'])} accords) to {out_file}")
                    successful_count += 1
                else:
                    failed_list.append(item_name)
            except Exception as e:
                print(f"  --> Failed to scrape {tr_url}: {e}")
                failed_list.append(item_name)

            time.sleep(delay)

        browser.close()

    # Create result report file inside brand folder
    report_file = os.path.join(out_dir, "report.txt")
    report_content = (
        f"toplam parfüm: {total_count}\n"
        f"çekilen parfüm: {successful_count}\n"
        f"fail eden parfüm: {len(failed_list)}\n"
        f"fail eden parfüm listesi: {', '.join(failed_list) if failed_list else 'Yok'}\n"
    )
    with open(report_file, "w", encoding="utf-8") as rf:
        rf.write(report_content)

    print(f"\nFinished brand '{brand_identifier}'! Total {total_count} perfumes processed. Report saved to {report_file}")

if __name__ == "__main__":
    brand_arg = sys.argv[1] if len(sys.argv) > 1 else "giorgio_armani"
    limit_arg = int(sys.argv[2]) if len(sys.argv) > 2 else None
    scrape_brand_perfumes(brand_arg, max_perfumes=limit_arg)
