import sys
import os
import json
import time
import re
import io
import ssl
import urllib.request
from PIL import Image
from playwright.sync_api import sync_playwright

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
BRANDS_DIR = os.path.join(PROJECT_ROOT, "scrape_files", "brands")
BRAND_IMAGES_DIR = os.path.join(PROJECT_ROOT, "scrape_files", "brand_images")

POPULAR_BRANDS_HTML_SNIPPET = [
    "https://www.fragrantica.com/designers/Acqua-di-Parma.html",
    "https://www.fragrantica.com/designers/Adidas.html",
    "https://www.fragrantica.com/designers/Afnan.html",
    "https://www.fragrantica.com/designers/Ahmed-Al-Maghribi.html",
    "https://www.fragrantica.com/designers/Ajmal.html",
    "https://www.fragrantica.com/designers/Al-Haramain-Perfumes.html",
    "https://www.fragrantica.com/designers/Amouage.html",
    "https://www.fragrantica.com/designers/Antonio-Banderas.html",
    "https://www.fragrantica.com/designers/Arabiyat.html",
    "https://www.fragrantica.com/designers/Ard-Al-Zaafaran.html",
    "https://www.fragrantica.com/designers/Armaf.html",
    "https://www.fragrantica.com/designers/Atelier-Cologne.html",
    "https://www.fragrantica.com/designers/Azzaro.html",
    "https://www.fragrantica.com/designers/Bath-Body-Works.html",
    "https://www.fragrantica.com/designers/BDK-Parfums.html",
    "https://www.fragrantica.com/designers/Benetton.html",
    "https://www.fragrantica.com/designers/Boadicea-the-Victorious.html",
    "https://www.fragrantica.com/designers/Bond-No-9.html",
    "https://www.fragrantica.com/designers/Burberry.html",
    "https://www.fragrantica.com/designers/Bvlgari.html",
    "https://www.fragrantica.com/designers/By-Kilian.html",
    "https://www.fragrantica.com/designers/Byredo.html",
    "https://www.fragrantica.com/designers/Cacharel.html",
    "https://www.fragrantica.com/designers/Calvin-Klein.html",
    "https://www.fragrantica.com/designers/Carolina-Herrera.html",
    "https://www.fragrantica.com/designers/Cartier.html",
    "https://www.fragrantica.com/designers/Chanel.html",
    "https://www.fragrantica.com/designers/Chloe.html",
    "https://www.fragrantica.com/designers/Clinique.html",
    "https://www.fragrantica.com/designers/Clive-Christian.html",
    "https://www.fragrantica.com/designers/Coach.html",
    "https://www.fragrantica.com/designers/Comme-des-Garcons.html",
    "https://www.fragrantica.com/designers/Creed.html",
    "https://www.fragrantica.com/designers/Davidoff.html",
    "https://www.fragrantica.com/designers/Dior.html",
    "https://www.fragrantica.com/designers/Diptyque.html",
    "https://www.fragrantica.com/designers/Dolce-Gabbana.html",
    "https://www.fragrantica.com/designers/Electimuss.html",
    "https://www.fragrantica.com/designers/Elie-Saab.html",
    "https://www.fragrantica.com/designers/Elizabeth-Arden.html",
    "https://www.fragrantica.com/designers/Emir.html",
    "https://www.fragrantica.com/designers/Escentric-Molecules.html",
    "https://www.fragrantica.com/designers/Essential-Parfums.html",
    "https://www.fragrantica.com/designers/Etat-Libre-d-Orange.html",
    "https://www.fragrantica.com/designers/Ex-Nihilo.html",
    "https://www.fragrantica.com/designers/Ferragamo.html",
    "https://www.fragrantica.com/designers/Fragrance-Du-Bois.html",
    "https://www.fragrantica.com/designers/Fragrance-World.html",
    "https://www.fragrantica.com/designers/Frederic-Malle-Editions-de-Parfums.html",
    "https://www.fragrantica.com/designers/French-Avenue.html",
    "https://www.fragrantica.com/designers/Fueguia-1833.html",
    "https://www.fragrantica.com/designers/Giardini-Di-Toscana.html",
    "https://www.fragrantica.com/designers/Giorgio-Armani.html",
    "https://www.fragrantica.com/designers/Givenchy.html",
    "https://www.fragrantica.com/designers/Gritti.html",
    "https://www.fragrantica.com/designers/Gucci.html",
    "https://www.fragrantica.com/designers/Guerlain.html",
    "https://www.fragrantica.com/designers/Guess.html",
    "https://www.fragrantica.com/designers/Hermes.html",
    "https://www.fragrantica.com/designers/Houbigant.html",
    "https://www.fragrantica.com/designers/Hugo-Boss.html",
    "https://www.fragrantica.com/designers/Initio-Parfums-Prives.html",
    "https://www.fragrantica.com/designers/Issey-Miyake.html",
    "https://www.fragrantica.com/designers/Jaguar.html",
    "https://www.fragrantica.com/designers/Jean-Paul-Gaultier.html",
    "https://www.fragrantica.com/designers/Jimmy-Choo.html",
    "https://www.fragrantica.com/designers/Jo-Malone-London.html",
    "https://www.fragrantica.com/designers/Joop.html",
    "https://www.fragrantica.com/designers/Juliette-Has-A-Gun.html",
    "https://www.fragrantica.com/designers/Kajal.html",
    "https://www.fragrantica.com/designers/Kayali-Fragrances.html",
    "https://www.fragrantica.com/designers/Kenzo.html",
    "https://www.fragrantica.com/designers/Khadlaj-Perfumes.html",
    "https://www.fragrantica.com/designers/L-Artisan-Parfumeur.html",
    "https://www.fragrantica.com/designers/Lalique.html",
    "https://www.fragrantica.com/designers/Lancome.html",
    "https://www.fragrantica.com/designers/Lattafa-Perfumes.html",
    "https://www.fragrantica.com/designers/Le-Labo.html",
    "https://www.fragrantica.com/designers/Liquides-Imaginaires.html",
    "https://www.fragrantica.com/designers/Loewe.html",
    "https://www.fragrantica.com/designers/Lorenzo-Pazzaglia.html",
    "https://www.fragrantica.com/designers/Louis-Vuitton.html",
    "https://www.fragrantica.com/designers/Maison-Alhambra.html",
    "https://www.fragrantica.com/designers/Maison-Crivelli.html",
    "https://www.fragrantica.com/designers/Maison-Francis-Kurkdjian.html",
    "https://www.fragrantica.com/designers/Maison-Martin-Margiela.html",
    "https://www.fragrantica.com/designers/Mancera.html",
    "https://www.fragrantica.com/designers/Marc-Antoine-Barrois.html",
    "https://www.fragrantica.com/designers/Marc-Jacobs.html",
    "https://www.fragrantica.com/designers/Masque-Milano.html",
    "https://www.fragrantica.com/designers/Matiere-Premiere.html",
    "https://www.fragrantica.com/designers/Memo-Paris.html",
    "https://www.fragrantica.com/designers/Memoize-London.html",
    "https://www.fragrantica.com/designers/Michael-Kors.html",
    "https://www.fragrantica.com/designers/Mizensir.html",
    "https://www.fragrantica.com/designers/Montale.html",
    "https://www.fragrantica.com/designers/Montblanc.html",
    "https://www.fragrantica.com/designers/Moschino.html",
    "https://www.fragrantica.com/designers/Mugler.html",
    "https://www.fragrantica.com/designers/Narciso-Rodriguez.html",
    "https://www.fragrantica.com/designers/Nasomatto.html",
    "https://www.fragrantica.com/designers/Natura.html",
    "https://www.fragrantica.com/designers/Nautica.html",
    "https://www.fragrantica.com/designers/Nishane.html",
    "https://www.fragrantica.com/designers/O-Boticario.html",
    "https://www.fragrantica.com/designers/Ormonde-Jayne.html",
    "https://www.fragrantica.com/designers/Orto-Parisi.html",
    "https://www.fragrantica.com/designers/Parfum-d-Empire.html",
    "https://www.fragrantica.com/designers/Parfums-de-Marly.html",
    "https://www.fragrantica.com/designers/PARIS-CORNER.html",
    "https://www.fragrantica.com/designers/Penhaligon-s.html",
    "https://www.fragrantica.com/designers/Perris-Monte-Carlo.html",
    "https://www.fragrantica.com/designers/Police.html",
    "https://www.fragrantica.com/designers/Prada.html",
    "https://www.fragrantica.com/designers/Profumum-Roma.html",
    "https://www.fragrantica.com/designers/Puma.html",
    "https://www.fragrantica.com/designers/Rabanne.html",
    "https://www.fragrantica.com/designers/Ralph-Lauren.html",
    "https://www.fragrantica.com/designers/Rasasi.html",
    "https://www.fragrantica.com/designers/Rayhaan.html",
    "https://www.fragrantica.com/designers/Roja-Dove.html",
    "https://www.fragrantica.com/designers/Serge-Lutens.html",
    "https://www.fragrantica.com/designers/Sospiro-Perfumes.html",
    "https://www.fragrantica.com/designers/Stephane-Humbert-Lucas-777.html",
    "https://www.fragrantica.com/designers/Swiss-Arabian.html",
    "https://www.fragrantica.com/designers/Tauer-Perfumes.html",
    "https://www.fragrantica.com/designers/Ted-Lapidus.html",
    "https://www.fragrantica.com/designers/The-House-of-Oud.html",
    "https://www.fragrantica.com/designers/Thomas-Kosmala.html",
    "https://www.fragrantica.com/designers/Tom-Ford.html",
    "https://www.fragrantica.com/designers/Valentino.html",
    "https://www.fragrantica.com/designers/Versace.html",
    "https://www.fragrantica.com/designers/Victoria-s-Secret.html",
    "https://www.fragrantica.com/designers/Vilhelm-Parfumerie.html",
    "https://www.fragrantica.com/designers/Xerjoff.html",
    "https://www.fragrantica.com/designers/Yves-Saint-Laurent.html",
    "https://www.fragrantica.com/designers/Zara.html",
    "https://www.fragrantica.com/designers/Zoologist-Perfumes.html"
]

def collect_all_designer_urls(lang="tr"):
    urls_en = set(POPULAR_BRANDS_HTML_SNIPPET)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        )
        context.set_default_navigation_timeout(60000)
        context.set_default_timeout(60000)
        page = context.new_page()

        print("Scanning Fragrantica designer directory pages...")
        for i in range(1, 15):
            dir_url = f"https://www.fragrantica.com/designers-{i}/"
            try:
                response = page.goto(dir_url, wait_until="domcontentloaded", timeout=60000)
                if response and response.status == 200:
                    page.wait_for_timeout(1000)
                    found = page.evaluate("""() => {
                        return Array.from(document.querySelectorAll('a[href*="/designers/"]'))
                            .map(a => a.href)
                            .filter(h => h.endsWith('.html') && !h.endsWith('/designers/'));
                    }""")
                    prev_count = len(urls_en)
                    for u in found:
                        urls_en.add(u)
                    print(f"Page {dir_url}: Found {len(found)} links. Total unique: {len(urls_en)}")
                    if len(urls_en) == prev_count and i > 3:
                        break
            except Exception as e:
                print(f"Finished scanning at page {i}: {e}")
                break

        browser.close()

    sorted_urls_en = sorted(list(urls_en))
    if lang == "tr":
        return [u.replace("www.fragrantica.com", "www.fragrantica.tr") for u in sorted_urls_en]
    return sorted_urls_en

def get_popular_designer_urls(lang="tr"):
    if lang == "tr":
        return [u.replace("www.fragrantica.com", "www.fragrantica.tr") for u in POPULAR_BRANDS_HTML_SNIPPET]
    return POPULAR_BRANDS_HTML_SNIPPET[:]

def download_and_convert_logo(logo_url, brand_slug):
    if not logo_url:
        return ""
    
    os.makedirs(BRAND_IMAGES_DIR, exist_ok=True)
    output_webp_path = os.path.join(BRAND_IMAGES_DIR, f"{brand_slug}.webp")

    # Skip downloading if already exists and non-empty
    if os.path.exists(output_webp_path) and os.path.getsize(output_webp_path) > 0:
        return f"scrape_files/brand_images/{brand_slug}.webp"

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        }
        ssl_context = ssl._create_unverified_context()
        req = urllib.request.Request(logo_url, headers=headers)
        with urllib.request.urlopen(req, context=ssl_context, timeout=60) as resp:
            image_bytes = resp.read()

        img = Image.open(io.BytesIO(image_bytes))
        if img.mode in ("RGBA", "LA", "P"):
            background = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "P":
                img = img.convert("RGBA")
            background.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
            img = background
        elif img.mode != "RGB":
            img = img.convert("RGB")

        img.save(output_webp_path, "WEBP", quality=85, optimize=True)
        print(f"  --> Downloaded brand logo: {output_webp_path}")
        return f"scrape_files/brand_images/{brand_slug}.webp"
    except Exception as e:
        print(f"  --> Failed to download brand logo ({logo_url}): {e}")
        return ""

def scrape_designer(designer_url):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        )
        context.set_default_navigation_timeout(60000)
        context.set_default_timeout(60000)
        page = context.new_page()
        print(f"Navigating to {designer_url}...")
        response = page.goto(designer_url, wait_until="domcontentloaded", timeout=60000)
        
        if not response or response.status != 200:
            print(f"Failed to fetch {designer_url}: status {response.status if response else 'No response'}")
            browser.close()
            return None

        page.wait_for_timeout(2500)

        # Scroll down to load lazy content/images
        page.evaluate("window.scrollTo(0, document.body.scrollHeight / 2)")
        page.wait_for_timeout(1000)

        data = page.evaluate("""() => {
            const h1 = document.querySelector('h1')?.innerText.trim() || '';

            // Clean bio extraction
            const bioParagraphs = Array.from(document.querySelectorAll('p'))
                .map(p => p.innerText.trim())
                .filter(t => {
                    if (t.length < 30) return false;
                    if (t.includes('Copyrights') || t.includes('Fragrantica in your language') || t.includes('Tam Fragrantica')) return false;
                    if (t.includes('Ülkeler•Ana Şirketler') || t.includes('All years')) return false;
                    return t.includes('koku veri tabanımızda') || t.includes('fragrance base') || t.includes('parfüm') || t.includes('perfume');
                });

            // Extract brand metadata (Supports EN & TR labels)
            const bodyText = document.body.innerText;
            const extractMeta = (labels) => {
                const lines = bodyText.split('\\n');
                for (let line of lines) {
                    for (let label of labels) {
                        if (line.includes(label)) {
                            const parts = line.split(label);
                            if (parts.length > 1) return parts[1].trim();
                        }
                    }
                }
                return '';
            };

            const country = extractMeta(['Ülke:', 'Country:']);
            const mainActivity = extractMeta(['Ana faaliyet:', 'Main activity:']);
            const parentCompany = extractMeta(['Ana şirket:', 'Parent company:']);

            // Website link
            const webLink = Array.from(document.querySelectorAll('a'))
                .find(a => {
                    const txt = a.innerText.trim().toLowerCase();
                    return txt === 'link' || txt === 'bağlantı' || txt.includes('official website') || txt.includes('resmi web');
                });
            const brandWebsite = webLink ? webLink.href : '';

            // Logo URL
            const logoImg = document.querySelector('img[src*="/dizajneri/"]')?.src || '';

            // Perfume links: scoped strictly to #list-view container to avoid fetching sidebars/recommendations
            const listView = document.querySelector('#list-view') || document.querySelector('.divide-y.divide-zinc-200');
            const container = listView || document;
            const perfumeLinks = Array.from(container.querySelectorAll('a[href*="/perfume/"], a[href*="/perfumes/"]'));
            const perfumes = [];
            const seen = new Set();

            for (const a of perfumeLinks) {
                const url = a.href;
                if (!url.includes('/perfume/') && !url.includes('/perfumes/')) continue;
                if (seen.has(url)) continue;
                seen.add(url);

                const textLines = a.innerText.split('\\n').map(s => s.trim()).filter(Boolean);
                let gender = 'unisex';
                if (a.classList.contains('tw-listview-item-female') || a.className.includes('female')) {
                    gender = 'female';
                } else if (a.classList.contains('tw-listview-item-male') || a.className.includes('male')) {
                    gender = 'male';
                }

                // Inner text lines: [0: title, 1: brand, 2: year, 3: gender, 4: votes]
                const title = textLines[0] || '';
                const brand = textLines[1] || '';
                const year = textLines[2] || '';
                const votes = textLines[4] || (textLines[3] && !isNaN(textLines[3]) ? textLines[3] : '');
                const img = a.querySelector('img')?.src || a.querySelector('source')?.srcset?.split(' ')[0] || '';

                perfumes.push({
                    title: title,
                    brand: brand,
                    year: year,
                    gender: gender,
                    ratingVotesCount: votes,
                    url: url,
                    image: img
                });
            }

            return {
                title: h1,
                country: country,
                mainActivity: mainActivity,
                brandWebsite: brandWebsite,
                parentCompany: parentCompany,
                logoUrl: logoImg,
                bio: bioParagraphs,
                totalPerfumes: perfumes.length,
                perfumes: perfumes
            };
        }""")

        browser.close()
        if data and data.get("logoUrl"):
            brand_slug = designer_url.split('/')[-1].replace('.html', '').lower().replace('-', '_')
            local_logo = download_and_convert_logo(data["logoUrl"], brand_slug)
            data["localLogoPath"] = local_logo
        return data

def batch_scrape_brands(urls=None, delay=1):
    if not urls:
        urls = get_popular_designer_urls(lang="tr")
    
    os.makedirs(BRANDS_DIR, exist_ok=True)
    print(f"Starting batch scrape for {len(urls)} brand URLs into {BRANDS_DIR}...")

    success_count = 0
    skip_count = 0
    failed_brands = []

    for idx, url in enumerate(urls, 1):
        lang_suffix = "tr" if ".tr/" in url else "en"
        brand_slug = url.split('/')[-1].replace('.html', '').lower().replace('-', '_')
        out_filename = os.path.join(BRANDS_DIR, f"{brand_slug}_fragrantica_{lang_suffix}.json")

        if os.path.exists(out_filename):
            print(f"[{idx}/{len(urls)}] Skipping (already exists): {out_filename}")
            skip_count += 1
            continue

        print(f"[{idx}/{len(urls)}] Scraping {url}...")
        try:
            result = scrape_designer(url)
            if result:
                with open(out_filename, "w", encoding="utf-8") as out_f:
                    json.dump(result, out_f, ensure_ascii=False, indent=2)
                print(f"  --> Saved: {result['title']} ({result['totalPerfumes']} perfumes) -> {out_filename}")
                success_count += 1
            else:
                print(f"  --> Failed to extract data for {url}")
                failed_brands.append({"url": url, "error": "Extract returns None/Empty"})
        except Exception as e:
            print(f"  --> Error for {url}: {e}")
            failed_brands.append({"url": url, "error": str(e)})

        time.sleep(delay)

    print(f"\nCompleted! Total: {len(urls)}, Saved: {success_count}, Skipped: {skip_count}, Failed: {len(failed_brands)}")

    if failed_brands:
        print("\n" + "=" * 60)
        print(f"BAŞARISIZ OLAN MARKALAR ({len(failed_brands)} marka):")
        print("=" * 60)
        for item in failed_brands:
            print(f"  - {item['url']} | Hata: {item['error']}")
        print("=" * 60 + "\n")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        if arg.startswith("http://") or arg.startswith("https://"):
            url = arg
            result = scrape_designer(url)
            if result:
                os.makedirs(BRANDS_DIR, exist_ok=True)
                lang_suffix = "tr" if ".tr/" in url else "en"
                brand_slug = url.split('/')[-1].replace('.html', '').lower().replace('-', '_')
                out_filename = os.path.join(BRANDS_DIR, f"{brand_slug}_fragrantica_{lang_suffix}.json")
                with open(out_filename, "w", encoding="utf-8") as f:
                    json.dump(result, f, ensure_ascii=False, indent=2)
                print(f"Successfully saved data to {out_filename}")
        elif arg == "generate-urls":
            urls = collect_all_designer_urls(lang="tr")
            print(f"Found {len(urls)} total designer URLs.")
        else:
            batch_scrape_brands()
    else:
        # Default action: Batch scrape all popular brands
        batch_scrape_brands()
